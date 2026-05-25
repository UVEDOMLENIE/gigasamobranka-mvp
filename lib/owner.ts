import "server-only";
import { cookies } from "next/headers";
import { shortKey } from "./id";

const COOKIE_NAME = () => process.env.OWNER_KEY_COOKIE_NAME ?? "gs_owner";

/** Читает owner_key из cookie. Возвращает null если cookie отсутствует. */
export async function readOwnerKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME())?.value ?? null;
}

/**
 * Возвращает существующий owner_key или генерит и проставляет новый.
 * Использовать в Server Actions / Route Handlers (там cookies можно записывать).
 */
export async function getOrCreateOwnerKey(): Promise<string> {
  const store = await cookies();
  const name = COOKIE_NAME();
  const existing = store.get(name)?.value;
  if (existing) return existing;
  const key = shortKey();
  store.set(name, key, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return key;
}
