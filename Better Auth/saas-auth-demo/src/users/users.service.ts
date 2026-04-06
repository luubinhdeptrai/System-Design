import { Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { user, session } from "../db/schema";
import type { User } from "../db/schema";

@Injectable()
export class UsersService {
  /**
   * Find a user by their id.
   * Used to fetch the latest profile data (not the potentially-stale session copy).
   */
  async findById(id: string): Promise<User | null> {
    const rows = await db
      .select()
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * List all active sessions for a user.
   * Useful for a "manage devices" page where users can see and revoke sessions.
   */
  async getActiveSessions(userId: string) {
    return db
      .select({
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
      })
      .from(session)
      .where(eq(session.userId, userId))
      .orderBy(session.createdAt);
  }

  /**
   * Permanently delete a user and all associated data.
   * CASCADE on foreign keys removes their account rows, sessions, etc.
   */
  async deleteUser(id: string): Promise<void> {
    const rows = await db.delete(user).where(eq(user.id, id)).returning();
    if (rows.length === 0) {
      throw new NotFoundException(`User ${id} not found`);
    }
  }
}
