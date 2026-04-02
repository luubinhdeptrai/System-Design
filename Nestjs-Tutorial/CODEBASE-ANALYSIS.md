# NestJS Backend Codebase Analysis & Documentation

## 📚 Project Overview

This is a **production-ready NestJS backend** built with modern technologies including JWT authentication, Prisma ORM, PostgreSQL, and TypeScript.

### Tech Stack
- **Framework**: NestJS 11.0.1 (Node.js framework)
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL 16 (via Docker)
- **ORM**: Prisma 5.22.0
- **Authentication**: JWT + Passport + bcrypt
- **Validation**: Zod + class-validator
- **Testing**: Jest
- **Linting**: ESLint 9

---

## 🏗️ Architecture Overview

### Project Structure
```
src/
├── auth/                 # Authentication module (JWT, bcrypt)
│   ├── auth.service.ts   # Register, login logic
│   ├── auth.controller.ts # Auth endpoints
│   ├── auth.module.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts # JWT extraction & validation
│   └── dto/
│       ├── register.dto.ts
│       └── login.dto.ts
├── users/                # User profile module
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── users.module.ts
├── tasks/                # Todo tasks module
│   ├── tasks.service.ts  # CRUD operations
│   ├── tasks.controller.ts # Task endpoints
│   ├── tasks.module.ts
│   └── dto/
│       ├── create-task.dto.ts
│       └── update-task.dto.ts
├── common/               # Shared utilities
│   ├── guards/
│   │   └── jwt-auth.guard.ts # Route protection
│   └── decorators/
│       └── request-user.decorator.ts # Extract user from request
├── config/               # Environment configuration
│   └── env.ts           # Zod validation schema
├── database/             # Database layer
│   ├── prisma.service.ts # Prisma wrapper
│   └── prisma.module.ts  # Global Prisma provider
├── app.module.ts         # Root module
└── main.ts               # Application entrypoint

prisma/
├── schema.prisma         # Database schema definition
├── seed.ts              # Database seeding script
└── migrations/          # Migration history
```

### Module Dependencies
```
AppModule
├── PrismaModule (global)
├── ConfigModule
├── PassportModule
├── JwtModule
├── AuthModule (depends on PrismaModule, JwtModule)
├── UsersModule (depends on PrismaModule)
└── TasksModule (depends on PrismaModule)
```

---

## 💾 Data Models

### User Model
```prisma
model User {
  id           String   @id @default(cuid())      # Unique ID
  email        String   @unique                    # Unique email
  passwordHash String                              # Bcrypt hashed password
  createdAt    DateTime @default(now())            # Account creation time
  tasks        Task[]                              # One-to-many relation
}
```

### Task Model
```prisma
model Task {
  id        String   @id @default(cuid())          # Unique ID
  title     String                                  # Task description
  done      Boolean  @default(false)                # Completion status
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt                     # Last modified time
  userId    String   @index                         # Foreign key to User
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Test Model
```prisma
model Test {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}
```

**Relations:**
- User (1) ↔ (Many) Tasks
- Cascade delete: Deleting a user automatically deletes their tasks

---

## 🔐 Authentication Flow

### 1. Registration
**Endpoint:** `POST /auth/register`
- Input: `{ email: string, password: string }`
- Process:
  1. Validate email format (unique check)
  2. Hash password with bcrypt (salt rounds: 12)
  3. Create user in database
  4. Generate JWT token
- Output: `{ user, accessToken }`

### 2. Login
**Endpoint:** `POST /auth/login`
- Input: `{ email: string, password: string }`
- Process:
  1. Find user by email
  2. Compare provided password with hashed password (bcrypt)
  3. Generate JWT token
- Output: `{ user, accessToken }`

### 3. JWT Token Structure
```
Header: { alg: 'HS256', typ: 'JWT' }
Payload: { sub: userId, email: userEmail, iat, exp }
Signature: HMAC-SHA256(secret)
```

### 4. Protected Routes
- Guard: `JwtAuthGuard` (validates token from Authorization header)
- Decorator: `@ReqUser()` (extracts decoded token as user object)
- Applied to: GET /users/me, GET/POST/PATCH/DELETE /tasks routes

---

## 📡 API Endpoints

### Authentication

#### Register New Account
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response (201):
{
  "user": {
    "id": "cuid_string",
    "email": "user@example.com",
    "createdAt": "2026-04-02T03:32:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "user": {
    "id": "cuid_string",
    "email": "user@example.com",
    "createdAt": "2026-04-02T03:32:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Users

#### Get Current User Profile
```http
GET /users/me
Authorization: Bearer <accessToken>

