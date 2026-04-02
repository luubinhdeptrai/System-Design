# NestJS Real-World Backend: Step-by-step (Hands-on)

**Goal:** build a practical backend with **Auth + Users + Tasks CRUD** on **PostgreSQL** using **Prisma ORM**, with real dev workflow (design → coding → testing).

This guide assumes you already know Nest basics (modules/controllers/services) and want to apply them like a real project.

---

## 0) Prereqs (do this once)

### Install tools
- Node.js **LTS** (18+ or 20+)
- Git
- Docker Desktop (recommended for running Postgres locally)
- Nest CLI:

```bash
npm i -g @nestjs/cli
nest --version
```

### VS Code setup (recommended)
Install extensions:
- ESLint
- Prettier
- Prisma
- Docker

Open integrated terminal (PowerShell) in VS Code.

---

## 1) Start the project in VS Code

From the workspace root, scaffold the app:

```bash
cd d:\Nestjs-Tutorial
nest new api
```

Choose a package manager (npm/pnpm/yarn). I’ll assume **npm** below.

Run the dev server:

```bash
cd api
npm run start:dev
```

Verify:
- `GET http://localhost:3000/` returns “Hello World!”

---

## 2) Define the “real project” scope (tiny but realistic)

We’ll build:
- **Auth**: register/login with JWT
- **Users**: `/users/me` (current user)
- **Tasks**: CRUD tasks per user

### API endpoints (v1)
- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me` (JWT)
- `POST /tasks` (JWT)
- `GET /tasks` (JWT)
- `GET /tasks/:id` (JWT)
- `PATCH /tasks/:id` (JWT)
- `DELETE /tasks/:id` (JWT)

### Data model
- `User`: id, email, passwordHash, createdAt
- `Task`: id, title, done, userId, createdAt, updatedAt

---

## 3) Real-world folder structure (simple, scalable)

Inside `api/src`:

```
src/
  main.ts
  app.module.ts

  config/
    env.ts

  common/
    decorators/
    guards/

  database/
    prisma.module.ts
    prisma.service.ts

  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    dto/
    strategies/

  users/
    users.module.ts
    users.controller.ts
    users.service.ts

  tasks/
    tasks.module.ts
    tasks.controller.ts
    tasks.service.ts
    dto/
```

**Rules of thumb**
- Each feature gets its own module folder (`auth`, `tasks`, `users`).
- “Cross-cutting” utilities live in `common/`.
- DB integration goes in `database/`.
- Config & env validation lives in `config/`.

---

## 4) Add base project standards (validation, config)

### 4.1 Add dependencies

```bash
npm i @nestjs/config zod
npm i class-validator class-transformer
```

### 4.2 Add env validation (Zod)

Create `src/config/env.ts`:

```ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('1h'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  return envSchema.parse(raw);
}
```

### 4.3 Load config globally

Update `src/app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
  ],
})
export class AppModule {}
```

### 4.4 Global request validation

Update `src/main.ts`:

```ts
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
```

---

## 5) Database integration with Prisma (Postgres)

### 5.1 Start Postgres locally (Docker)

From `api/`, create `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run it:

```bash
docker compose up -d
```

### 5.2 Install Prisma

```bash
npm i prisma @prisma/client
npx prisma init
```

Set `.env` in `api/` (example):

```env
NODE_ENV=development
PORT=3000

DATABASE_URL="postgresql://app:app@localhost:5432/app?schema=public"

JWT_SECRET="change-me-to-a-long-random-secret"
JWT_EXPIRES_IN="1h"
```

### 5.3 Define Prisma schema

Edit `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
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

Run migration:

```bash
npx prisma migrate dev --name init
```

### 5.4 Create Prisma module/service
 
Create `src/database/prisma.service.ts`:

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

Create `src/database/prisma.module.ts`:

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

Import it in `AppModule`:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env';
import { PrismaModule } from './database/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PrismaModule,
  ],
})
export class AppModule {}
```

---

## 6) Auth (JWT) like a real service

### 6.1 Install auth deps

```bash
npm i @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm i -D @types/bcrypt @types/passport-jwt
```

### 6.2 Create Auth module skeleton

```bash
nest g module auth
nest g controller auth
nest g service auth
```

Create DTOs:

`src/auth/dto/register.dto.ts`

```ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
```

`src/auth/dto/login.dto.ts`

```ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
```

### 6.3 Implement AuthService

Update `src/auth/auth.service.ts`:

```ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true },
    });

    return { user, accessToken: await this.signToken(user.id, user.email) };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return {
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
      accessToken: await this.signToken(user.id, user.email),
    };
  }

  private async signToken(userId: string, email: string) {
    return this.jwt.signAsync({ sub: userId, email });
  }
}
```

### 6.4 JWT strategy + guard

Create `src/auth/strategies/jwt.strategy.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

Create a simple guard `src/common/guards/jwt-auth.guard.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### 6.5 Wire the AuthModule

Update `src/auth/auth.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

Update `src/auth/auth.controller.ts`:

```ts
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.password);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }
}
```

Finally, import `AuthModule` in `AppModule`.

---

## 7) Users: “me” endpoint

Generate module + controller + service:

```bash
nest g module users
nest g controller users
nest g service users
```

Create `src/common/decorators/request-user.decorator.ts`:

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestUser = { userId: string; email: string };

export const ReqUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
```

