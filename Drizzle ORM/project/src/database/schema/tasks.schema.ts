import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';

/**
 * tasks table definition.
 *
 * FK: user_id → users.id  (ON DELETE CASCADE)
 * When a user is deleted, all their tasks are deleted automatically.
 */
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),                        // nullable — no .notNull()
  completed: boolean('completed').default(false).notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),  // FK with cascade
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Full row type — what SELECT returns:
 * { id: number; title: string; description: string | null; completed: boolean;
 *   userId: number; createdAt: Date; updatedAt: Date }
 */
export type Task = typeof tasks.$inferSelect;

/**
 * Insert input type — what INSERT accepts:
 * { title: string; userId: number; description?: string | null;
 *   completed?: boolean; id?: number; createdAt?: Date; updatedAt?: Date }
 */
export type NewTask = typeof tasks.$inferInsert;
