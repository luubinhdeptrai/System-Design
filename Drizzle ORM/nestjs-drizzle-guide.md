# NestJS + Drizzle ORM + PostgreSQL — Production Guide

> **Project:** Task Management API  
> **Stack:** NestJS 10 · Drizzle ORM · PostgreSQL 16 · `node-postgres` · `drizzle-kit`

---

## SHORT OVERVIEW

---

### What You're Building

A RESTful API managing **Users** and **Tasks** with a one-to-many relation.  
Every layer — from HTTP to SQL — is demonstrably typed, clean, and separated.

| Feature | Endpoints |
|---------|-----------|
| Users | `GET /users` · `GET /users/:id` · `POST /users` · `PATCH /users/:id` · `DELETE /users/:id` |
| Tasks | `GET /tasks[?userId=]` · `GET /tasks/:id` · `POST /tasks` · `PATCH /tasks/:id` · `DELETE /tasks/:id` |

---

### Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | NestJS 10 | Modular DI, decorators, convention over config |
| ORM | Drizzle ORM | Type-safe SQL builder, no magic, zero runtime overhead |
| DB Driver | `pg` (node-postgres) | Battle-tested PostgreSQL driver, connection pooling |
| Database | PostgreSQL 16 | Relational, constraints, `RETURNING`, transactions |
| Migrations | `drizzle-kit` | Schema diffing, SQL generation, migration runner |
| Validation | `class-validator` + `class-transformer` | Automatic DTO validation via global pipe |

---

### Project Structure

```
project/
├── package.json
├── drizzle.config.ts          # drizzle-kit config (schema path, output, dialect)
├── .env.example               # Environment variables template
│
├── migrations/
│   └── 0001_initial.sql       # Generated migration SQL (committed to VCS)
│
└── src/
    ├── main.ts                # App bootstrap, global ValidationPipe
    ├── app.module.ts          # Root module: wires ConfigModule, DatabaseModule, features
    │
    ├── database/              # ── DATABASE LAYER ──────────────────────────────
    │   ├── database.module.ts # @Global provider: creates pg Pool → drizzle(pool, { schema })
    │   └── schema/
    │       ├── index.ts       # Barrel: re-exports all tables + defines all relations
    │       ├── users.schema.ts  # users table, $inferSelect, $inferInsert
    │       └── tasks.schema.ts  # tasks table, FK to users
    │
    ├── users/                 # ── USERS FEATURE MODULE ────────────────────────
    │   ├── users.module.ts
    │   ├── users.controller.ts  # HTTP ↔ Service (no logic here)
    │   ├── users.service.ts     # Business rules: uniqueness, 404 guards
    │   ├── users.repository.ts  # ONLY file that touches Drizzle + users table
    │   └── dto/
    │       ├── create-user.dto.ts
    │       └── update-user.dto.ts
    │
    └── tasks/                 # ── TASKS FEATURE MODULE ────────────────────────
        ├── tasks.module.ts
        ├── tasks.controller.ts
        ├── tasks.service.ts     # Calls UsersService to validate ownership
        ├── tasks.repository.ts  # Drizzle queries: joins, filters, mutations
        └── dto/
            ├── create-task.dto.ts
            └── update-task.dto.ts
```

---

### Request Flow (Visual)