Response (200):
{
  "userId": "cuid_string",
  "email": "user@example.com"
}
```

### Tasks (All require JWT authentication)

#### List User's Tasks
```http
GET /tasks
Authorization: Bearer <accessToken>

Response (200):
[
  {
    "id": "task_cuid",
    "title": "Learn NestJS",
    "done": false,
    "createdAt": "2026-04-02T03:32:00Z",
    "updatedAt": "2026-04-02T03:32:00Z",
    "userId": "user_cuid"
  }
]
```

#### Create Task
```http
POST /tasks
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "New task description",
  "done": false
}

Response (201):
{
  "id": "task_cuid",
  "title": "New task description",
  "done": false,
  "createdAt": "2026-04-02T03:32:00Z",
  "updatedAt": "2026-04-02T03:32:00Z",
  "userId": "user_cuid"
}
```

#### Get Task by ID
```http
GET /tasks/:id
Authorization: Bearer <accessToken>

Response (200):
{
  "id": "task_cuid",
  "title": "Task description",
  "done": false,
  "createdAt": "2026-04-02T03:32:00Z",
  "updatedAt": "2026-04-02T03:32:00Z",
  "userId": "user_cuid"
}

Error (403): { "message": "Forbidden" } # Task belongs to other user
Error (404): { "message": "Task not found" }
```

#### Update Task
```http
PATCH /tasks/:id
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "title": "Updated task",
  "done": true
}

Response (200):
{
  "id": "task_cuid",
  "title": "Updated task",
  "done": true,
  "createdAt": "2026-04-02T03:32:00Z",
  "updatedAt": "2026-04-02T03:32:01Z",
  "userId": "user_cuid"
}
```

#### Delete Task
```http
DELETE /tasks/:id
Authorization: Bearer <accessToken>

Response (200):
{ "deleted": true }
```

---

## 🌱 Database Seeding

### Seeded Data (3 Users with 9 Tasks)

**Users:**
1. alice@example.com / password: password123
2. bob@example.com / password: securepass456
3. charlie@example.com / password: testpass789

**Alice's Tasks (4):**
- ✅ Learn NestJS fundamentals (completed)
- ✅ Build REST API with Prisma (completed)
- ⬜ Implement JWT authentication (pending)
- ⬜ Write unit tests (pending)

**Bob's Tasks (3):**
- ✅ Set up Docker environment (completed)
- ✅ Configure PostgreSQL database (completed)
- ⬜ Deploy to production (pending)

**Charlie's Tasks (2):**
- ⬜ Review code quality (pending)
- ⬜ Optimize database queries (pending)

### Run Seeding
```bash
# One-time seed
npm run db:seed

