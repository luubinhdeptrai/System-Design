import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

/**
 * users table definition.
 *
 * Column builders simultaneously declare:
 *  - The PostgreSQL column type and constraints
 *  - The TypeScript types via $inferSelect / $inferInsert
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Full row type — what SELECT returns:
 * { id: number; name: string; email: string; createdAt: Date; updatedAt: Date }
 */
export type User = typeof users.$inferSelect;

/**
 * Insert input type — what INSERT accepts:
 * { name: string; email: string; id?: number; createdAt?: Date; updatedAt?: Date }
 * Auto-generated fields (id, timestamps) are optional.
 */
export type NewUser = typeof users.$inferInsert;