```
HTTP Request (JSON body + route params)
    │
    ▼
┌─────────────────────────────────────────────┐
│  CONTROLLER                                  │
│  - Parses @Param, @Body, @Query             │
│  - ParseIntPipe coerces string → number     │
│  - ValidationPipe validates DTO             │
└─────────────────────┬───────────────────────┘
                      │ Calls service method
                      ▼
┌─────────────────────────────────────────────┐
│  SERVICE                                     │
│  - Applies business rules                   │
│  - Guards: "does user exist?", "email       │
│    duplicate?", "is task owned by user?"    │
│  - Throws NestJS exceptions (→ HTTP codes)  │
│  - May call multiple repositories           │
└─────────────────────┬───────────────────────┘
                      │ Calls repository
                      ▼
┌─────────────────────────────────────────────┐
│  REPOSITORY                                  │
│  - The ONLY code that writes Drizzle        │
│  - All SQL is generated here                │
│  - Returns typed domain objects             │
└─────────────────────┬───────────────────────┘
                      │ Drizzle builds SQL
                      ▼
┌─────────────────────────────────────────────┐
│  DRIZZLE ORM                                 │
│  - Compiles TypeScript query to SQL         │
│  - Parameterises all values (SQL injection  │
│    safe by default)                         │
│  - Infers result types from schema          │
└─────────────────────┬───────────────────────┘
                      │ pg.Pool sends query
                      ▼
┌─────────────────────────────────────────────┐
│  PostgreSQL                                  │
│  - Executes query, enforces constraints     │
│  - Returns rows to pg driver                │
└─────────────────────┬───────────────────────┘
                      │ Same path reversed
                      ▼
        HTTP Response (typed JSON)
```

---

## DETAILED IMPLEMENTATION

---

## Section 1 — Schema Definition

### R — Reason

The schema is the **single source of truth** for the entire application.  
It simultaneously drives:

1. The PostgreSQL table DDL (via `drizzle-kit generate`)
2. The TypeScript types for every query input and output (via `$inferSelect` / `$inferInsert`)
3. The relational query API (via `relations()`)

Without a typed schema, you lose the type safety that makes Drizzle worth using.

---

### G — Goal

Define `users` and `tasks` tables with correct PostgreSQL types, constraints, a cascading foreign key, and inferred TypeScript types that auto-update when the schema changes.

---

### C — Concept

**Column builder → PostgreSQL type → TypeScript type mapping:**

| Drizzle Builder | PostgreSQL Column | TypeScript Type |
|----------------|------------------|-----------------|
| `serial('id').primaryKey()` | `SERIAL PRIMARY KEY` | `number` |
| `varchar('name', { length: 100 }).notNull()` | `VARCHAR(100) NOT NULL` | `string` |
| `text('description')` | `TEXT` | `string \| null` |
| `boolean('completed').default(false)` | `BOOLEAN DEFAULT false` | `boolean` |
| `integer('user_id').notNull()` | `INTEGER NOT NULL` | `number` |
| `timestamp('created_at').defaultNow()` | `TIMESTAMP DEFAULT now()` | `Date` |

**Type inference — no manual typing needed:**

```typescript
// users.schema.ts — Drizzle infers these types for you:

export type User = typeof users.$inferSelect;
// Resolves to:
// {
//   id: number;
//   name: string;
//   email: string;
//   createdAt: Date;
//   updatedAt: Date;
// }

export type NewUser = typeof users.$inferInsert;
// Resolves to:
// {
//   name: string;
//   email: string;
//   id?: number;          // serial → auto-generated, optional
//   createdAt?: Date;     // has default → optional
//   updatedAt?: Date;     // has default → optional
// }
```

When you change a column (e.g., make `description` non-nullable), TypeScript immediately
surfaces type errors across the entire codebase — before you run a single test.

**Circular import problem with relations:**  
If `users.schema.ts` imports from `tasks.schema.ts` for the relation, and `tasks.schema.ts`
imports from `users.schema.ts` for the FK reference, you get a circular import.  
Solution: put the FK reference (`.references(() => users.id)`) in `tasks.schema.ts` only,
and define **both** `usersRelations` and `tasksRelations` in `schema/index.ts`.

---

### R (Real-world Code) — `src/database/schema/users.schema.ts`

```typescript
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

// Table definition — this IS the schema
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Types derived directly from the table — never hand-write these
export type User    = typeof users.$inferSelect;  // full row type
export type NewUser = typeof users.$inferInsert;  // insert input type
```

**SQL equivalent generated by drizzle-kit:**
```sql
CREATE TABLE "users" (
  "id"         SERIAL PRIMARY KEY,
  "name"       VARCHAR(100) NOT NULL,
  "email"      VARCHAR(255) NOT NULL UNIQUE,
  "created_at" TIMESTAMP DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT now() NOT NULL
);
```

