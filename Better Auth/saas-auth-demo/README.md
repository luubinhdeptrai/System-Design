# saas-auth-demo

Mini production-oriented NestJS project demonstrating Better Auth with PostgreSQL and Drizzle ORM.

## Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 |
| Auth | Better Auth 1.x |
| ORM | Drizzle ORM |
| Database | PostgreSQL |
| Language | TypeScript |

## Project Structure

```
src/
├── auth/
│   ├── auth.config.ts          ← Better Auth instance (core, framework-agnostic)
│   ├── auth.controller.ts      ← Catch-all: routes all /api/auth/* to Better Auth
│   ├── auth.service.ts         ← Exposes handler + getSession() to NestJS
│   ├── auth.module.ts
│   └── session.guard.ts        ← NestJS guard — validates session on every protected route
├── users/
│   ├── users.controller.ts     ← GET /users/me, GET /users/me/sessions, DELETE /users/me
│   ├── users.service.ts
│   └── users.module.ts
├── posts/
│   ├── posts.controller.ts     ← Public GET, protected POST + DELETE
│   ├── posts.service.ts
│   ├── posts.module.ts
│   └── dto/create-post.dto.ts
├── db/
│   ├── schema.ts               ← Drizzle schema (Better Auth tables + application tables)
│   └── index.ts                ← Shared DB pool
├── app.module.ts
└── main.ts
drizzle.config.ts
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and a real BETTER_AUTH_SECRET
```

### 3. Create the database

```sql
CREATE DATABASE saas_auth_demo;
```

### 4. Run migrations

```bash
npm run db:generate    # generates SQL files under ./drizzle/
npm run db:migrate     # applies them to your database
```

### 5. Start the server

```bash
npm run start:dev
```

Server starts at `http://localhost:3000`.

---

## API Reference

### Auth endpoints (owned by Better Auth)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/sign-up/email` | Register with email + password |
| POST | `/api/auth/sign-in/email` | Login with email + password |
| POST | `/api/auth/sign-out` | Logout (deletes session from DB) |
| GET | `/api/auth/get-session` | Returns the current session (used by frontends) |
| POST | `/api/auth/magic-link/send` | Send a magic link to an email |
| GET | `/api/auth/magic-link/verify?token=...` | Verify a magic link |

### Application endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Required | Current user profile + session info |
| GET | `/users/me/sessions` | Required | All active sessions for the current user |
| DELETE | `/users/me` | Required | Delete current user account |
| GET | `/posts` | Public | List all posts |
| GET | `/posts/:id` | Public | Get a single post |
| POST | `/posts` | Required | Create a post (author = current user) |
| DELETE | `/posts/:id` | Required | Delete a post (must be author) |

---

## Example: Register and use the API

```bash
# Register
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepass123","name":"Alice"}'

# Get current user (sends session cookie)
curl -b cookies.txt http://localhost:3000/users/me

# Create a post
curl -b cookies.txt -X POST http://localhost:3000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello World","content":"My first post"}'

# Sign out
curl -b cookies.txt -X POST http://localhost:3000/api/auth/sign-out
```

---

## How Authentication Works

```
Client                      NestJS                    Better Auth
  │                            │                            │
  │  POST /api/auth/sign-in    │                            │
  │  { email, password }       │                            │
  ├───────────────────────────►│                            │
  │                            │  auth.handler(req, res)   │
  │                            ├───────────────────────────►│
  │                            │                            │  SELECT account (credential)
  │                            │                            │  Compare Argon2 hash
  │                            │                            │  INSERT session
  │◄───────────────────────────┤◄───────────────────────────┤
  │  Set-Cookie: better-auth.session=<token>                │
  │                            │                            │
  │  GET /users/me             │                            │
  │  Cookie: better-auth.session=<token>                    │
  ├───────────────────────────►│                            │
  │                            │  SessionGuard              │
  │                            │  auth.api.getSession()    │
  │                            ├───────────────────────────►│
  │                            │  { user, session }        │  (DB or cookie cache)
  │                            │◄───────────────────────────┤
  │                            │  req.currentUser = user    │
  │                            │  → route handler           │
  │◄───────────────────────────┤                            │
  │  { user: {...}, session: {...} }                        │
```

## Key Design Decisions

**Why cookies instead of JWTs for browser clients?**
- `HttpOnly` cookies are invisible to JavaScript — XSS attacks cannot steal the token
- Sessions can be revoked instantly (delete the row, next request gets 401)
- No token refresh logic needed on the client

**Why is Better Auth mounted as a catch-all, not a NestJS module?**
- Better Auth manages OAuth callbacks, CSRF tokens, cookie headers, and redirect flows internally
- Routing those through NestJS's interceptors would break the flows
- The catch-all hands off the entire `/api/auth/*` namespace without interference

**Why four tables?**
- `user`: one canonical identity per person
- `account`: one row per login method (email+pass, Google, GitHub...) — supports account linking
- `session`: one row per active browser/device — enables per-device revocation
- `verification`: one-time tokens for magic links, email OTP, password reset
