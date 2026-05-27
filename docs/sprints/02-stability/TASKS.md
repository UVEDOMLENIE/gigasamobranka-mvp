# Sprint 2 — задачи для следующего исполнителя (Kimi / SWE-1.6 / любой)

## Правила (короче, чем в Sprint 1)

1. Один коммит = одна задача.
2. `npm run smoke` должен быть green после каждого коммита.
3. Не трогать схему БД и LLM-провайдеры без явной задачи.
4. Не коммитить `.env.local`, `local.db`, ключи.
5. `git author = UVEDOMLENIE`. Никаких реальных имён.
6. Если задача не сделалась за 30 минут — описать почему и идти дальше.

---

## Задачи (по приоритету)

### T1 — Retry + backoff для Scarlex (P0, главный затык)

**Проблема**: Scarlex отдаёт `429 Too many requests` практически на любой второй запрос. Сейчас мы сразу падаем в mock.

**Файл**: `lib/llm/gigachat.ts`, функция `callOpenAiCompatible`.

**Что делать**:
1. Обернуть `fetch` в retry-цикл (3 попытки).
2. На 429: ждать `Retry-After` (заголовок) либо `1s → 3s → 9s` (exponential backoff).
3. Если все 3 попытки 429 → бросить ошибку, но более информативную: `"Scarlex rate-limited 3 retries"`.
4. Не повторять при 401/403/4xx-кроме-429.

**Acceptance**:
- На 429 ждём и повторяем.
- В debug-логе видно количество retry.
- Не зацикливается (max 3).
- Smoke зелёный.

**Коммит**: `feat: retry с exponential backoff для Scarlex 429`

---

### T2 — Лучший mock на markdown (P1)

**Проблема**: если LLM упала, fallback-mock выдирает markdown-ссылки `[Глава 1](#глава-1)` и заголовки `# Дефекты` как ответы.

**Файл**: `lib/llm/mock.ts`.

**Что делать**:
1. В `extractDefinitions` фильтровать строки, содержащие `[...](...)` (markdown-ссылки) — пропускать.
2. В `extractFactSentences` фильтровать строки, начинающиеся с `#` (заголовки).
3. Если все стратегии вернули < 3 карточек — НЕ заполнять fallback'ами, а вернуть честные общие карточки про тему.

**Acceptance**:
- Загрузка `.md` файла больше не даёт мусорных карточек со скобками.
- Smoke зелёный.

**Коммит**: `fix(mock): фильтр markdown-ссылок и заголовков`

---

### T3 — Cleanup отладки в page.tsx (P2)

**Проблема**: в `app/page.tsx` есть `console.error("[/api/generate response]", ...)` — он показывается как красный Console Error в браузере у пользователя.

**Файл**: `app/page.tsx`.

**Что делать**:
1. Заменить `console.error` на `console.log` (это не ошибка, это лог).
2. Оставить условие `if (usedMock)` для warning — это правильно.

**Коммит**: `chore: console.error → console.log для дебага LLM-ответа`

---

### T4 — Деплой на Vercel (P0)

**Проблема**: жюри нужен живой URL.

**Что делать**:
1. Создать аккаунт на vercel.com (если ещё нет).
2. `npm i -g vercel`.
3. `vercel` в корне проекта.
4. Vercel сам определит Next.js, спросит — подтвердить.
5. В Vercel Dashboard → Settings → Environment Variables добавить:
   - `DATABASE_URL=file:./local.db` (или Turso URL для prod)
   - `OWNER_KEY_COOKIE_NAME=gs_owner`
   - `LLM_REQUESTS_PER_HOUR=30`
6. Redeploy.
7. Записать live URL в `docs/CURRENT_STATE.md`.

**ВНИМАНИЕ**: SQLite на Vercel работает только в read-only (serverless). Для prod нужно либо Turso (libsql cloud), либо переключить БД. Это **отдельная задача T6**.

**Acceptance**:
- Открыть URL → главная грузится.
- Кликнуть демо → попадает в редактор.
- Smoke зелёный на live URL.

**Коммит**: `chore: добавлен vercel.json + deployment guide` (если нужны конфиг-файлы).

---

### T5 — Migration на Turso (P1, если T4 показала read-only DB)

**Проблема**: `file:./local.db` не работает на Vercel.

**Что делать**:
1. Зарегистрироваться на turso.tech (бесплатно, 5 ГБ).
2. Создать БД: `turso db create gigasamobranka`.
3. Получить URL и токен: `turso db tokens create gigasamobranka`.
4. В `.env.local` (локально):
   ```
   DATABASE_URL=libsql://your-db.turso.io
   DATABASE_AUTH_TOKEN=eyJ...
   ```
5. На Vercel — те же env vars.
6. Запустить миграцию: `npm run db:migrate`.
7. Проверить локально: `npm run dev` + smoke.