---

### R (Real-world Code) — `src/database/schema/tasks.schema.ts`

```typescript
import { pgTable, serial, varchar, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),                   // nullable — no .notNull()
  completed: boolean('completed').default(false).notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // FK + cascade delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Task    = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
```

**SQL equivalent:**
```sql
CREATE TABLE "tasks" (
  "id"          SERIAL PRIMARY KEY,
  "title"       VARCHAR(255) NOT NULL,
  "description" TEXT,
  "completed"   BOOLEAN DEFAULT false NOT NULL,
  "user_id"     INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at"  TIMESTAMP DEFAULT now() NOT NULL,
  "updated_at"  TIMESTAMP DEFAULT now() NOT NULL
);
```

---

### R (Real-world Code) — `src/database/schema/index.ts`

```typescript
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { tasks } from './tasks.schema';

// Re-export everything so consumers only need: import * as schema from '../database/schema'
export * from './users.schema';
export * from './tasks.schema';

// Relations — defined here, after both tables exist, to avoid circular imports
// These are NOT database constraints — they are Drizzle relational query metadata
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),                      // one user → many tasks
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],                // tasks.user_id column
    references: [users.id],                // links to users.id
  }),
}));
```

---

### F — Summary

- Column builders in `pgTable()` declare DB structure AND TS types simultaneously
- `$inferSelect` = "what SELECT returns"; `$inferInsert` = "what INSERT accepts"
- Put relations in the barrel `index.ts` to avoid circular imports
- The FK `.references()` enforces the constraint in the DB; `relations()` powers `db.query.*`

---

## Section 2 — Database Module

### R — Reason

Every feature module that queries the database needs access to the Drizzle client.  
Without a shared provider, each module would spin up its own `pg.Pool` — exhausting
database connections and creating inconsistency.

---

### G — Goal

Create a **single, global Drizzle provider** by wrapping a shared `pg.Pool` in Drizzle.  
Use a `Symbol` injection token so any module can `@Inject(DRIZZLE)` without coupling to a class.

---

### C — Concept

**NestJS DI Token Pattern:**

```typescript
// Token: a Symbol is collision-proof (unlike a string)
export const DRIZZLE = Symbol('DRIZZLE');

// Provider: factory-style, so we can read config at construction time
{
  provide: DRIZZLE,
  useFactory: (config: ConfigService) => {
    const pool = new Pool({ connectionString: config.get('DATABASE_URL') });
    return drizzle(pool, { schema });  // ← schema argument is critical
  },
  inject: [ConfigService],
}
```

**Why pass `{ schema }` to `drizzle()`?**  
Without it, `db.select().from(users)` still works, but `db.query.users.findMany()`  
(the relational API) does not. Passing the schema also gives Drizzle information  
to correctly infer return types for joined queries.

**Why `@Global()`?**  
Instead of adding `DatabaseModule` to every feature module's `imports: []`,  
marking it `@Global()` registers its exports into the application root context.  
Feature modules get the `DRIZZLE` token injected without any imports.

---

### R (Real-world Code) — `src/database/database.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Injection token — use Symbol, not string, to prevent naming collisions
export const DRIZZLE = Symbol('DRIZZLE');

