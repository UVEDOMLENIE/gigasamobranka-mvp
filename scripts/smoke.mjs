#!/usr/bin/env node
/**
 * Smoke test для MVP.
 * Проверяет, что основной сценарий проходится через API.
 * Запуск: node scripts/smoke.mjs
 */

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";

async function req(path, opts = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, opts);
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}

function ok(label, condition) {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`);
    process.exitCode = 1;
  }
}

async function main() {
  console.log(`SMOKE_BASE=${BASE}`);

  // 1. Главная
  const home = await req("/");
  ok("Главная отвечает", home.status === 200);
  ok("Главная содержит 'ГигаСамобранка'", home.text.includes("ГигаСамобранка"));

  // 2. Демо
  const demo = await req("/api/demo?id=winter-vocab", { redirect: "manual" });
  ok("Демо редирект 303", demo.status === 303);
  const setUrl = demo.headers.get("location");
  ok("Демо location есть", !!setUrl);
  const setId = setUrl?.split("/sets/")?.[1];
  ok("Демо setId извлечён", !!setId);

  // 3. API набор
  const setData = await req(`/api/sets/${setId}`);
  ok("API набор отвечает", setData.status === 200);
  const setJson = JSON.parse(setData.text);
  ok("API набор has cards", Array.isArray(setJson.cards) && setJson.cards.length > 0);

  // 4. Генерация через API (mock)
  const gen = await req("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: "Тест",
      grade: "3",
      topic: "Тема",
      count: 2,
      difficulty: "medium",
      sources: [{ filename: "t.txt", text: "Слово — значение." }],
      llm: { provider: "mock" },
    }),
  });
  ok("Генерация отвечает", gen.status === 200);
  const genJson = JSON.parse(gen.text);
  ok("Генерация создала setId", !!genJson.setId);

  // 5. Сессия ученика
  const session = await req("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ setId: genJson.setId, studentName: "SmokeTest" }),
  });
  ok("Сессия создана", session.status === 200);
  const sessionJson = JSON.parse(session.text);
  ok("Сессия has sessionId", !!sessionJson.sessionId);

  // 6. Результаты
  const results = await req(`/api/sets/${genJson.setId}/results`);
  ok("Результаты отвечают", results.status === 200);

  // 7. Печать
  const printPage = await req(`/print/${genJson.setId}`);
  ok("Печать отвечает", printPage.status === 200);

  console.log("\n=== SMOKE OK ===");
}

main().catch((err) => {
  console.error("SMOKE FAILED:", err.message);
  process.exit(1);
});
