import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load .env before drizzle-kit reads it (drizzle-kit runs outside NestJS)
dotenv.config();

export default {
  // Where your TypeScript schema files live
  schema: './src/database/schema',

  // Where generated migration SQL files will be written
  out: './migrations',

  // Target database dialect
  dialect: 'postgresql',

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