@Global()   // ← makes exports available to ALL modules without explicit import
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (config: ConfigService) => {
        const pool = new Pool({
          connectionString: config.get<string>('DATABASE_URL'),
          max: 10,              // up to 10 concurrent DB connections
          idleTimeoutMillis: 30_000,
        });
        // drizzle() wraps the pool. Schema arg enables type inference + relational API
        return drizzle(pool, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DRIZZLE],   // ← other modules receive this via @Inject(DRIZZLE)
})
export class DatabaseModule {}
```

---

### F — Summary

One `pg.Pool` → one `drizzle()` client → one global DI token.  
All repositories inject `DRIZZLE` to get type-safe access to the database  
without each module managing its own connection lifecycle.

---

## Section 3 — Repository Layer

### R — Reason

Services should orchestrate business logic, not write SQL.  
Repositories are the **only layer that talks to Drizzle**.  
This separation makes unit testing possible — you mock the repository,  
not the database driver.

---

### G — Goal

Each repository is an `@Injectable()` class injecting `DRIZZLE`.  
It exposes typed methods (`findAll`, `findById`, `create`, `update`, `delete`)  
that map directly to SQL operations.

---

### C — Concept

**Drizzle CRUD → SQL Equivalents:**

```typescript
// SELECT * FROM users
db.select().from(users)

// SELECT id, name, email FROM users WHERE id = $1
db.select({ id: users.id, name: users.name, email: users.email })
  .from(users)
  .where(eq(users.id, id))

// INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *
db.insert(users).values({ name, email }).returning()

// UPDATE users SET name = $1, updated_at = $2 WHERE id = $3 RETURNING *
db.update(users)
  .set({ name, updatedAt: new Date() })
  .where(eq(users.id, id))
  .returning()

// DELETE FROM users WHERE id = $1 RETURNING id
db.delete(users).where(eq(users.id, id)).returning({ id: users.id })

// SELECT tasks.*, users.name FROM tasks
// LEFT JOIN users ON users.id = tasks.user_id WHERE tasks.id = $1
db.select({ task: tasks, user: { id: users.id, name: users.name } })
  .from(tasks)
  .leftJoin(users, eq(tasks.userId, users.id))
  .where(eq(tasks.id, id))
```

**Key facts:**
- `db.select()...` **always returns an array**, even for single-row queries
- Destructure to get one row: `const [user] = await db.select()...`
- `user` will be `undefined` if no match — check before use
- `.returning()` is PostgreSQL-only — gets the mutated row back in one round-trip
- All operators (`eq`, `and`, `or`, `like`, `gte`, `lte`) are import from `'drizzle-orm'`

---

### R (Real-world Code) — `src/users/users.repository.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { users, User, NewUser } from '../database/schema';

