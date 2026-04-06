import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

/**
 * Shared PostgreSQL connection pool.
 *
 * A pool (not a single client) is used so that:
 *   - Multiple concurrent requests can be served without waiting
 *   - Idle connections are reused, not opened fresh on each request
 *   - In multi-instance deployments, each instance has its own pool
 *     but all target the same PostgreSQL cluster
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,              // max concurrent connections per process
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

export const db = drizzle(pool, { schema });

export type DB = typeof db;
