import "server-only";
import { put, get } from "@vercel/blob";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const BLOB_PATH = "db.sqlite";
const LOCAL_DB_PATH = process.env.VERCEL ? "/tmp/local.db" : "./local.db";

/** Download db.sqlite from Vercel Blob into /tmp/local.db (prod) or ./local.db (dev) */
export async function restoreDb(): Promise<boolean> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  try {
    const result = await get(BLOB_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN, access: "public" });
    if (!result || result.statusCode === 304) return false;
    const chunks: Uint8Array[] = [];
    const reader = result.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks as unknown as Uint8Array[]);
    const dir = join(LOCAL_DB_PATH, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(LOCAL_DB_PATH, buffer);
    console.log("[blob-sync] Restored db from blob", buffer.length, "bytes");
    return true;
  } catch (e) {
    console.error("[blob-sync] restore failed:", e);
    return false;
  }
}

/** Upload /tmp/local.db (or ./local.db) to Vercel Blob */
export async function backupDb(): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    if (!existsSync(LOCAL_DB_PATH)) return;
    const buffer = readFileSync(LOCAL_DB_PATH);
    await put(BLOB_PATH, buffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    console.log("[blob-sync] Backed up db to blob", buffer.length, "bytes");
  } catch (e) {
    console.error("[blob-sync] backup failed:", e);
  }
}
