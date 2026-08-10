import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var _db: NodePgDatabase<typeof schema> | undefined;
}

function getPool(): Pool {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill in your PostgreSQL connection string.",
    );
  }
  if (!global._pgPool) {
    global._pgPool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    });
  }
  return global._pgPool;
}

// Cached across hot reloads (dev) and warm serverless invocations.
export function getDb(): NodePgDatabase<typeof schema> {
  if (!global._db) {
    global._db = drizzle(getPool(), { schema });
  }
  return global._db;
}

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