Update `src/users/users.controller.ts`:

```ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ReqUser } from '../common/decorators/request-user.decorator';

@Controller('users')
export class UsersController {
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@ReqUser() user: { userId: string; email: string }) {
    return user;
  }
}
```

That’s intentionally small: in real apps, `/me` often returns DB user profile info. You can extend later.

---

## 8) Tasks CRUD (per-user) with correct authorization

Generate module + controller + service:

```bash
nest g module tasks
nest g controller tasks
nest g service tasks
```

DTOs:

`src/tasks/dto/create-task.dto.ts`

```ts
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}
```

`src/tasks/dto/update-task.dto.ts`

```ts
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}
```

Service (`src/tasks/tasks.service.ts`):

```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, data: { title: string; done?: boolean }) {
    return this.prisma.task.create({
      data: {
        title: data.title,
        done: data.done ?? false,
        userId,
      },
    });
  }

  list(userId: string) {
    return this.prisma.task.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId !== userId) throw new ForbiddenException();
    return task;
  }

  async update(userId: string, taskId: string, data: { title?: string; done?: boolean }) {
    await this.get(userId, taskId);

    return this.prisma.task.update({
      where: { id: taskId },
      data,
    });
  }

  async remove(userId: string, taskId: string) {
    await this.get(userId, taskId);

    await this.prisma.task.delete({ where: { id: taskId } });
    return { deleted: true };
  }
}
```

Controller (`src/tasks/tasks.controller.ts`):

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ReqUser } from '../common/decorators/request-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  create(@ReqUser() user: { userId: string }, @Body() dto: CreateTaskDto) {
    return this.tasks.create(user.userId, dto);
  }

  @Get()
  list(@ReqUser() user: { userId: string }) {
    return this.tasks.list(user.userId);
  }

  @Get(':id')
  get(@ReqUser() user: { userId: string }, @Param('id') id: string) {
    return this.tasks.get(user.userId, id);
  }

  @Patch(':id')
  update(@ReqUser() user: { userId: string }, @Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@ReqUser() user: { userId: string }, @Param('id') id: string) {
    return this.tasks.remove(user.userId, id);
  }
}
```

Import `TasksModule` and `UsersModule` into `AppModule`.

---

## 9) Run the system end-to-end (manual test)

1) Start DB:

```bash
docker compose up -d
```

2) Run migrations:

```bash
npx prisma migrate dev
```

3) Start API:

```bash
npm run start:dev
```

4) Register:

```bash
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d "{\"email\":\"a@a.com\",\"password\":\"password123\"}"
```

Copy `accessToken`.

5) Create a task:

```bash
curl -X POST http://localhost:3000/tasks -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d "{\"title\":\"Learn NestJS\"}"
```

---

## 10) Real-world development flow (idea → design → coding → testing)

### Step A — Write a tiny spec (10 minutes)
- Problem statement
- Entities and relationships
- Endpoint list + request/response examples
- Non-functional constraints (auth, pagination later, etc.)

### Step B — Implement vertical slices
Do work in thin slices that ship value:
1) **Auth register/login** (no tasks yet)
2) **Tasks create/list**
3) **Tasks get/update/delete**
4) Add “nice” but essential: logging, error shape, Swagger

### Step C — Testing strategy (practical)
Nest gives you three levels:

1) **Unit tests**: services with mocked DB
2) **Integration tests**: module + real providers but mocked external dependencies
3) **E2E tests**: spin up the app and hit HTTP endpoints

Start with E2E for core flows; add unit tests as logic grows.

---

## 11) Add E2E tests (recommended)

Nest already scaffolds `test/`.

Install supertest types (often already present):

```bash
npm i -D supertest @types/supertest
```

Create `test/auth-tasks.e2e-spec.ts` (conceptual):
- Register
- Login
- Create task
- List tasks

**Tip:** for E2E, you usually want a **separate test database**.
- Option 1: `.env.test` with another Postgres DB
- Option 2: use Prisma with SQLite for tests (requires schema adjustments)

---

## 12) Best practices you’ll keep using

### Configuration
- Validate env on startup (we did)
- Never read `process.env.*` deep in services; prefer `ConfigService`

### DTOs + Validation
- Use DTOs for input
- Keep DTOs near feature code (`tasks/dto/*`)

### Error handling
- Throw Nest exceptions (`NotFoundException`, `ForbiddenException`)
- Don’t leak sensitive info (password hashes)

### Database access
- Keep DB logic in services
- Use transactions for multi-write flows (`prisma.$transaction`)

### Authz (authorization)
- Always check ownership for user-bound resources (we did in `TasksService.get`)

---

## 13) What to build next (in real order)

If you want this to feel truly “production-like”, add these in order:
1) Pagination for `GET /tasks` (cursor-based)
2) Swagger docs (`@nestjs/swagger`)
3) Structured logging (pino)
4) Rate limiting for auth endpoints
5) Refresh tokens (optional)

---

## If you want, I can drive the repo too

If you want me to **actually scaffold and implement this code directly in your workspace** (generate files, wire modules, and run it), tell me:
- npm vs pnpm
- Prisma + Postgres is OK? (or TypeORM?)

Then I’ll implement it end-to-end and leave you with a runnable project.
