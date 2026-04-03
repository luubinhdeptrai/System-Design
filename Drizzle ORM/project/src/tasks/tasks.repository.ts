import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { tasks, users, Task, NewTask } from '../database/schema';

/**
 * TasksRepository — all Drizzle queries for the tasks table.
 *
 * Rule: no business logic. Pure data access only.
 */
@Injectable()
export class TasksRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * SQL: SELECT * FROM tasks
   */
  findAll(): Promise<Task[]> {
    return this.db.select().from(tasks);
  }

  /**
   * SQL: SELECT * FROM tasks WHERE user_id = $1
   */
  findByUserId(userId: number): Promise<Task[]> {
    return this.db.select().from(tasks).where(eq(tasks.userId, userId));
  }

  /**
   * SQL: SELECT * FROM tasks WHERE id = $1
   */
  async findById(id: number): Promise<Task | undefined> {
    const [task] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  /**
   * JOIN query — returns the task with its author's basic profile.
   *
   * SQL:
   *   SELECT tasks.*, users.id, users.name, users.email
   *   FROM tasks
   *   LEFT JOIN users ON users.id = tasks.user_id
   *   WHERE tasks.id = $1
   *
   * Return shape: { task: Task, user: { id, name, email } | null }
   * The shape is statically typed — TypeScript infers it from the select() argument.
   */
  async findByIdWithUser(id: number) {
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
    return result;  // undefined if no matching task
  }

  /**
   * SQL: INSERT INTO tasks (...) VALUES (...) RETURNING *
   */
  async create(data: NewTask): Promise<Task> {
    const [task] = await this.db.insert(tasks).values(data).returning();
    return task;
  }

  /**
   * SQL: UPDATE tasks SET ... WHERE id = $1 RETURNING *
   */
  async update(id: number, data: Partial<NewTask>): Promise<Task | undefined> {
    const [task] = await this.db
      .update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  /**
   * SQL: DELETE FROM tasks WHERE id = $1 RETURNING id
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning({ id: tasks.id });
    return result.length > 0;
  }
}
