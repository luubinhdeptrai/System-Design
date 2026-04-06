import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// BETTER AUTH CORE TABLES
// These field names and types are required by Better Auth.
// Do NOT rename columns — Better Auth's Drizzle adapter maps to them directly.
// Generate + apply migrations: npm run db:generate && npm run db:migrate
// ---------------------------------------------------------------------------

/**
 * Canonical identity record.
 * One row per human. Does NOT store passwords (see `account`).
 */
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * One row per authentication method per user.
 *
 * Examples:
 *   { userId: 'abc', providerId: 'credential', password: '$argon2...' }
 *   { userId: 'abc', providerId: 'google',     accountId: '1234567890' }
 *
 * A user can have multiple rows here (linked accounts).
 * Passwords are stored ONLY here, never on the `user` table.
 */
export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(), // 'credential' | 'google' | 'github'
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"), // Argon2id hash — only set when providerId = 'credential'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * One active login per browser/device.
 * The session cookie contains only `token` (an opaque string).
 * All actual session data (userId, expiry, IP) lives here.
 */
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

/**
 * Short-lived purpose-specific tokens.
 * Used for: magic links, email verification, password resets.
 * Lifecycle: created → emailed → clicked → verified → DELETED.
 */
export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(), // email address or action key
  value: text("value").notNull(),           // the secret token
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------------------------
// APPLICATION TABLES
// ---------------------------------------------------------------------------

/**
 * Example business-logic table — completely separate from auth tables.
 * Demonstrates how your own data references better-auth's user.id.
 */
export const post = pgTable("post", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: text("author_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Export all table types for Drizzle inference
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Session = typeof session.$inferSelect;
export type Post = typeof post.$inferSelect;
export type NewPost = typeof post.$inferInsert;
