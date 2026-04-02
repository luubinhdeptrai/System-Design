# 🧪 API Testing Guide - cURL Examples

This guide provides ready-to-use cURL commands to test all API endpoints. The app should be running on `localhost:3000`.

## ⚙️ Prerequisites

- Backend running: `npm run start:dev`
- Database seeded: `npm run db:seed`
- Demo credentials available (see below)

---

## 🔐 Demo Credentials

Use these credentials for testing. They are pre-seeded in the database.

| Email | Password | Tasks |
|-------|----------|-------|
| alice@example.com | password123 | 4 tasks |
| bob@example.com | securepass456 | 3 tasks |
| charlie@example.com | testpass789 | 2 tasks |

---

## 1️⃣ Authentication Endpoints

### Register New Account

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "MySecurePassword123"
  }'
```

**Expected Response (201):**
```json
{
  "user": {
    "id": "cuid_string",
    "email": "newuser@example.com",
    "createdAt": "2026-04-02T04:15:30.123Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Login with Credentials

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }'
```

**Expected Response (200):**
```json
{
  "user": {
    "id": "user_cuid",
    "email": "alice@example.com",
    "createdAt": "2026-04-02T03:32:08.000Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**⚠️ Save the `accessToken`** - you'll need it for protected endpoints!

---

## 2️⃣ User Endpoints

### Get Current User Profile

```bash
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "userId": "user_cuid",
  "email": "alice@example.com"
}
```

**Error (401) - Invalid/missing token:**
```json
{
  "message": "Unauthorized",
  "statusCode": 401
}
```

---

## 3️⃣ Task Management Endpoints

### Get All Tasks for Current User

```bash
curl -X GET http://localhost:3000/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response (200):**
```json
[
  {
    "id": "task_cuid_1",
    "title": "Learn NestJS fundamentals",
    "done": true,
    "createdAt": "2026-04-02T03:32:08.000Z",
    "updatedAt": "2026-04-02T03:32:08.000Z",
    "userId": "user_cuid"
  },
  {
    "id": "task_cuid_2",
    "title": "Build REST API with Prisma",
    "done": true,
    "createdAt": "2026-04-02T03:32:08.000Z",
    "updatedAt": "2026-04-02T03:32:08.000Z",
    "userId": "user_cuid"
  },
  {
    "id": "task_cuid_3",
    "title": "Implement JWT authentication",
    "done": false,
    "createdAt": "2026-04-02T03:32:08.000Z",
    "updatedAt": "2026-04-02T03:32:08.000Z",
    "userId": "user_cuid"
  }
]
```

---

### Create New Task

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My new task",
    "done": false
  }'
```

**Expected Response (201):**
```json
{
  "id": "new_task_cuid",
  "title": "My new task",
  "done": false,
  "createdAt": "2026-04-02T04:15:30.123Z",
  "updatedAt": "2026-04-02T04:15:30.123Z",
  "userId": "user_cuid"
}
```

---

### Get Single Task by ID

```bash
curl -X GET http://localhost:3000/tasks/TASK_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "id": "TASK_ID_HERE",
  "title": "Learn NestJS fundamentals",
  "done": true,
  "createdAt": "2026-04-02T03:32:08.000Z",
  "updatedAt": "2026-04-02T03:32:08.000Z",
  "userId": "user_cuid"
}
```

**Error (404) - Task not found:**
```json
{
  "message": "Task not found",
  "statusCode": 404
}
```

**Error (403) - Accessing another user's task:**
```json
{
  "message": "Forbidden",
  "statusCode": 403
}
```

---

### Update Task

```bash
curl -X PATCH http://localhost:3000/tasks/TASK_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated task title",
    "done": true
  }'
```

**Expected Response (200):**
```json
{
  "id": "TASK_ID_HERE",
  "title": "Updated task title",
  "done": true,
  "createdAt": "2026-04-02T03:32:08.000Z",
  "updatedAt": "2026-04-02T04:15:40.123Z",
  "userId": "user_cuid"
}
```

---

### Delete Task

```bash
curl -X DELETE http://localhost:3000/tasks/TASK_ID_HERE \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

**Expected Response (200):**
```json
{
  "deleted": true
}
```

---

## 📋 Complete Testing Workflow

This workflow demonstrates the full application flow:

### Step 1: Register a New User

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123"
  }' > response.json

# Extract token (manually or using jq)
TOKEN=$(jq -r '.accessToken' response.json)
echo "Token: $TOKEN"
```

### Step 2: Get User Profile

```bash
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Step 3: Create a Task

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First task",
    "done": false
  }' > task1.json

TASK_ID=$(jq -r '.id' task1.json)
echo "Task ID: $TASK_ID"
```

### Step 4: List All Tasks

```bash
curl -X GET http://localhost:3000/tasks \
  -H "Authorization: Bearer $TOKEN"
```

### Step 5: Get Specific Task

```bash
curl -X GET http://localhost:3000/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Step 6: Update Task (Mark as Done)

```bash
curl -X PATCH http://localhost:3000/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First task COMPLETED",
    "done": true
  }'
```

### Step 7: Delete Task

```bash
curl -X DELETE http://localhost:3000/tasks/$TASK_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔑 Token Management

### Storing Token in Variable

```bash
# Login and extract token
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }' | jq -r '.accessToken')

# Use token in subsequent requests
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### Long-lived Token (Bash Script)

```bash
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
BASE_URL="http://localhost:3000"
EMAIL="alice@example.com"
PASSWORD="password123"

# Login
echo -e "${YELLOW}Logging in...${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

TOKEN=$(echo $RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" == "null" ]; then
  echo -e "${RED}Login failed!${NC}"
  exit 1
fi

echo -e "${GREEN}Login successful!${NC}"
echo -e "${YELLOW}Token: $TOKEN${NC}"

# Get user profile
echo -e "\n${YELLOW}Fetching user profile...${NC}"
curl -s -X GET $BASE_URL/users/me \
  -H "Authorization: Bearer $TOKEN" | jq .

# List tasks
echo -e "\n${YELLOW}Fetching tasks...${NC}"
curl -s -X GET $BASE_URL/tasks \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## ⚠️ Common Errors & Solutions

### 401 Unauthorized

**Cause**: Missing or invalid token

**Solution**:
```bash
# Make sure token is included
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" ...

# Get a new token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "password123"}'
```

### 403 Forbidden

**Cause**: Trying to access another user's task

**Solution**:
- Each user can only access/modify their own tasks
- Login as the task owner to modify it

### 404 Not Found

**Cause**: Invalid task ID or task doesn't exist

**Solution**:
```bash
# List tasks to get valid IDs
curl -X GET http://localhost:3000/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 400 Bad Request

**Cause**: Invalid email format or missing required fields

**Solution**:
```bash
# Ensure email Format and all required fields
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "valid@example.com",
    "password": "SecurePass123"
  }'
```

---

## 🎯 Testing Tips

### 1. Use jq for JSON Parsing
```bash
# Format JSON output nicely
curl -s http://localhost:3000/tasks | jq .

# Extract specific value
TOKEN=$(curl -s http://localhost:3000/auth/login ... | jq -r '.accessToken')
```

### 2. Save Responses to Files
```bash
curl -s http://localhost:3000/tasks > tasks.json
cat tasks.json | jq .
```

### 3. Test with Different Users
```bash
# Get token for alice
ALICE_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -d '{"email": "alice@example.com", "password": "password123"}' | jq -r '.accessToken')

# Get token for bob
BOB_TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -d '{"email": "bob@example.com", "password": "securepass456"}' | jq -r '.accessToken')

# Verify task isolation
curl -X GET http://localhost:3000/tasks -H "Authorization: Bearer $ALICE_TOKEN"
curl -X GET http://localhost:3000/tasks -H "Authorization: Bearer $BOB_TOKEN"
```

### 4. Monitor Server Logs
```bash
# In a separate terminal, watch dev server logs
npm run start:dev
```

---

## 📊 Performance Testing

### Load Testing with Apache Bench

```bash
# 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3000/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Load Testing with wrk

```bash
wrk -t4 -c100 -d30s \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/tasks
```

---

## 🐛 Debugging

### Enable Verbose Curl Output
```bash
curl -v -X GET http://localhost:3000/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Database Directly
```bash
# Open Prisma Studio
npx prisma studio

# View data in visual UI at http://localhost:5555
```

### Check Server Logs
```bash
# Dev server shows request logs automatically
npm run start:dev
```

---

## 📝 Notes

- **Tokens expire based on JWT secret configuration** (check `src/config/env.ts`)
- **All passwords are hashed with bcrypt** - never send plaintext in production
- **Tasks are filtered by user ID** - complete data isolation
- **Timestamps are in UTC ISO format**
- **DELETE is permanent** - deleted tasks cannot be recovered

---

**Last Updated:** April 2, 2026  
**API Version:** 1.0.0  
**Status:** ✅ Ready for Testing
