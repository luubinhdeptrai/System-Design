# Prisma From Scratch — Practical Guide for NestJS + PostgreSQL

Goal: teach Prisma from first principles so you can design schemas, run migrations, and implement CRUD in a NestJS backend.

Audience: backend engineers using NestJS with PostgreSQL (Docker) who are new to Prisma.

---

PHASE 1 — Concepts & Setup

What is Prisma?
- Prisma is an ORM and query builder with a type-safe generated client.
- You declare your schema in `schema.prisma`, run migrations, and use the generated client in your code.

Why Prisma for NestJS?
- Strong TypeScript support (auto-generated types)
- Lightweight, predictable queries
- Good dev DX: migrations, introspection, and generate

1. Tools & deps (commands to run in your `api/` folder)

```bash
# install prisma tooling and client
npm install prisma @prisma/client --save
# (optional global) npx prisma --version
```

2. Run Prisma init

```bash
# in the api/ folder
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and a `.env` file.

3. PostgreSQL (Docker)

Create `docker-compose.yml` (in `api/` or repo root):

```yaml
version: '3.8'
services:
  db:
    image: postgres:16
    restart: always
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Start DB:

```bash
docker compose up -d
```

4. `.env` example

Create/edit `api/.env`:

```env
DATABASE_URL="postgresql://app:app@localhost:5432/app?schema=public"
```

Note: Prisma version differences
- Prisma v7 introduced moving connection URLs to `prisma.config.ts` in some setups. The examples below show both compatible approaches: modern (`prisma.config.ts`) and classic (`env("DATABASE_URL")`). Use whichever your installed Prisma tooling requires; I'll show the `prisma.config.ts` approach later to satisfy Prisma 7 strictness.

---

PHASE 2 — Schema Design (Real example)

We’ll build a small app with `User` and `Task` models (one-to-many).

Full `prisma/schema.prisma` (no `url` line if using `prisma.config.ts`):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())

  tasks        Task[]
}

model Task {
  id        String   @id @default(cuid())
  title     String
  done      Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

If your Prisma version *supports* `env(...)` in schema, you can instead use:

```prisma
datasource db { provider = "postgresql" url = env("DATABASE_URL") }
```

But for Prisma 7+ follow the `prisma.config.ts` approach below.

---

PHASE 3 — Prisma config for Prisma 7+ (if you see warnings)

Create `prisma/prisma.config.ts`:

```ts
import 'dotenv/config';

export default {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
      provider: 'postgresql',
    },
  },
};
```

This lets Prisma CLI and Migrate discover the connection string without `url` in schema.

---

PHASE 4 — Migrations & Generate

1) Validate & generate client (always do this after schema changes):

```bash
cd api
npx prisma validate
npx prisma generate
```

2) Create and run migrations (development):

```bash
npx prisma migrate dev --name init
```

What `migrate dev` does:
- Creates a migration file in `prisma/migrations/*`
- Applies it to your dev database
- Regenerates the Prisma Client

If the command fails because of connection config, ensure `.env` or `prisma.config.ts` is correct.

3) Alternative: introspect an existing DB

```bash
npx prisma db pull
npx prisma generate
```

This updates `schema.prisma` from the DB.

---

PHASE 5 — Prisma Client usage patterns (plain Node)

Create a quick seed script (`prisma/seed.ts`) to learn client usage:

```ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.create({
    data: { email: 'a@a.com', passwordHash: 'fake-hash' },
  });

  await prisma.task.createMany({
    data: [
      { title: 'First task', userId: u.id },
      { title: 'Second task', userId: u.id },
    ],
  });

  const tasks = await prisma.task.findMany({ where: { userId: u.id } });
  console.log('tasks', tasks);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run it:

```bash
# compile or run with ts-node
npx ts-node prisma/seed.ts
```

Common queries examples:

- Create: `prisma.user.create({ data })`
- Read: `prisma.user.findUnique({ where: { id } })`
- Update: `prisma.task.update({ where: { id }, data: {...} })`
- Delete: `prisma.task.delete({ where: { id } })`
- List with pagination: `prisma.task.findMany({ where, take, skip, orderBy })`
- Transaction: `prisma.$transaction([op1, op2])`

---

PHASE 6 — Integrate Prisma into NestJS (full files)

We provide full, copy-paste-ready code for a small NestJS integration.

1) Install server deps (in `api/`):

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs
npm install @nestjs/config class-validator class-transformer
# prisma client is already installed
```

2) `src/database/prisma.service.ts`

