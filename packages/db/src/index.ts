import { env } from "@enthu/env/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export function createDb() {
  const isNeon = env.DATABASE_URL.includes("neon.tech") || env.DATABASE_URL.includes("sslmode=require");
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  });
  return drizzle(pool, { schema });
}

export const db = createDb();
