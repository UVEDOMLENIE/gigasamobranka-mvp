# Roadmap — путь до сдачи хакатона

Дедлайн: ~2 дня от 2026-05-27.

## Спринты

| # | Название | Статус | Главная цель |
|---|----------|--------|--------------|
| S01 | Foundation | ✅ done | P0/P1 UI-задачи (footer, select, library, DOCX, тайминг) |
| S02 | Stability | 🔄 active | Починить LLM-нестабильность (retry, mock-fix, audit, deploy) |
| S03 | Polish & Submission | ⏳ pending | Презентация, скринкаст, карточка прототипа |

## Что должно быть на момент сдачи

1. **Живой URL** (Vercel) — открывается у жюри.
2. **Презентация** по 8-блочной структуре.
3. **Скринкаст** 5–7 мин.
4. **Карточка прототипа** заполнена.
5. **Репа публичная** с README и инструкцией — уже есть.

## Архитектура целиком (для презентации)

```
[Учитель в браузере]
        │
        ▼
   [Next.js App Router]
   ├─ /              форма генерации
   ├─ /sets/[id]     редактор
   ├─ /play/[id]     плеер (teacher + student)
   ├─ /library       мои наборы
   ├─ /settings      LLM-настройки
   └─ /api/
       ├─ /upload    парсинг файлов
       ├─ /generate  → Scarlex / GigaChat / mock
       ├─ /sets/...  CRUD + DOCX export
       └─ /sessions  трекинг прохождения
        │
        ▼
   [SQLite (local) / Turso (prod)]
        │
   таблицы: sets, cards, sessions, answers
```

## Технологии (для слайда)

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript, Tailwind 4
- Drizzle ORM + libsql (SQLite/Turso)
- KaTeX для формул в карточках
- LLM: Scarlex (OpenAI-compat) / GigaChat / умный mock
- Парсинг: pdf-parse, mammoth (docx), officeparser (pptx)
- Безопасность: cookie-based ownerKey + rate limit на пользователя
- Экспорт: DOCX (docx), HTML A4 (печать), персональные ссылки

## Риски (для слайда)

1. **LLM API нестабилен** — мы делаем fallback на умный mock + retry.
2. **Файлы могут не распарситься** — мягкие ошибки, генерация идёт по тексту.
3. **Деплой может упасть** — есть локальный fallback + Cloud Handoff в docs/.