```ts
import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
```

3) `src/database/prisma.module.ts`

```ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

4) Example `UsersService` using Prisma (`src/users/users.service.ts`):

```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  create(email: string, passwordHash: string) {
    return this.prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async delete(id: string) {
    // optional: confirm exists
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.delete({ where: { id } });
  }
}
```

5) Example `TasksService` (`src/tasks/tasks.service.ts`):

```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, title: string) {
    return this.prisma.task.create({ data: { userId, title } });
  }

  list(userId: string, page = 1, pageSize = 10) {
    const skip = (page - 1) * pageSize;
    return this.prisma.task.findMany({
      where: { userId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId !== userId) throw new ForbiddenException();
    return task;
  }

  async update(userId: string, id: string, data: { title?: string; done?: boolean }) {
    await this.get(userId, id); // authorization check
    return this.prisma.task.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.task.delete({ where: { id } });
    return { deleted: true };
  }
}
```

6) Wiring modules

- Import `PrismaModule` in `AppModule`
- Provide `UsersService` and `TasksService` in their modules

`src/app.module.ts` minimal:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    TasksModule,
  ],
})
export class AppModule {}
```

7) Use transactions for multi-step updates

```ts
await this.prisma.$transaction(async (prisma) => {
  const u = await prisma.user.update({ where: { id }, data: { /*...*/ } });
  await prisma.task.create({ data: { title: 'x', userId: u.id } });
});
```

Note: the `$transaction(async (prisma) => {...})` signature gives you a transaction-bound client.

---

PHASE 7 — Advanced usage & patterns

1) Pagination (cursor-based example)

```ts
// cursor pagination: pass `cursor` as { id: '...' } and use `skip: 1` to exclude the cursor row
const page = await prisma.task.findMany({
  where: { userId },
  take: 20,
  cursor: cursorId ? { id: cursorId } : undefined,
  skip: cursorId ? 1 : undefined,
  orderBy: { createdAt: 'desc' },
});
```

2) Partial selects & performance
- Only select the fields you need with `select: { id: true, title: true }`.
- Use `include` to fetch relations when needed, but avoid `include` in hot loops.

3) Indexes & migrations
- Add `@@index([userId, createdAt])` in schema for common filters.
- Run `npx prisma migrate dev` after schema changes.

4) Seed data & testing
- Use a separate test DB or `sqlite` for CI tests.
- Use `prisma migrate reset` in test setup when safe (development only).

---

PHASE 8 — Common mistakes & gotchas

1) Not disconnecting the Prisma Client
- In short-lived scripts call `await prisma.$disconnect()`.
- In long-lived servers (NestJS) reuse a single client (singleton) and rely on process lifecycle.

2) Querying with wrong unique fields
- `findUnique` only works with unique or id fields. Use `findFirst` for non-unique filters.

3) Forgetting transactions for multi-step changes
- If you update multiple models, prefer `$transaction` to avoid partial updates.

4) Using `include` excessively
- `include` can cause N+1 patterns; consider batching with `findMany` and `where` filters, or use `select`.

5) Migrations vs db pull confusion
- `prisma db pull` updates schema from DB (reverse-engineer). `prisma migrate dev` creates SQL migrations from schema changes. Use them appropriately.

6) Schema `url` deprecation in Prisma 7
- If your Prisma CLI warns about `url` in schema, move the connection URL to `prisma.config.ts` or follow the newest docs.

---

PHASE 9 — Best practices (concise)

- Keep DB access in services, not controllers.
- Validate external inputs (DTOs) before hitting the DB.
- Use `select` to limit returned columns for sensitive data (never return `passwordHash`).
- Migrate in small steps; keep migrations in source control.
- Use dedicated DB for tests or ephemeral DBs (Docker/testcontainers).
- Monitor slow queries and add indexes as necessary.

---

PHASE 10 — Quick troubleshooting checklist

- `npx prisma validate` — checks schema
- `npx prisma generate` — refresh client types
- `npx prisma migrate dev` — create/apply migrations
- `npx prisma db pull` — introspect existing DB
- `npx prisma studio` — GUI to inspect data

---

EXTRA: Example `package.json` snippets for `api/`

```json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

If you want, I can:
- Scaffold all Nest files (`users`, `tasks`, `auth`) in your workspace so you can run the API locally; or
- Run `npx prisma validate` and `npx prisma generate` here and fix any environment issues.

Tell me which next step you want: `scaffold-code`, `run-prisma-validate`, or `run-migrate`.
