import "server-only";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { restoreDb } from "./blob-sync";

/**
 * Один клиент БД для dev и prod.
 *   - Локально: DATABASE_URL=file:./local.db (libsql работает с локальным файлом, без native compile)
 *   - Prod (Vercel serverless): file:/tmp/local.db + restore from Vercel Blob
 *   - Prod (Turso): DATABASE_URL=libsql://<name>.turso.io  + DATABASE_AUTH_TOKEN
 * better-sqlite3 не используем сознательно: native build боится кириллицы/`!` в пути и Vercel-serverless.
 */
type Db = ReturnType<typeof drizzle<typeof schema>>;

let cached: Db | null = null;
let cachedClient: Client | null = null;
let migrated = false;

function buildClient(): Client {
  let url = process.env.DATABASE_URL ?? "file:./local.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;
  // Vercel serverless: /tmp доступен для записи
  if (process.env.VERCEL && !url.startsWith("libsql://")) {
    url = "file:/tmp/local.db";
  }
  return createClient({ url, authToken });
}

async function autoMigrate(client: Client) {
  if (migrated) return;
  migrated = true;
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sets (
      id TEXT PRIMARY KEY,
      owner_key TEXT NOT NULL,
      subject TEXT,
      grade TEXT,
      topic TEXT,
      settings TEXT DEFAULT '{}' NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()) NOT NULL,
      updated_at INTEGER DEFAULT (unixepoch()) NOT NULL
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      set_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      source TEXT,
      difficulty TEXT
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      set_id TEXT NOT NULL,
      student_name TEXT NOT NULL,
      started_at INTEGER DEFAULT (unixepoch()) NOT NULL,
      finished_at INTEGER
    )
  `);
  await client.execute(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      card_id TEXT NOT NULL,
      known INTEGER NOT NULL,
      time_ms INTEGER NOT NULL,
      answered_at INTEGER DEFAULT (unixepoch()) NOT NULL
    )
  `);
  await client.execute(`CREATE INDEX IF NOT EXISTS sets_owner_idx ON sets(owner_key)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS cards_set_idx ON cards(set_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS sessions_set_idx ON sessions(set_id)`);
  await client.execute(`CREATE INDEX IF NOT EXISTS answers_session_idx ON answers(session_id)`);
}

export async function getDb(): Promise<Db> {
  if (!cached) {
    if (process.env.VERCEL) await restoreDb();
    cachedClient = buildClient();
    await autoMigrate(cachedClient);
    cached = drizzle(cachedClient, { schema });
  }
  return cached;
}

export async function getRawClient(): Promise<Client> {
  if (!cachedClient) {
    if (process.env.VERCEL) await restoreDb();
    cachedClient = buildClient();
    await autoMigrate(cachedClient);
  }
  return cachedClient;
}

export { schema };
