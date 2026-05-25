import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Набор карточек, созданный учителем.
 * ownerKey — анонимный идентификатор учителя из HttpOnly cookie `gs_owner`.
 */
export const sets = sqliteTable(
  "sets",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    subject: text("subject"),
    grade: text("grade"),
    topic: text("topic"),
    /** JSON со настройками плеера: shuffle, timerSec, ... */
    settings: text("settings").default("{}").notNull(),
    createdAt: integer("created_at")
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    ownerIdx: index("sets_owner_idx").on(t.ownerKey),
  }),
);

/** Одна карточка в наборе. position нумеруется с 0, drag-reorder обновляет порядок. */
export const cards = sqliteTable(
  "cards",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    source: text("source"),
    difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }),
  },
  (t) => ({
    setIdx: index("cards_set_idx").on(t.setId),
  }),
);

/** Прохождение набора одним учеником. studentName — свободная строка (имя/ник без регистрации). */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    setId: text("set_id")
      .notNull()
      .references(() => sets.id, { onDelete: "cascade" }),
    studentName: text("student_name").notNull(),
    startedAt: integer("started_at")
      .notNull()
      .default(sql`(unixepoch())`),
    finishedAt: integer("finished_at"),
  },
  (t) => ({
    setIdx: index("sessions_set_idx").on(t.setId),
  }),
);

/** Ответ ученика на конкретную карточку в рамках сессии. */
export const answers = sqliteTable(
  "answers",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    known: integer("known", { mode: "boolean" }).notNull(),
    timeMs: integer("time_ms").notNull(),
    answeredAt: integer("answered_at")
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => ({
    sessionIdx: index("answers_session_idx").on(t.sessionId),
  }),
);

export type SetRow = typeof sets.$inferSelect;
export type SetInsert = typeof sets.$inferInsert;
export type CardRow = typeof cards.$inferSelect;
export type CardInsert = typeof cards.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type SessionInsert = typeof sessions.$inferInsert;
export type AnswerRow = typeof answers.$inferSelect;
export type AnswerInsert = typeof answers.$inferInsert;
