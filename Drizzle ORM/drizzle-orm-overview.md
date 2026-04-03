# Drizzle ORM

Drizzle ORM is a TypeScript-first ORM and SQL toolkit that stays close to raw SQL while giving you strong types, composable queries, and a lightweight runtime. It is designed for developers who want the ergonomics of an ORM without hiding how the database actually works.

## 1. Schema Definition

Drizzle schemas are defined in TypeScript. You describe tables, columns, constraints, defaults, indexes, and relations using database-specific core packages such as PostgreSQL, MySQL, or SQLite.

Typical schema responsibilities:

- Define tables and columns
- Set primary keys and foreign keys
- Add constraints like `not null`, `unique`, and default values
- Describe relations between tables

Example shape:

```ts
import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  authorId: integer('author_id').notNull(),
});
```

Because the schema lives in TypeScript, it becomes the central source of truth for both runtime queries and static types.

## 2. Query Building

Drizzle provides a typed query builder. You compose SQL-like operations in TypeScript, and Drizzle infers the result types from your schema.

Common operations:

- `select()` for reads
- `insert()` for creating rows
- `update()` for modifying rows
- `delete()` for removing rows
- `where()`, `orderBy()`, `limit()`, joins, and aggregations for query logic

Example:

```ts
const result = await db
  .select()
  .from(users)
  .where(eq(users.id, 1));
```

This feels close to SQL, but the column names, operators, and returned data remain type-checked.

## 3. Type Safety

Type safety is one of Drizzle's main strengths.

What that means in practice:

- Table definitions generate accurate TypeScript types
- Query results are inferred automatically
- Invalid column references are caught at compile time
- Insert and update payloads can be typed from the schema
- Database changes surface as TypeScript errors instead of runtime surprises

This gives a workflow where your editor and compiler help enforce consistency between application code and database structure.

## 4. Migrations

Drizzle works with migrations through `drizzle-kit`.

Main migration tasks:

- Generate migration files from schema changes
- Apply migrations to the database
- Keep schema evolution explicit and versioned

Typical flow:

1. Update schema files in TypeScript.
2. Generate a migration with Drizzle Kit.
3. Review the SQL migration.
4. Run the migration against the target database.

This separates schema design from database evolution, which is important for team workflows and production deployments.

## 5. Database Drivers

Drizzle itself is not the database driver. It sits on top of a database driver or serverless client.

Common pairings include:

- PostgreSQL drivers such as `pg`
- MySQL drivers such as `mysql2`
- SQLite drivers such as `better-sqlite3`
- Serverless adapters for platforms like Neon, PlanetScale, Turso, and others

You usually:

1. Install the Drizzle package for your dialect.
2. Install the underlying driver.
3. Create a driver connection.
4. Pass that connection into `drizzle(...)` to create the ORM client.

Conceptually:

```ts
const client = /* database driver connection */;
const db = drizzle(client);
```

So the driver handles communication with the database, while Drizzle handles typed schema-aware querying.

## 6. Relations and Higher-Level Modeling

Beyond raw tables, Drizzle can describe relations between entities so you can model connected data more clearly. This helps when structuring joins and keeping your domain model understandable.

Relations are not magic runtime objects in the style of heavier ORMs. Drizzle stays more explicit, which keeps SQL behavior easier to reason about.

## 7. How the Pieces Connect

In a typical application, the components connect like this:

1. You define tables and relations in schema files.
2. Those schema definitions become the type source for your app.
3. You generate and run migrations so the actual database matches the schema.
4. You create a database connection using a driver.
5. You initialize Drizzle with that driver connection.
6. Your services, API handlers, or repositories use the Drizzle `db` object to run typed queries.
7. Query results flow back into your application with inferred types.

## 8. Typical Application Workflow

A common end-to-end workflow looks like this:

### Development

- Define or change tables in the schema
- Generate a migration
- Apply the migration locally
- Write application queries against the `db` client
- Let TypeScript catch schema/query mismatches early

### Runtime

- App starts
- Database driver creates a connection or pool
- Drizzle wraps that connection
- Business logic executes typed queries
- Database returns rows through the driver
- Drizzle preserves the expected TypeScript shapes in application code

### Deployment

- Run migrations in staging or production
- Deploy the app using the same schema-aware query code
- Keep future database changes tracked through additional migrations

## 9. Why Developers Choose Drizzle

Drizzle is popular because it combines:

- Strong TypeScript inference
- SQL-like explicitness
- Low abstraction overhead
- Good support for modern serverless and edge-friendly drivers
- A clean workflow from schema to migration to runtime queries

## 10. Short Summary

Drizzle ORM is best understood as a typed layer between your TypeScript application and your SQL database:

- Schema definition describes database structure in TypeScript.
- Migrations turn schema changes into executable database updates.
- Database drivers provide the actual connection.
- Drizzle wraps that connection with a typed query builder.
- Type safety connects everything so schema, queries, and results stay aligned.

That is the core Drizzle model: define schema in code, migrate the database, connect through a driver, and query with strong static types.