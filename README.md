# ГигаСамобранка — генератор учебных карточек

> Открыл учебник — карточки накрыли стол сами.

Хакатон СберОбразование, Кейс 2. MVP для учителя: загружает материалы → получает карточки → редактирует → даёт ссылку ученикам → видит результаты → печатает.

## Стек

- Next.js 16.2.6, React 19, Tailwind v4, TypeScript
- Drizzle ORM + `@libsql/client` (SQLite)
- KaTeX для формул
- LLM: mock-first; реальный через `/settings` (Scarlex V2 / GigaChat)

## Запуск

```bash
npm install
npm run db:migrate    # создать local.db
npm run dev           # localhost:3000
# или
npm run dev:lan       # 0.0.0.0:3000 для локалки
```

## Smoke test

```bash
npm run smoke
# или
SMOKE_BASE=http://localhost:3000 npm run smoke
```

## Демо-сценарий

1. Открыть `/`.
2. Кликнуть демо «Словарные слова: Зима».
3. Редактор → плеер → ссылка ученикам.
4. Ученик проходит → результаты → печать.

Подробнее: `docs/DEMO_SCRIPT.md`.

## Документация

- `docs/CLOUD_HANDOFF.md` — инструкция для Devin Cloud
- `docs/CURRENT_STATE.md` — что работает, что нет
- `docs/DEMO_SCRIPT.md` — сценарий проверки
- `docs/KNOWN_ISSUES.md` — известные проблемы
- `docs/ORG_REQUIREMENTS.md` — требования организаторов
- `AGENTS.md` — правила проекта

## Важно

- **NO real names** в коммитах, README, коде. Используй `UVEDOMLENIE`.
- API-ключи не хранить в коде. Вводить через `/settings` или `.env.local`.
- `.env.local` и `local.db` в `.gitignore`.