@Injectable()
export class UsersRepository {
  constructor(
    // @Inject uses the Symbol token — @InjectRepository would be TypeORM
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(): Promise<User[]> {
    // SQL: SELECT * FROM users
    return this.db.select().from(users);
  }

  async findById(id: number): Promise<User | undefined> {
    // SQL: SELECT * FROM users WHERE id = $1
    // Always returns array → destructure to get first element
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;  // undefined if not found
  }

  async findByEmail(email: string): Promise<User | undefined> {
    // SQL: SELECT * FROM users WHERE email = $1
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async create(data: NewUser): Promise<User> {
    // SQL: INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *
    // .returning() gives back the inserted row (with generated id, timestamps)
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async update(id: number, data: Partial<NewUser>): Promise<User | undefined> {
    // SQL: UPDATE users SET ... WHERE id = $1 RETURNING *
    const [user] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })  // always stamp updatedAt
      .where(eq(users.id, id))
      .returning();
    return user;  // undefined if no matching row
  }

  async delete(id: number): Promise<boolean> {
    // SQL: DELETE FROM users WHERE id = $1 RETURNING id
    // Select only id to minimise data returned
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return result.length > 0;
  }
}
```

---

### R (Real-world Code) — `src/tasks/tasks.repository.ts`

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { tasks, users, Task, NewTask } from '../database/schema';

@Injectable()
export class TasksRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async findAll(): Promise<Task[]> {
    return this.db.select().from(tasks);
  }

  async findByUserId(userId: number): Promise<Task[]> {
    // SQL: SELECT * FROM tasks WHERE user_id = $1
    return this.db.select().from(tasks).where(eq(tasks.userId, userId));
  }

  async findById(id: number): Promise<Task | undefined> {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async findByIdWithUser(id: number) {
    // SQL: SELECT tasks.*, users.id, users.name, users.email
    //      FROM tasks LEFT JOIN users ON users.id = tasks.user_id
    //      WHERE tasks.id = $1
    //
    // Result shape is: { task: Task, user: { id, name, email } | null }
    const [result] = await this.db
      .select({
        task: tasks,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.userId, users.id))
      .where(eq(tasks.id, id));
    return result;
  }

  async create(data: NewTask): Promise<Task> {
    // SQL: INSERT INTO tasks (title, description, completed, user_id) VALUES (...) RETURNING *
    const [task] = await this.db.insert(tasks).values(data).returning();
    return task;
  }

  async update(id: number, data: Partial<NewTask>): Promise<Task | undefined> {
    const [task] = await this.db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });
    return result.length > 0;
  }
}
```

---

### F — Summary

Repositories are thin, typed wrappers around Drizzle operations.  
They know about SQL; nothing above them does.  
`@Inject(DRIZZLE)` + `NodePgDatabase<typeof schema>` = full type-safe access.

---

## Section 4 — Service Layer

### R — Reason

Business rules must live somewhere, and that somewhere is the service.  
The service layer decides **what** to do; the repository decides **how** to store it.  
Mixing logic in controllers makes endpoints hard to reuse and test.

---

### G — Goal

Services validate domain invariants, throw typed exceptions, and orchestrate  
across multiple repositories when needed (e.g., verifying a user exists before  
creating a task for them).

---

### C — Concept

**NestJS exceptions → HTTP status codes:**

| Exception | HTTP Status |
|-----------|------------|
| `NotFoundException` | 404 Not Found |
| `ConflictException` | 409 Conflict |
| `BadRequestException` | 400 Bad Request |
| `ForbiddenException` | 403 Forbidden |
| `UnauthorizedException` | 401 Unauthorized |

**Cross-module dependency:**  
`TasksService` needs to verify a user exists. Rather than directly querying the  
`users` table from `TasksRepository` inside the tasks module,  
it imports and calls `UsersService`. This respects module boundaries.

---

### R (Real-world Code) — `src/users/users.service.ts`

```typescript
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../database/schema';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    // After this guard, TypeScript knows user is User (not undefined)
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    // Business rule: emails must be globally unique
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');
    return this.usersRepository.create(dto);
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    if (dto.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      // Allow the user to "update" their email to the same value
      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use by another account');
      }
    }
    const user = await this.usersRepository.update(id, dto);
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.usersRepository.delete(id);
    // Never silently succeed on missing resource — clients need to know
    if (!deleted) throw new NotFoundException(`User #${id} not found`);
  }
}
```

---

### R (Real-world Code) — `src/tasks/tasks.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { UsersService } from '../users/users.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from '../database/schema';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    // Cross-module: validates user existence without leaking DB access
    private readonly usersService: UsersService,
  ) {}

  findAll(): Promise<Task[]> {
    return this.tasksRepository.findAll();
  }

  async findById(id: number) {
    const result = await this.tasksRepository.findByIdWithUser(id);
    if (!result) throw new NotFoundException(`Task #${id} not found`);
    return result;  // returns { task: Task, user: { id, name, email } }
  }

  async findByUserId(userId: number): Promise<Task[]> {
    // This throws 404 automatically if user doesn't exist
    await this.usersService.findById(userId);
    return this.tasksRepository.findByUserId(userId);
  }

  async create(dto: CreateTaskDto): Promise<Task> {
    // Verify user exists — gives a meaningful 404 instead of a FK violation error
    await this.usersService.findById(dto.userId);
    return this.tasksRepository.create(dto);
  }

  async update(id: number, dto: UpdateTaskDto): Promise<Task> {
    if (dto.userId !== undefined) {
      await this.usersService.findById(dto.userId);
    }
    const task = await this.tasksRepository.update(id, dto);
    if (!task) throw new NotFoundException(`Task #${id} not found`);
    return task;
  }

  async remove(id: number): Promise<void> {
    const deleted = await this.tasksRepository.delete(id);
    if (!deleted) throw new NotFoundException(`Task #${id} not found`);
  }
}
```

---

### F — Summary

Services guard domain invariants and throw NestJS exceptions that auto-map to HTTP codes.  
They call other services (not other repos) to orchestrate cross-feature logic.  
Zero SQL, zero HTTP knowledge — pure business logic.

---

## Section 5 — Controller Layer

### R — Reason

The controller is an **HTTP adapter**. Its job is to translate HTTP input  
(path params, body, query strings, headers) into service calls, and return the result.  
It should contain no business logic, only parsing and delegation.

---

### G — Goal

Map RESTful routes to service methods using NestJS decorators.  
Apply correct HTTP status codes. Parse and validate all inputs before they reach the service.

---

### C — Concept

**Key NestJS parsing tools:**

| Decorator | What it does |
|-----------|-------------|
| `@Param('id', ParseIntPipe)` | Extracts `:id` from URL, converts string → number, throws 400 if invalid |
| `@Body() dto: CreateUserDto` | Binds request body, ValidationPipe validates class-validator rules |
| `@Query('userId', new ParseIntPipe({ optional: true }))` | Optional query param with coercion |
| `@HttpCode(HttpStatus.CREATED)` | Changes default 200 to 201 for POST |
| `@HttpCode(HttpStatus.NO_CONTENT)` | Returns 204 (no body) for DELETE |

**ValidationPipe (configured in `main.ts`):**
- `whitelist: true` — strips unknown properties from body
- `forbidNonWhitelisted: true` — throws 400 if unknown properties present
- `transform: true` — coerces primitives (string → number for `@IsInt()` fields)

---

### R (Real-world Code) — `src/users/users.controller.ts`

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, Patch, Post,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')   // all routes prefixed with /users
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    // GET /users → 200 [User]
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // GET /users/42 → 200 User | 404
    return this.usersService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)       // override default 200 → 201
  create(@Body() dto: CreateUserDto) {
    // POST /users → 201 User | 409 (duplicate email)
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    // PATCH /users/42 → 200 User | 404 | 409
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)    // 204: success, no response body
  remove(@Param('id', ParseIntPipe) id: number) {
    // DELETE /users/42 → 204 | 404
    return this.usersService.remove(id);
  }
}
```