**Acceptance**:
- Локально и на Vercel генерация набора создаёт запись в БД, потом её видно в `/library`.
- Smoke green.

**Коммит**: `feat: Turso cloud DB для production`

---

### T6 — Скриншоты для презентации (P0)

**Файл**: создать `docs/screenshots/` папку.

**Что делать**:
1. Открыть live URL (после T4-T5).
2. Сделать скриншоты:
   - `01_home.png` — главная с формой и демо-кнопками
   - `02_demo_cards.png` — редактор после демо-генерации
   - `03_player_teacher.png` — плеер учителя (карточка с вопросом)
   - `04_player_answer.png` — плеер после flip (с ответом)
   - `05_student_link.png` — экран ученика с именем
   - `06_results.png` — таблица результатов
   - `07_print.png` — A4 для печати
   - `08_library.png` — `/library` с наборами
   - `09_settings.png` — `/settings` (без ключа в кадре!)
3. Сложить в `docs/screenshots/` (репа), а ещё дубликат в локальную папку для презентации.

**Acceptance**:
- 9 PNG в репе.
- Все без реальных имён/ключей в кадре.

**Коммит**: `docs: скриншоты для презентации`

---

### T7 — Заполнить карточку прототипа (P0)

**Это организационная задача, не код.**

Что делать:
1. Открыть ссылку из кейса (организаторы хакатона).
2. Заполнить поля карточки прототипа.
3. Указать ссылку на репу: `https://github.com/UVEDOMLENIE/gigasamobranka-mvp`
4. Указать live URL после деплоя.
5. Сохранить.

---

### T8 — Аудит демо-наборов (P1)

**Проблема**: юзер заметил, что в некоторых демо-карточках могут быть бессмысленные вопросы/ответы.

**Файл**: `lib/demo-materials.ts`.

**Что делать**:
1. Прочитать файл.
2. Для каждого набора (`winter-vocab`, `multiplication`, и т.д.) — пройтись по text и проверить, что mock-генератор на нём даст логичные карточки.
3. Если в text есть что-то, что mock-генератор может неправильно вырвать (markdown-ссылки, странные конструкции) — переписать text.
4. Не менять `id`, `label`, `subject`, `grade`, `topic`, `count`, `difficulty`, `emoji` — это ключи и UI.
5. После правок: открыть `/`, кликнуть каждый демо → убедиться что карточки логичные.

**Acceptance**:
- Все демо-наборы при клике дают логичные карточки.
- Smoke green.

**Коммит**: `fix(demo): аудит и чистка текстов демо-наборов`

---

### T9 — Выбор LLM-модели через список (P2)

**Проблема**: сейчас в `/settings` поле «Model» — текстовый input. Юзер не знает какие модели вообще доступны.

**Файл**: `app/settings/page.tsx`.

**Что делать**:
1. Завести массив `SCARLEX_MODELS` сверху файла:
   ```ts
   const SCARLEX_MODELS = [
     { id: "claude-haiku-4-7", label: "Claude Haiku 4.7 (быстрая, дешёвая)" },
     { id: "claude-sonnet-4-7", label: "Claude Sonnet 4.7 (балансная)" },
     { id: "claude-opus-4-7", label: "Claude Opus 4.7 (умная, медленная)" },
     { id: "gpt-4o", label: "GPT-4o (требует отдельной квоты)" },
   ];
   ```
2. Заменить input «Model» на `<select>` с этим списком + опцией «Своя модель…»
3. При «Своя модель…» показывать текстовый input под select'ом.
4. Не трогать остальные поля.

**Acceptance**:
- Юзер видит список рабочих моделей.
- Может выбрать или ввести свою.
- Smoke green.

**Коммит**: `feat(settings): список Scarlex-моделей с опцией Своя`

---

## Что НЕ делать в этом спринте

- Не делать mindmap, fork, версионирование.
- Не переписывать архитектуру.
- Не добавлять авторизацию.
- Не пытаться обойти Scarlex rate-limit платой/спамом.

---

## Очередь

| # | Приоритет | Задача | Файл |
|---|-----------|--------|------|
| T1 | P0 | Retry для Scarlex | `lib/llm/gigachat.ts` |
| T2 | P1 | Mock без markdown | `lib/llm/mock.ts` |
| T3 | P2 | Чистка console.error | `app/page.tsx` |
| T4 | P0 | Деплой на Vercel | (env + vercel.json) |
| T5 | P1 | Turso для prod | `.env.local` + Vercel env |
| T6 | P0 | Скриншоты | `docs/screenshots/` |
| T7 | P0 | Карточка прототипа | (не код, организация) |
| T8 | P1 | Аудит демо-наборов | `lib/demo-materials.ts` |
| T9 | P2 | Выпадашка моделей в /settings | `app/settings/page.tsx` |

Порядок выполнения: T1 → T2 → T8 → T3 → T9, потом push.
Затем T4 → T5 → T6 → T7 (деплой + презентация).
