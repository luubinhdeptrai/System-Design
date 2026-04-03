import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { tasks } from './tasks.schema';

// Re-export everything so consumers only need one import:
// import * as schema from '../database/schema'   or
// import { users, tasks, User, Task, ... } from '../database/schema'
export * from './users.schema';
export * from './tasks.schema';

/**
 * Relations — defined here, AFTER both tables are imported, to prevent circular imports.
 *
 * IMPORTANT: relations() is NOT a database constraint.
 *  - The actual FK is enforced by PostgreSQL via .references() in tasks.schema.ts
 *  - relations() is metadata consumed by Drizzle's relational query API (db.query.*)
 *  - Without it, db.query.users.findMany({ with: { tasks: true } }) won't work
 */

// One user → many tasks
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
}));

// Many tasks → one user
export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],     // tasks.user_id column
    references: [users.id],     // references users.id
  }),
}));