# Reset database and reseed
npm run db:reset
```

---

## 🔧 Key Service Implementations

### PrismaService (Single-Instance Pattern)
```typescript
// Exposes Prisma operations via getters
get user() { return this.client.user; }
get task() { return this.client.task; }
$transaction = () => { ... }
$disconnect = () => { ... }
```

### AuthService
```typescript
async register(email, password)    // Create user + JWT
async login(email, password)       // Verify credentials + JWT
private async signToken(userId, email) // JWT generation
```

### TasksService
```typescript
create(userId, data)               // Create task for user
list(userId)                       // Get user's tasks (sorted DESC)
get(userId, taskId)                // Get task with ownership check
update(userId, taskId, data)       // Update task for user
remove(userId, taskId)             // Delete task for user
```

---

## 🚀 Development Workflow

### Start Development Server
```bash
npm run start:dev  # Watch mode on localhost:3000
```

### Build for Production
```bash
npm run build      # Compile TypeScript to dist/
npm run start:prod # Run compiled app
```

### Database Management
```bash
npx prisma generate        # Generate Prisma Client
npx prisma migrate dev     # Create + apply migration
npx prisma migrate reset   # Drop database and reseed
npx prisma studio         # Visual database explorer
```

### Linting & Testing
```bash
npm run lint        # Fix ESLint errors
npm test            # Run Jest unit tests
npm run test:e2e    # Run end-to-end tests
npm run test:cov    # Generate coverage report
```

---

## 🐛 Design Decisions & Rationale

### 1. Prisma v5 (vs v7)
- **Why**: v5 is production-stable for this use case
- **v7 Issues**: Requires `accelerateUrl` or `adapter` configuration (enterprise features)
- **Composition Pattern**: Avoid PrismaClient inheritance due to constructor requirements

### 2. JWT Authentication (vs Sessions)
- **Why**: Stateless, scalable across multiple servers
- **Token Format**: `Authorization: Bearer <token>` header
- **Secret Storage**: Environment variable `JWT_SECRET`

### 3. Module-Based Architecture
- **Why**: Follows NestJS best practices for scalability
- **Benefits**: Independent feature modules, testable, maintainable
- **Global Providers**: PrismaModule, ConfigModule, JwtModule

### 4. Bcrypt (vs other hashing)
- **Why**: Industry standard, adaptive salt rounds
- **Salt Rounds**: 12 (CPU-intensive, slower brute-force)

### 5. Zod + class-validator
- **Why**: Runtime validation at multiple layers
- **Zod**: Environment variable validation
- **class-validator**: Request DTO validation

---

## 📊 Performance Considerations

### 1. Database Indexing
- Task.userId indexed for fast user task lookups: `@@index([userId])`

### 2. Cascade Delete
- Deleting user automatically deletes their tasks (referential integrity)

### 3. Task Sorting
- Tasks sorted `DESC` by createdAt (newest first)

### 4. Password Hashing
- Bcrypt with 12 salt rounds prevents rainbow table attacks

### 5. JWT Caching
- Token cached in client; server validates signature only

---

## 🔒 Security Features

### 1. Password Security
- ✅ Bcrypt hashing (never store plaintext)
- ✅ Salt rounds: 12 (adaptive, CPU-intensive)

### 2. Authentication
- ✅ JWT tokens signed with secret key
- ✅ Stateless (server doesn't store sessions)
- ✅ Token expiration (configurable)

### 3. Authorization
- ✅ JwtAuthGuard protects routes
- ✅ Ownership checks prevent unauthorized task access
- ✅ CascadeDelete prevents orphaned records

### 4. Input Validation
- ✅ Email format validation (unique constraint)
- ✅ Password length validation
- ✅ DTO validation with class-validator

### 5. Environment Secrets
- ✅ JWT_SECRET, DATABASE_URL from .env
- ✅ Zod validation ensures required secrets present

---

## 🧪 Testing Strategy

### Unit Tests (Recommended)
```typescript
// AuthService tests
✅ register() - success path
✅ register() - duplicate email error
✅ login() - valid credentials
✅ login() - invalid password error
✅ signToken() - JWT generation

// TasksService tests
✅ create() - create task for user
✅ list() - return user's tasks
✅ get() - ownership validation
✅ update() - authorization check
✅ remove() - ownership validation
```

### E2E Tests (Integration Testing)
```typescript
// Full API workflows
✅ Register → Login → Create Task → List Tasks
✅ Multiple users isolation (tasks)
✅ JWT token expiration
```

---

## 🚨 Error Handling

### Validation Errors (400)
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "..."
}
```

### Unauthorized (401)
```json
{
  "message": "Invalid credentials"
}
```

### Forbidden (403)
```json
{
  "message": "Forbidden"
}
```

### Not Found (404)
```json
{
  "message": "Task not found"
}
```

### Server Error (500)
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

---

## 🛣️ Future Enhancements

1. **Pagination**: Add limit/offset to task listings
2. **Filtering**: Filter tasks by done status
3. **Soft Delete**: Archive tasks instead of hard delete
4. **Refresh Tokens**: Add token refresh mechanism
5. **Rate Limiting**: Prevent brute-force attacks
6. **Logging**: Structured logging (Winston, Pino)
7. **Caching**: Redis for frequently accessed data
8. **File Uploads**: Attach images/files to tasks
9. **Real-time**: WebSocket for live task updates
10. **OAuth**: Google/GitHub authentication

---

## 📚 Useful Commands

```bash
# Development
npm run start:dev              # Start dev server on 3000

# Database
npm run db:seed               # Apply seed data
npm run db:reset              # Drop and reseed database

# Code Quality
npm run lint                  # Fix ESLint issues
npm test                      # Run Jest tests
npm run test:cov              # Coverage report

# Build & Deploy
npm run build                 # TypeScript compilation
npm run start:prod            # Run production build

# Database Management
npx prisma studio            # Open Prisma Studio
npx prisma migrate dev        # Create new migration
npx prisma generate          # Regenerate Prisma Client
```

---

## 🔗 References

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Bcrypt RFC 2898](https://tools.ietf.org/html/rfc2898)

---

**Last Updated:** April 2, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
