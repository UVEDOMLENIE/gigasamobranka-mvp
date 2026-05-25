/**
 * Применяем SQL-миграции через @libsql/client.
 * Запускать: node scripts/migrate.mjs
 * Добавь в package.json: "db:migrate": "node scripts/migrate.mjs"
 */
import { createClient } from '@libsql/client';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dir, '..', 'lib', 'db', 'migrations');

const url = process.env.DATABASE_URL ?? 'file:./local.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;

const client = createClient({ url, authToken });

// Создаём таблицу для трекинга миграций
await client.execute(`
  CREATE TABLE IF NOT EXISTS __migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at INTEGER DEFAULT (unixepoch()) NOT NULL
  )
`);

const applied = new Set(
  (await client.execute('SELECT name FROM __migrations')).rows.map(r => r.name)
);

const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

for (const file of files) {
  if (applied.has(file)) {
    console.log(`[skip] ${file}`);
    continue;
  }

  const sql = readFileSync(join(migrationsDir, file), 'utf-8');
  // drizzle разделяет стейтменты через "--> statement-breakpoint"
  const statements = sql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(Boolean);

  console.log(`[apply] ${file} (${statements.length} statements)`);
  for (const stmt of statements) {
    await client.execute(stmt);
  }

  await client.execute({
    sql: 'INSERT INTO __migrations (name) VALUES (?)',
    args: [file],
  });
  console.log(`[done] ${file}`);
}

console.log('Migration complete.');
await client.close?.();
