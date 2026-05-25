import "server-only";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Один клиент БД для dev и prod.
 *   - Локально: DATABASE_URL=file:./local.db (libsql работает с локальным файлом, без native compile)
 *   - Prod:     DATABASE_URL=libsql://<name>.turso.io  + DATABASE_AUTH_TOKEN
 * better-sqlite3 не используем сознательно: native build боится кириллицы/`!` в пути и Vercel-serverless.
 */
type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;
let cachedClient: Client | null = null;

function buildClient(): Client {
  const url = process.env.DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;
  return createClient({ url, authToken });
}

export function getDb(): Db {
  if (!cached) {
    cachedClient = buildClient();
    cached = drizzle(cachedClient, { schema });
  }
  return cached;
}

export function getRawClient(): Client {
  if (!cachedClient) {
    cachedClient = buildClient();
  }
  return cachedClient;
}

export { schema };
