import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { users, User, NewUser } from '../database/schema';

/**
 * UsersRepository — the ONLY class that writes Drizzle queries for the users table.
 *
 * Rule: no business logic here. Call DB, return typed rows.
 * Services decide what to do; repositories decide how to store/retrieve.
 */
@Injectable()
export class UsersRepository {
  constructor(
    // Symbol token injection — matches the DRIZZLE provider in DatabaseModule
    @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * SQL: SELECT * FROM users
   */
  findAll(): Promise<User[]> {
    return this.db.select().from(users);
  }

  /**
   * SQL: SELECT * FROM users WHERE id = $1
   * Returns undefined if no row matches — caller must handle this.
   */
  async findById(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * SQL: SELECT * FROM users WHERE email = $1
   */
  async findByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  /**
   * SQL: INSERT INTO users (name, email, created_at, updated_at) VALUES ($1, $2, now(), now())
   *      RETURNING *
   *
   * .returning() fetches the inserted row (with generated id, timestamps) in one round-trip.
   */
  async create(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  /**
   * SQL: UPDATE users SET name = $1, updated_at = $2 WHERE id = $3 RETURNING *
   * Returns undefined if no row was updated (id not found).
   */
  async update(id: number, data: Partial<NewUser>): Promise<User | undefined> {
    const [user] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })  // always stamp updated_at
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  /**
   * SQL: DELETE FROM users WHERE id = $1 RETURNING id
   * Returns true if a row was deleted, false if id not found.
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });  // select only id — minimise data returned
    return result.length > 0;
  }
}
