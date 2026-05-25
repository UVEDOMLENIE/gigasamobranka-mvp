import { randomUUID } from "node:crypto";

/** UUID v4 строкой. Используется для setId, cardId, sessionId, answerId. */
export function uuid(): string {
  return randomUUID();
}

/** Короткий ownerKey для анонимного учителя — UUID без дефисов. */
export function shortKey(): string {
  return randomUUID().replace(/-/g, "");
}
