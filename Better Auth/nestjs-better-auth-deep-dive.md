# Better Auth + NestJS — Production-Oriented Deep Dive

> Goal: Build a minimal but realistic SaaS-style backend that genuinely teaches you how Better Auth works under the hood, why each design decision exists, and how the whole system scales.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Request Flow Walkthrough](#2-request-flow-walkthrough)
3. [Database Table Deep Dive](#3-database-table-deep-dive)
4. [Step-by-Step Implementation](#4-step-by-step-implementation)
   - 4.1 Project Setup
   - 4.2 Drizzle Schema
   - 4.3 Better Auth Configuration
   - 4.4 NestJS Auth Module
   - 4.5 Controllers
   - 4.6 Session Guard
   - 4.7 Protected Routes
5. [Security Model](#5-security-model)
6. [Scaling and Advanced Patterns](#6-scaling-and-advanced-patterns)
7. [Common Pitfalls](#7-common-pitfalls)
8. [Interview-Level Summary](#8-interview-level-summary)

---

## 1. High-Level Architecture

### What Better Auth actually is inside NestJS

Better Auth is **not a NestJS module** you wire up through `@Module()`. It is a TypeScript library that:

1. Creates its own HTTP endpoint handler (`auth.handler()`)
2. Manages its own database schema via adapters
3. Exposes an API object (`auth.api.*`) you call from anywhere

Inside NestJS, you host its handler on a catch-all route. Your guards and services then call `auth.api.getSession()` to validate every protected request.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  - Sends credentials or follows OAuth redirect                  │
│  - Receives a session cookie (HttpOnly, Secure, SameSite=Lax)  │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTP
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   NestJS Application                            │
│                                                                 │
│  ┌─────────────────────────────┐  ┌──────────────────────────┐ │
│  │  Auth Route Handler         │  │  Application Routes      │ │
│  │  POST /api/auth/*           │  │  GET  /users/me          │ │
│  │  GET  /api/auth/*           │  │  POST /posts             │ │
│  │                             │  │        ↓                 │ │
│  │  [Better Auth Handler]      │  │  [SessionGuard]          │ │
│  │  auth.handler(req, res)     │  │  auth.api.getSession()   │ │
│  └────────────┬────────────────┘  └──────────┬───────────────┘ │
│               │                              │                  │
│               └──────────┬───────────────────┘                 │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │  Auth Core  │                               │
│                   │  (Better    │                               │
│                   │   Auth)     │                               │
│                   └──────┬──────┘                               │
└──────────────────────────┼─────────────────────────────────────┘
                           │
          ┌────────────────┼──────────────────┐
          │                │                  │
          ▼                ▼                  ▼
   ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐
   │  PostgreSQL  │  │  Redis       │  │  Magic Link /   │
   │  (primary)  │  │  (sessions   │  │  Email Service  │
   │  user       │  │   cache,     │  │  (verification) │
   │  session    │  │   optional)  │  └─────────────────┘
   │  account    │  └──────────────┘
   │  verification│
   └─────────────┘
```

### Why this architecture

| Decision | Reason |
|---|---|
| Better Auth owns `/api/auth/*` entirely | It handles OAuth redirects, callbacks, CSRF, cookie setting — too complex to replicate manually |
| NestJS guards call `auth.api.getSession()` | You do not re-implement session logic; you delegate to the same trusted source |
| Session in DB, cookie as pointer | Revocable, auditable, server-controlled |
| Drizzle ORM for schema | Better Auth generates Drizzle-compatible schema; migrations are type-safe |

---

## 2. Request Flow Walkthrough

### 2.1 Registration

```
Client                      NestJS                    Better Auth Core           PostgreSQL
  │                            │                            │                        │
  │ POST /api/auth/sign-up/    │                            │                        │
  │ email                      │                            │                        │
  │ { email, password, name }  │                            │                        │
  ├───────────────────────────►│                            │                        │
  │                            │ betterAuth.handler(req)   │                        │
  │                            ├───────────────────────────►│                        │
  │                            │                            │ Hash password           │
  │                            │                            │ (bcrypt / Argon2)      │
  │                            │                            ├───────────────────────►│
  │                            │                            │ INSERT INTO user        │
  │                            │                            │ INSERT INTO account     │
  │                            │                            │ (providerId='credential')
  │                            │                            │ INSERT INTO session     │
  │                            │◄───────────────────────────┤                        │
  │                            │ Set-Cookie: better-auth.session=<token>             │
  │◄───────────────────────────┤                            │                        │
  │ 200 OK + user object        │                            │                        │
```

### 2.2 Login (email + password)

```
Client                       Better Auth Core           PostgreSQL
  │                                  │                        │
  │ POST /api/auth/sign-in/email     │                        │
  │ { email, password }              │                        │
  ├─────────────────────────────────►│                        │
  │                                  │ SELECT account WHERE   │
  │                                  │ providerId='credential'│
  │                                  │ AND userId=(user email)│
  │                                  ├───────────────────────►│
  │                                  │◄───────────────────────┤
  │                                  │ Compare hash (bcrypt)  │
  │                                  │ if OK:                 │
  │                                  │ INSERT INTO session    │
  │                                  ├───────────────────────►│
  │◄─────────────────────────────────┤                        │
  │ Set-Cookie: better-auth.session=<opaque token>            │
  │ 200 + { user, session }          │                        │
```

### 2.3 Magic Link Login

```
Client                       Better Auth Core           PostgreSQL        Email Service
  │                                  │                        │                 │
  │ POST /api/auth/magic-link/send   │                        │                 │
  │ { email }                        │                        │                 │
  ├─────────────────────────────────►│                        │                 │
  │                                  │ INSERT INTO            │                 │
  │                                  │ verification           │                 │
  │                                  │ { identifier: email,   │                 │
  │                                  │   value: <token>,      │                 │
  │                                  │   expiresAt: +15min }  │                 │
  │                                  ├───────────────────────►│                 │
  │◄─────────────────────────────────┤                        │                 │
  │ 200 "check your email"           │                        │                 │
  │                                  │ sendMagicLinkEmail()   │                 │
  │                                  ├────────────────────────┼────────────────►│
  │                                  │                        │                 │
  │ [User clicks link]               │                        │                 │
  │ GET /api/auth/magic-link/verify  │                        │                 │
  │ ?token=<token>                   │                        │                 │
  ├─────────────────────────────────►│                        │                 │
  │                                  │ SELECT verification    │                 │
  │                                  │ WHERE value=token      │                 │
  │                                  │ AND expiresAt > NOW()  │                 │
  │                                  ├───────────────────────►│                 │
  │                                  │ DELETE verification row│                 │
  │                                  │ INSERT INTO session    │                 │
  │◄─────────────────────────────────┤                        │                 │
  │ Set-Cookie + redirect            │                        │                 │
```

### 2.4 Authenticated Request (Protected Route)

```
Client                  NestJS SessionGuard          Better Auth Core        PostgreSQL
  │                            │                            │                        │
  │ GET /users/me              │                            │                        │
  │ Cookie: better-auth.session│                            │                        │
  ├───────────────────────────►│                            │                        │
  │                            │ auth.api.getSession        │                        │
  │                            │ ({ headers })              │                        │
  │                            ├───────────────────────────►│                        │
  │                            │                            │ Read cookie token      │
  │                            │                            │ (or check cookie cache)│
  │                            │                            ├───────────────────────►│
  │                            │                            │ SELECT session          │
  │                            │                            │ WHERE token=...        │
  │                            │                            │ AND expiresAt > NOW()  │
  │                            │                            │◄───────────────────────┤
  │                            │◄───────────────────────────┤                        │
  │                            │ { user, session } or null  │                        │
  │                            │                            │                        │
  │                            │ if null → 401 Unauthorized │                        │
  │                            │ if ok   → attach to        │                        │
  │                            │           request context  │                        │
  │                            │           → route handler  │                        │
  │◄───────────────────────────┤                            │                        │
  │ 200 { user data }          │                            │                        │
```

### 2.5 Logout

```
Client                    NestJS / Better Auth         PostgreSQL
  │                               │                        │
  │ POST /api/auth/sign-out       │                        │
  │ Cookie: better-auth.session   │                        │
  ├──────────────────────────────►│                        │
  │                               │ DELETE session         │
  │                               │ WHERE token=...        │
  │                               ├───────────────────────►│
  │◄──────────────────────────────┤                        │
  │ Set-Cookie: better-auth.session=; Max-Age=0            │
  │ 200                           │                        │
```

---

## 3. Database Table Deep Dive

Understanding why each table exists prevents the most common beginner mistakes.

### 3.1 `user`

The canonical identity record. One row per human.

```
user
├── id          (PK)
├── name
├── email       (unique)
├── emailVerified (boolean)
├── image       (optional avatar URL)
├── createdAt
└── updatedAt
```

**Misconception to avoid:** this is NOT where the password is stored. The password lives in `account`.

### 3.2 `account`

Each row represents one **authentication method** attached to a user.

```
account
├── id
├── userId                  (FK → user.id)
├── accountId               (provider's own user id, or userId for credentials)
├── providerId              ('credential', 'google', 'github', etc.)
├── accessToken             (OAuth access token, if applicable)
├── refreshToken            (OAuth refresh token)
├── accessTokenExpiresAt
├── refreshTokenExpiresAt
├── scope                   (OAuth scopes granted)
├── idToken                 (OIDC id token)
├── password                (bcrypt/argon2 hash, for credential provider only)
├── createdAt
└── updatedAt
```

**Why this table exists separately from `user`:**

A user might sign up with email/password, then later link their Google account. That is TWO rows in `account`, ONE row in `user`. Account linking is clean and additive.

```
user (id=abc)
  ├── account (providerId='credential', password='$2b$...')
  └── account (providerId='google', accountId='1234567890')
```

**Misconception to avoid:** Beginners often stuff OAuth tokens and passwords into the user table. This breaks cleanly when multiple providers are involved.

### 3.3 `session`

One row per active login. The cookie holds only the `token`; all session data lives here.

```
session
├── id
├── token       (opaque string, stored in cookie)
├── userId      (FK → user.id)
├── expiresAt
├── ipAddress   (logged at creation)
├── userAgent   (logged at creation)
├── createdAt
└── updatedAt
```

**Why not JWT by default:**

| Cookie-based session | JWT |
|---|---|
| Server can revoke instantly | Revocation requires a blocklist or very short expiry |
| Session data centralized and consistent | JWT payload can go stale until expiry |
| Works without client-side token storage | Client must store token securely |
| DB lookup on every request | No DB lookup needed |
| Scales horizontally with shared DB or Redis | Stateless, no shared state needed |

Better Auth gives you sessions by default because instant revocation matters in real products.

### 3.4 `verification`

Short-lived purpose-specific records for anything that needs a "prove you control this" step.

```
verification
├── id
├── identifier  (email address, or a specific action id)
├── value       (the secret token, hashed or raw depending on strategy)
├── expiresAt
├── createdAt
└── updatedAt
```

Used for:
- Magic link tokens
- Email verification codes
- Password reset tokens

**Lifecycle:** Created → emailed → clicked → verified → **deleted**. They are consumed on use.

---

## 4. Step-by-Step Implementation

### 4.1 Project Setup

```bash
# Create NestJS project
npx @nestjs/cli new saas-auth-demo
cd saas-auth-demo

# Core dependencies
npm install better-auth drizzle-orm drizzle-kit pg @neondatabase/serverless
npm install dotenv

# NestJS config
npm install @nestjs/config

# Dev dependencies
npm install -D @types/pg tsx
```

**Directory structure:**

```
src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.config.ts          ← Better Auth instance (the core)
│   ├── auth.controller.ts      ← Catch-all route that hands off to BA handler
│   ├── auth.service.ts         ← Thin wrapper exposing auth.api for NestJS
│   └── session.guard.ts        ← NestJS guard using auth.api.getSession()
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
├── db/
│   ├── schema.ts               ← Drizzle schema (Better Auth tables)
│   └── index.ts                ← Drizzle client
├── app.module.ts
└── main.ts
drizzle.config.ts
.env
```

**.env**

```env
DATABASE_URL=postgresql://user:password@localhost:5432/saas_auth
BETTER_AUTH_SECRET=your-32-char-minimum-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
```

### 4.2 Database Schema

`src/db/schema.ts` — The minimum schema Better Auth requires plus any application tables.

```typescript
import {
  pgTable,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

// ─── Better Auth core tables ──────────────────────────────────────────────────
// These exact field names and types are required by Better Auth.
// Better Auth's Drizzle adapter reads/writes these directly.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// One row per authentication method per user.
// 'credential' rows hold the hashed password.
// OAuth rows hold access/refresh tokens.
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),         // 'credential' | 'google' | 'github'
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),                        // bcrypt/argon2 hash (credential only)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Active login sessions. The cookie holds only the token value.
export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

// Short-lived purpose tokens: magic links, email verification, password resets.
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),          // email or action key
  value: text("value").notNull(),                    // the secret token
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Application table (example) ────────────────────────────────────────────
// This is YOUR business data, separate from the auth tables.
export const post = pgTable("post", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
```

`src/db/index.ts` — Drizzle client

```typescript
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Use a connection pool for production-grade connection management.
// In multi-instance deployments, all instances point to the same pool.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
```

`drizzle.config.ts` — Migration configuration

```typescript
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Run migrations:

```bash
npx drizzle-kit generate    # create SQL migration files
npx drizzle-kit migrate     # apply to database
```

### 4.3 Better Auth Configuration

`src/auth/auth.config.ts`

This is the **heart** of the integration. Everything else in your app references this.

```typescript
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";

// betterAuth() returns the auth server core.
// It is framework-agnostic — it does NOT depend on NestJS.
// This object is used in two places:
//   1. auth.handler() — receives raw HTTP requests and writes responses
//   2. auth.api.*     — called programmatically from guards and services
export const auth = betterAuth({
  // ── Database ──────────────────────────────────────────────────────────────
  database: drizzleAdapter(db, {
    provider: "pg",
    // Map Better Auth's internal model names to your Drizzle schema tables.
    // If your table names differ from the defaults, map them here.
    schema: {
      user: schema.user,
      account: schema.account,
      session: schema.session,
      verification: schema.verification,
    },
  }),

  // ── Base URL ───────────────────────────────────────────────────────────────
  // Used for generating callback URLs (OAuth), email links (magic links), etc.
  // Must match your actual server's public URL.
  baseURL: process.env.BETTER_AUTH_URL,

  // ── Secret ────────────────────────────────────────────────────────────────
  // Used to sign session cookies and encrypt sensitive data.
  // Must be at minimum 32 characters. Rotate with care (invalidates all sessions).
  secret: process.env.BETTER_AUTH_SECRET,

  // ── Authentication Methods ────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    // Auto sign-in after registration keeps UX smooth.
    // Set to false if you require email verification before first sign-in.
    autoSignIn: true,
    // Minimum 8 characters enforced by Better Auth.
    // You can add custom validation with `password.validate`.
  },

  // ── Session Configuration ─────────────────────────────────────────────────
  session: {
    // Sessions expire after 7 days of inactivity.
    expiresIn: 60 * 60 * 24 * 7,
    // Rolling expiry: every day of use resets the 7-day clock.
    updateAge: 60 * 60 * 24,
    // Cookie cache: reduces DB queries by storing validated session data
    // in a short-lived signed cookie. Sessions are still DB-backed and revocable.
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute in-memory cookie cache
    },
  },

  // ── Plugins ────────────────────────────────────────────────────────────────
  plugins: [
    magicLink({
      // Called by Better Auth when a magic link should be sent.
      // Replace with your real email service (Resend, SES, Nodemailer, etc.)
      sendMagicLink: async ({ email, token, url }) => {
        // In production this calls your email service.
        // Keeping it as console.log for the demo.
        console.log(`[MAGIC LINK] Send to ${email}: ${url}`);
      },
    }),
  ],

  // ── Trusted Origins ────────────────────────────────────────────────────────
  // CSRF protection: only requests from these origins are allowed.
  // Add your frontend domain(s) here in production.
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:5173", // Vite dev server
  ],
});

// Export the inferred types so NestJS services can be type-safe
// when reading session or user data from auth.api.getSession().
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
```

### 4.4 NestJS Auth Module

`src/auth/auth.service.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { auth } from "./auth.config";
import { toNodeHandler } from "better-auth/node";

@Injectable()
export class AuthService {
  // Expose the raw node handler. The controller will call this for all
  // /api/auth/* requests. Better Auth handles routing internally.
  readonly handler = toNodeHandler(auth);

  // Thin wrapper around auth.api.getSession().
  // Used by SessionGuard and any service that needs to know who the caller is.
  async getSession(headers: Headers) {
    return auth.api.getSession({ headers });
  }
}
```

`src/auth/auth.controller.ts`

```typescript
import { All, Controller, Req, Res } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";

// This controller captures every request under /api/auth/* and hands it
// directly to Better Auth. NestJS does not intercept or transform these
// requests. Better Auth owns this path completely.
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // @All("*") catches GET, POST, DELETE, etc. under /api/auth/
  @All("*")
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    // toNodeHandler() adapts Better Auth's Web API handler to Node's
    // IncomingMessage/ServerResponse interface used by Express.
    return this.authService.handler(req, res);
  }
}
```

`src/auth/session.guard.ts`

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";

// Reusable guard. Apply it to any route that requires authentication.
// Usage: @UseGuards(SessionGuard)
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Convert Express headers to the Web API Headers object that
    // Better Auth expects. This is the bridge between Express and BA.
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === "string") {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      }
    }

    // auth.api.getSession() reads the session cookie from headers,
    // validates the token against the session table, and returns
    // { user, session } or null.
    const result = await this.authService.getSession(headers);

    if (!result) {
      throw new UnauthorizedException("No valid session");
    }

    // Attach to the request object so downstream handlers can read it
    // without hitting the database again.
    request.session = result.session;
    request.user = result.user;

    return true;
  }
}
```

`src/auth/auth.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionGuard } from "./session.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  // Export both so other modules (UsersModule, PostsModule, etc.)
  // can inject AuthService and SessionGuard without re-importing the module.
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
```

### 4.5 Application Module and Main Entry

`src/app.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    // Load .env as process.env.* globally across all modules.
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}
```

`src/main.ts`

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Trust proxy headers if running behind nginx, a load balancer, or any
  // reverse proxy. Required for correct IP detection, which Better Auth uses.
  app.set("trust proxy", 1);

  // CORS: allow your frontend origins to send credentials (the session cookie).
  // credentials: true is required for cookies to be sent cross-origin.
  app.enableCors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true, // critical for session cookies
  });

  await app.listen(3000);

  console.log("Server running on http://localhost:3000");
  console.log("Auth endpoints at http://localhost:3000/api/auth/*");
}

bootstrap();
```

### 4.6 Protected Application Routes

`src/users/users.controller.ts`

```typescript
import {
  Controller,
  Get,
  Delete,
  Req,
  HttpCode,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { SessionGuard } from "../auth/session.guard";
import { UsersService } from "./users.service";

// Extend Express Request with our auth data for type safety
declare module "express" {
  interface Request {
    user?: {
      id: string;
      email: string;
      name: string;
      emailVerified: boolean;
      image?: string | null;
      createdAt: Date;
      updatedAt: Date;
    };
    session?: {
      id: string;
      token: string;
      userId: string;
      expiresAt: Date;
      ipAddress?: string | null;
      userAgent?: string | null;
    };
  }
}

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me — returns the currently authenticated user's profile.
  // @UseGuards(SessionGuard) validates the session cookie before the
  // controller method runs. If no valid session exists, a 401 is thrown.
  @Get("me")
  @UseGuards(SessionGuard)
  getProfile(@Req() req: Request) {
    // req.user was attached by SessionGuard — no DB query needed here.
    return {
      id: req.user!.id,
      name: req.user!.name,
      email: req.user!.email,
      emailVerified: req.user!.emailVerified,
      createdAt: req.user!.createdAt,
      sessionId: req.session!.id,
      sessionExpiresAt: req.session!.expiresAt,
    };
  }

  // DELETE /users/me — deletes the account.
  // Protected: requires a valid session.
  @Delete("me")
  @UseGuards(SessionGuard)
  @HttpCode(204)
  async deleteAccount(@Req() req: Request) {
    await this.usersService.deleteUser(req.user!.id);
    // The caller should also sign out (which clears the session cookie).
    // In a real app you would revoke all sessions for this user here.
  }
}
```

`src/users/users.service.ts`

```typescript
import { Injectable } from "@nestjs/common";
import { db } from "../db";
import { user } from "../db/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class UsersService {
  async findById(id: string) {
    const rows = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async deleteUser(id: string) {
    // CASCADE on the FK ensures account, session rows are removed too.
    await db.delete(user).where(eq(user.id, id));
  }
}
```

`src/users/users.module.ts`

```typescript
import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule], // gives access to SessionGuard and AuthService
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

---

## 5. Security Model

### 5.1 Why cookies instead of localStorage

```
localStorage                          HttpOnly Cookie
─────────────────────────────────     ─────────────────────────────────
Accessible by JS                      NOT accessible by JS
Vulnerable to XSS                     XSS cannot steal the token
Developer manages headers             Browser manages automatically
Works well for mobile / native        Designed for browsers
Requires manual refresh logic         Rolling expiry built into server
```

Better Auth sets the cookie with these attributes by default:

- `HttpOnly` — JavaScript cannot read it
- `Secure` — only sent over HTTPS (in production)
- `SameSite=Lax` — protects against CSRF for most cases

### 5.2 Session Expiration Strategy

```
Session lifecycle in Better Auth:

Created ──────────────────────────────────────────────────────► Expired
         │                          │                      7 days
         │                          │
         ▼                          ▼
    First request             Daily update (rolling expiry)
    expiresAt = now + 7d      expiresAt = now + 7d (reset)
         │
         ▼
    Cookie cache (5 min) — serves session data without DB hit
    After 5 min cache expires → DB query → refresh cache
```

**Rationale:** Rolling expiry means active users stay logged in indefinitely, while inactive accounts naturally expire.

### 5.3 Password Storage

Better Auth uses **Argon2id** by default (modern, memory-hard, recommended by OWASP), with bcrypt as a fallback option. The hash is stored in `account.password`. The raw password never touches your database or logs.

### 5.4 CSRF Protection

Better Auth validates the `Origin` header against `trustedOrigins`. In your server configuration, list every frontend domain that should be able to make authenticated requests.

For non-browser clients (mobile apps, server-side calls), pass the secret header:

```
x-better-auth-csrf: skip
```

Or use Bearer tokens via the `bearer` plugin for API-key-style clients.

### 5.5 Secrets Management

| Item | Where to store |
|---|---|
| `BETTER_AUTH_SECRET` | Environment variable, never commit |
| `DATABASE_URL` | Environment variable |
| OAuth `clientSecret` | Environment variable |
| JWT private key | Environment variable or KMS |

Rotate `BETTER_AUTH_SECRET` by setting a new value and redeploying. Existing sessions will be invalidated (all users will need to log in again), which is usually acceptable as a security measure.

### 5.6 Token vs Session Trade-offs (JWT vs Cookies in Depth)

```
Scenario: User's account is compromised. You need to lock them out immediately.

JWT approach:
  1. Attacker has a JWT valid for the next 14 minutes
  2. You can block re-issue, but cannot invalidate the live token
  3. Either accept the 14-minute window or build a blocklist (Redis)
  4. Building the blocklist = you now have server state anyway

Session approach:
  1. Attacker has a session token in a cookie
  2. One DELETE on the session table = locked out on next request
  3. Done. Zero window.

For SaaS applications: sessions win on security.
For stateless APIs (microservices, CDN edges): JWTs win on scalability.
```

---

## 6. Scaling and Advanced Patterns

### 6.1 Horizontal Scaling

Multiple NestJS instances work out of the box because sessions are stored in PostgreSQL, which is shared across all instances.

```
Load Balancer
     │
     ├──► NestJS Instance 1 ──► auth.api.getSession() ──► PostgreSQL
     ├──► NestJS Instance 2 ──► auth.api.getSession() ──┘
     └──► NestJS Instance 3 ──► auth.api.getSession() ──┘
```

Each instance reads the same session table. No sticky sessions or broadcast needed.

### 6.2 Redis for Session Performance

The cookie cache reduces DB reads for the 5-minute window, but to fully offload session lookups under high traffic, you can use Redis as secondary storage:

```typescript
import { betterAuth } from "better-auth";
import { Redis } from "ioredis";
import { redisStorage } from "@better-auth/redis-storage";

const redis = new Redis({ host: "localhost", port: 6379 });

export const auth = betterAuth({
  // ... other config
  secondaryStorage: redisStorage({
    client: redis,
    keyPrefix: "better-auth:",
  }),
  session: {
    // With Redis, each getSession() call reads from Redis (~0.1ms)
    // instead of PostgreSQL (~5-15ms under load)
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
});
```

```
Without Redis:
  getSession() → PostgreSQL (5-15ms) → result

With Redis:
  getSession() → cookie cache (0ms, in-memory, 5 min TTL)
             → Redis (~0.1ms, if cache miss)     
             → PostgreSQL (~10ms, if Redis miss) → result
```

### 6.3 Migrating to JWT for Downstream Services

Real-world scenario: you have a NestJS monolith managing sessions, but you also have a Go microservice that processes background jobs and needs to verify who initiated a request.

You enable the JWT plugin:

```typescript
import { jwt } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    jwt({
      jwt: {
        expirationTime: "15m",        // short-lived: 15 minutes
        definePayload: ({ user }) => ({
          sub: user.id,
          email: user.email,
          name: user.name,
        }),
      },
      jwks: {
        keyPairConfig: { alg: "EdDSA" }, // modern, compact signature
      },
    }),
  ],
});
```

The frontend calls `GET /api/auth/token`, receives a JWT, and sends it as `Authorization: Bearer <jwt>` to the Go service. The Go service verifies it against `GET /api/auth/jwks` (the public key endpoint), with no database access.

```
Browser ──► NestJS (session cookie) ──► mint JWT ──► Go Service (verifies JWKS)
```

This is the recommended hybrid: sessions for the browser, JWTs only for service-to-service calls.

---

## 7. Common Pitfalls

### 7.1 Storing the password in the `user` table

```typescript
// WRONG — breaks account linking
const user = pgTable("user", {
  password: text("password"), // ← do not do this
});

// CORRECT — password lives in account where providerId = 'credential'
const account = pgTable("account", {
  password: text("password"), // ← here
  providerId: text("provider_id"), // 'credential' | 'google' | ...
});
```

### 7.2 Forgetting `credentials: true` in CORS

```typescript
// WRONG — cookies will not be sent cross-origin
app.enableCors({ origin: "http://localhost:5173" });

// CORRECT
app.enableCors({
  origin: "http://localhost:5173",
  credentials: true,  // ← required for cookies
});
```

### 7.3 Not trusting the proxy

```typescript
// WRONG — IP-based rate limiting and cookie flagging breaks behind nginx
// (no fix)

// CORRECT
app.set("trust proxy", 1);
```

### 7.4 Using localStorage for the session token

```typescript
// WRONG — exposes token to XSS attacks
localStorage.setItem("token", sessionToken);
fetch("/api/protected", {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});

// CORRECT — Better Auth sets an HttpOnly cookie automatically
// The browser sends it on every same-origin request automatically
fetch("/api/protected", { credentials: "include" }); // that is all
```

### 7.5 Calling auth handlers from the wrong side

```typescript
// WRONG — auth client methods (authClient.signIn.email) run in the browser
// Calling them on the server creates orphaned sessions and broken cookies
import { authClient } from "./auth-client";
await authClient.signIn.email({ email, password }); // ← server-side, broken

// CORRECT — on the server, use auth.api.*
import { auth } from "./auth.config";
await auth.api.signInEmail({ body: { email, password }, asResponse: true });
```

### 7.6 Misunderstanding cookie cache and session revocation

```typescript
// Setting cookieCache.maxAge too high means revoked sessions stay
// technically "valid" from the cache perspective for that window.
// A user you lock out can still make requests for the cache duration.

// If instant revocation is critical (admin ban, fraud detection):
cookieCache: {
  enabled: false, // or
  maxAge: 30,     // 30 seconds, acceptable window
}
```

### 7.7 Handling the `verification` table manually

The `verification` table is managed entirely by Better Auth (magic links, email OTP, password reset). Do not write to it directly. If you need custom one-time tokens, use the `one-time-token` plugin rather than building on top of `verification`.

---

## 8. Interview-Level Summary

### What is Better Auth?

A TypeScript auth framework that provides:
1. An HTTP handler owning an auth path completely (`/api/auth/*`)
2. A server-side API (`auth.api.*`) for programmatic session operations
3. A database-backed identity model (4 core tables)
4. A plugin system for extending auth without rebuilding infrastructure

### Why put auth in a separate handler instead of NestJS controllers?

Better Auth manages OAuth callbacks, CSRF, cookie setting headers, and redirect flows that are complex and stateful. Delegating the entire `/api/auth/*` namespace to it avoids the impedance mismatch between NestJS's request/response cycle and the raw HTTP responses auth flows need.

### What are the four tables for?

| Table | What it holds |
|---|---|
| `user` | Canonical identity: who the person is |
| `account` | How they authenticate: one row per login method |
| `session` | When they are logged in: one row per active device/browser |
| `verification` | Temporary secrets: magic links, email codes, reset tokens |

### Session vs JWT — when to use which?

```
Session: Browser apps, apps requiring instant revocation, SaaS products
JWT:     Service-to-service auth, CDN edge verification, mobile clients
         where cookies are impractical

Hybrid: Sessions for the browser + JWT minted on demand for microservices
```

### How does the NestJS integration work?

1. `betterAuth()` creates the auth core (framework-agnostic)
2. `AuthController @All('*')` pipes every `/api/auth/*` request to `toNodeHandler(auth)`
3. `SessionGuard` calls `auth.api.getSession({ headers })` before any protected route
4. Guards attach `req.user` and `req.session` for downstream handlers to consume

### How does this scale?

- **Horizontal:** all instances share the same PostgreSQL session table; no sticky sessions needed
- **Vertical:** add Redis as secondaryStorage to eliminate 95%+ of session DB queries
- **Multi-service:** integrate the JWT plugin to bridge session-based auth to stateless service-to-service calls
