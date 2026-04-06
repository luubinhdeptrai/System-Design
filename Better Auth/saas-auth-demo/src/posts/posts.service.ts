import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../db";
import { post, user } from "../db/schema";
import type { Post, NewPost } from "../db/schema";

@Injectable()
export class PostsService {
  findAll() {
    return db
      .select({
        id: post.id,
        title: post.title,
        content: post.content,
        createdAt: post.createdAt,
        author: {
          id: user.id,
          name: user.name,
        },
      })
      .from(post)
      .leftJoin(user, eq(post.authorId, user.id))
      .orderBy(post.createdAt);
  }

  async findById(id: string): Promise<Post | null> {
    const rows = await db
      .select()
      .from(post)
      .where(eq(post.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(data: Omit<NewPost, "id">): Promise<Post> {
    const rows = await db
      .insert(post)
      .values({ id: randomUUID(), ...data })
      .returning();
    return rows[0];
  }

  async delete(id: string): Promise<void> {
    await db.delete(post).where(eq(post.id, id));
  }
}
