import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Injection token for the Drizzle client.
 *
 * Using a Symbol (not a string) prevents naming collisions across modules.
 * Usage in any repository:
 *   @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>
 */
export const DRIZZLE = Symbol('DRIZZLE');

/**
 * DatabaseModule — @Global() so it never needs to be imported by feature modules.
 *
 * Registers a single Drizzle client backed by one pg.Pool.
 * The pool is shared across all requests — never create a new Pool per request.
 */
@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (config: ConfigService) => {
        const pool = new Pool({
          connectionString: config.get<string>('DATABASE_URL'),
          max: 10,                    // max concurrent DB connections
          idleTimeoutMillis: 30_000,  // close idle connections after 30s
          connectionTimeoutMillis: 5_000,   
        });

        // Passing { schema } enables:
        //  1. db.query.* relational API
        //  2. Correct TypeScript type inference for joined queries
        return drizzle(pool, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