---

### R (Real-world Code) — `src/tasks/tasks.controller.ts`

```typescript
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, Patch, Post, Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(
    // GET /tasks?userId=5 filters by user; GET /tasks returns all
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number,
  ) {
    if (userId) return this.tasksService.findByUserId(userId);
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // Returns { task, user } shape (joined query)
    return this.tasksService.findById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.remove(id);
  }
}
```

---

### F — Summary

Controllers are thin HTTP translators — parse input, call service, return result.  
Pipes handle coercion and validation before the controller body executes.  
Set explicit status codes to be a good HTTP citizen (201, 204).

---

## Section 6 — Migrations

### R — Reason

Your TypeScript schema describes how the database **should** look.  
Migrations are the mechanism that makes the actual PostgreSQL database match that description.  
Without migrations, schema changes are lost, unrepeatable, and impossible to version.

---

### G — Goal

Use `drizzle-kit` to auto-generate SQL migrations from schema changes,  
review them, and apply them to any environment reproducibly.

---

### C — Concept

**Migration workflow:**

```
1. Edit schema files (TypeScript)
       ↓
2. npx drizzle-kit generate
   → drizzle-kit compares schema to last generated snapshot
   → Produces migrations/XXXX_<name>.sql
       ↓
3. Review the SQL file (critical in production — never skip this)
       ↓
4. npx drizzle-kit migrate
   → Connects to DATABASE_URL
   → Applies all pending .sql files
   → Records applied migrations in __drizzle_migrations table
```

**`drizzle.config.ts` key fields:**

| Field | Purpose |
|-------|---------|
| `schema` | Path to schema files — drizzle-kit reads these |
| `out` | Directory where migration .sql files are written |
| `dialect` | `'postgresql'` \| `'mysql'` \| `'sqlite'` |
| `dbCredentials.url` | Connection string — read from `.env` at generation/migration time |

---

### R (Real-world Code) — Generated migration SQL

```sql
-- migrations/0001_initial.sql
-- Auto-generated by drizzle-kit — REVIEW BEFORE APPLYING

CREATE TABLE IF NOT EXISTS "users" (
  "id"         SERIAL PRIMARY KEY NOT NULL,
  "name"       VARCHAR(100) NOT NULL,
  "email"      VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP DEFAULT now() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "tasks" (
  "id"          SERIAL PRIMARY KEY NOT NULL,
  "title"       VARCHAR(255) NOT NULL,
  "description" TEXT,
  "completed"   BOOLEAN DEFAULT false NOT NULL,
  "user_id"     INTEGER NOT NULL,
  "created_at"  TIMESTAMP DEFAULT now() NOT NULL,
  "updated_at"  TIMESTAMP DEFAULT now() NOT NULL
);

ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_user_id_users_id_fk"
  FOREIGN KEY ("user_id")
  REFERENCES "users"("id")
  ON DELETE CASCADE
  ON UPDATE NO ACTION;
```

---

### F — Summary

Schema → `drizzle-kit generate` → SQL file → review → `drizzle-kit migrate`.  
Always commit migration files to version control alongside the schema changes.  
Run `drizzle-kit migrate` in your CI/CD deployment pipeline — not at app startup.

---

## Section 7 — Request Flow Walkthrough (End to End)

### Example: `POST /tasks` — Create a task

**HTTP request:**
```json
POST /tasks
Content-Type: application/json

{
  "title": "Write unit tests",
  "description": "Cover repository layer",
  "userId": 3
}
```

**Step-by-step trace:**

```
1. NestJS router matches POST /tasks → TasksController.create()

2. ValidationPipe deserialises body into CreateTaskDto
   - @IsString() / @IsInt() / @Positive() decorators checked
   - Unknown properties stripped (whitelist: true)
   - Invalid body → 400 thrown here, never reaches service

3. TasksController.create(dto) calls TasksService.create(dto)

4. TasksService.create():
   a. Calls UsersService.findById(dto.userId = 3)
   b. UsersService calls UsersRepository.findById(3)
   c. Drizzle builds:
      SELECT * FROM users WHERE id = $1   -- params: [3]
   d. pg.Pool sends query to PostgreSQL
   e. PostgreSQL returns the row (or empty array)
   f. If empty → UsersRepository returns undefined
      → UsersService throws NotFoundException("User #3 not found") → 404 response
   g. If found → UsersService returns the User object

5. TasksRepository.create(dto) is called
   Drizzle builds:
   INSERT INTO tasks (title, description, completed, user_id, created_at, updated_at)
   VALUES ($1, $2, $3, $4, now(), now())
   RETURNING *
   params: ["Write unit tests", "Cover repository layer", false, 3]

6. PostgreSQL executes INSERT, enforces FK constraint on user_id
   Returns the new row with generated id, timestamps

7. Drizzle maps the row back to Task type (typed by $inferSelect)

8. Result flows back: Repository → Service → Controller → NestJS → HTTP

9. NestJS serialises Task to JSON
   HTTP 201 Created
   Content-Type: application/json

   {
     "id": 12,
     "title": "Write unit tests",
     "description": "Cover repository layer",
     "completed": false,
     "userId": 3,
     "createdAt": "2026-04-03T10:30:00.000Z",
     "updatedAt": "2026-04-03T10:30:00.000Z"
   }
```

---

## Section 8 — Common Mistakes and How to Avoid Them

### Mistake 1: Not destructuring single-row queries

```typescript
// ❌ Wrong — returns Task[], not Task
const user = await db.select().from(users).where(eq(users.id, id));

// ✅ Correct — destructure; user is User | undefined
const [user] = await db.select().from(users).where(eq(users.id, id));
```

---

### Mistake 2: Forgetting `.returning()` after mutations

```typescript
// ❌ Wrong — returns query metadata, not the row
await db.insert(users).values(data);

// ✅ Correct — returns the inserted row with generated id
const [user] = await db.insert(users).values(data).returning();
```

---

### Mistake 3: Circular schema imports

```typescript
// ❌ Wrong — users.schema.ts imports from tasks.schema.ts for relations
//           tasks.schema.ts already imports from users.schema.ts for FK
//           → circular import at module load time

// ✅ Correct — FK reference (.references()) stays in tasks.schema.ts
//             relations() are defined in schema/index.ts after both tables exist
```

---

### Mistake 4: Not passing schema to drizzle()

```typescript
// ❌ Loses relational API and some type inference
const db = drizzle(pool);

// ✅ Full type safety + db.query.* API
const db = drizzle(pool, { schema });
```

---

### Mistake 5: Creating a new Pool per request

```typescript
// ❌ Opens a new TCP connection on every request — will exhaust DB connections
useFactory: () => {
  const client = new Client({ ... });  // single connection, not pooled
  return drizzle(client);
}

// ✅ Create one Pool; pg manages the connection pool for you
useFactory: () => {
  const pool = new Pool({ connectionString: ..., max: 10 });
  return drizzle(pool, { schema });
}
```

---

### Mistake 6: Hardcoding credentials

```typescript
// ❌ Never do this
const pool = new Pool({ connectionString: 'postgresql://admin:secret@prod-db/mydb' });

// ✅ Always read from environment via ConfigService
const pool = new Pool({ connectionString: config.get('DATABASE_URL') });
```

---

### Mistake 7: Running migrations at app startup

```typescript
// ❌ Risky in production — locks tables, can fail mid-migration, 
//    bad with multiple replicas starting simultaneously
async function bootstrap() {
  await migrate(db, { migrationsFolder: './migrations' }); // don't do this
  const app = await NestFactory.create(AppModule);
}

// ✅ Run migrations in your deployment pipeline, before starting the app
// package.json: "db:migrate": "drizzle-kit migrate"
// CI/CD: npm run db:migrate && npm run start:prod
```

---

## Section 9 — Best Practices Summary

| Category | Practice |
|----------|---------|
| Schema | Use `$inferSelect` / `$inferInsert` — never manually type database entities |
| Schema | Put relations in the barrel `index.ts` to prevent circular imports |
| Queries | Always use Drizzle operators (`eq`, `and`, `like`) — never string-concatenated SQL |
| Queries | Use `.returning()` for mutations instead of a follow-up SELECT |
| Queries | Destructure `[row]` for single-record queries |
| DI | Use `Symbol` injection token for the Drizzle client |
| DI | Mark `DatabaseModule` as `@Global()` — no imports needed in feature modules |
| Architecture | Repository = only SQL; Service = only business logic; Controller = only HTTP |
| Architecture | Services call other services for cross-module logic, not foreign repositories |
| Validation | Use `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` globally |
| Errors | Throw NestJS exceptions in services — they auto-map to HTTP status codes |
| Migrations | Commit migration SQL files to version control |
| Migrations | Run migrations in CI/CD, not at app startup |
| Connection | Use `pg.Pool`, not `pg.Client` — always pool in production |
| Security | Never log full connection strings; rotate credentials per environment |

---

## Section 10 — Quick Command Reference

```bash
# Install dependencies
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg

# Generate a migration (from schema changes)
npx drizzle-kit generate

# Apply pending migrations
npx drizzle-kit migrate

# Open Drizzle Studio (visual database browser)
npx drizzle-kit studio

# Start in development
npm run start:dev
```

```bash
# Example HTTP calls (curl)

# Create user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'

# Create task for user id=1
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Fix bug","userId":1}'

# Get all tasks for user id=1
curl http://localhost:3000/tasks?userId=1

# Mark task id=3 complete
curl -X PATCH http://localhost:3000/tasks/3 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```
