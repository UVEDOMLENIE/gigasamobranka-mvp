# KIMI HANDOFF — задачи по доработке MVP

Этот документ — для нейросети, которой передают написание кода.
Читать целиком перед началом любой задачи.

---

## 0. Кто ты и что делаешь

Ты — фронтенд+бэкенд разработчик, дописывающий MVP веб-сервиса
**ГигаСамобранка** для хакатона СберОбразование × Школа 21.

Сервис делает **учебные карточки и тесты для учителей**:
- учитель вставляет учебный материал (текст или файлы PDF/DOCX/PPTX/TXT),
- LLM (мок или GigaChat/Scarlex) генерирует набор карточек,
- учитель правит карточки, играет в плеере, отдаёт ученикам ссылку,
- учитель видит результаты, печатает A4.

MVP уже работает. Тебе НЕ надо переписывать архитектуру.
Тебе надо **аккуратно доделать UX и пару фич по чётким задачам ниже**.

---

## 1. Среда разработки

### Где код

- Проект: `C:\gs-mvp`
- Публичная репа: `https://github.com/UVEDOMLENIE/gigasamobranka-mvp`
- Ветка: `main`

### Стек

- Next.js **16.2.6** (App Router, Turbopack)
- TypeScript
- React 19
- TailwindCSS 4
- SQLite (better-sqlite3) — `local.db` (в .gitignore)
- KaTeX для формул

### Запуск

```bash
cd C:\gs-mvp
npm install         # один раз
npm run dev         # localhost:3000
npm run dev:lan     # 0.0.0.0:3000 (для проверки с других машин)
```

### Тесты

```bash
npm run smoke       # API smoke (home, demo, generate, sets, sessions, results, print)
```

После каждой задачи **обязательно** прогоняй `npm run smoke`. Если красный — фикси.

### Коммит/пуш

```bash
git add -A
git commit -m "..."
git push
```

Важно: **git author уже настроен в репо как UVEDOMLENIE**.
Не меняй `user.name` / `user.email`.

---

## 2. ЖЁСТКИЕ ПРАВИЛА (нарушение = откатываем коммит)

1. **Никаких реальных имён/фамилий.** В коде, коммитах, README, комментариях.
   Только `UVEDOMLENIE` или `GigaSamobranka Team`.

2. **Не ломать рабочий сценарий.** Должны работать:
   - главная страница `/`
   - демо-кнопки (`/api/demo?id=...` → редирект на `/sets/[id]`)
   - редактор `/sets/[id]`
   - плеер `/play/[id]`
   - студент `/play/[id]?mode=student`
   - результаты `/sets/[id]/results`
   - печать `/print/[id]`

3. **`npm run smoke` должен оставаться зелёным после каждого коммита.**

4. **Не трогать архитектуру БД и API без явной задачи.**
   Все API-роуты лежат в `app/api/.../route.ts`. Не добавлять новые без задачи.

5. **Не добавлять новые npm-зависимости без явной задачи.**
   Если задача требует новый пакет — он указан явно в задаче.

6. **Никаких `.env`, ключей, токенов в коде или коммитах.**

7. **Один коммит = одна задача из списка ниже.** Не миксуй.

8. **Не редактировать файлы вне `C:\gs-mvp\`.** Внутренние документы лежат вне репы.

---

## 3. Структура проекта (кратко)

```
C:\gs-mvp\
├─ app\
│  ├─ page.tsx                       # главная (форма + демо)
│  ├─ layout.tsx                     # корневой layout
│  ├─ globals.css
│  ├─ settings\                      # /settings — выбор LLM-провайдера
│  ├─ sets\[id]\
│  │  ├─ page.tsx                    # редактор карточек
│  │  └─ results\page.tsx            # таблица сессий
│  ├─ play\[id]\page.tsx             # плеер (учитель/ученик)
│  ├─ print\[id]\
│  │  ├─ page.tsx                    # A4 для печати
│  │  └─ print-actions.tsx
│  └─ api\
│     ├─ generate\route.ts           # POST: текст → карточки
│     ├─ demo\route.ts               # GET: redirect на готовый набор
│     ├─ upload\route.ts             # POST: файлы → текст
│     ├─ sets\[id]\route.ts          # GET/PATCH набор
│     ├─ sets\[id]\results\route.ts  # GET сессии набора
│     └─ sessions\route.ts           # POST/PATCH сессия ученика
├─ lib\
│  ├─ db\                # better-sqlite3 connection
│  ├─ demo-materials.ts  # готовые демо-наборы
│  ├─ id.ts              # generateId()
│  ├─ llm\               # mock + scarlex + gigachat провайдеры
│  ├─ owner.ts           # cookie-based ownership
│  ├─ parser\            # PDF/DOCX/PPTX парсеры
│  └─ rate-limit.ts
├─ components\
│  ├─ KatexRender.tsx
│  └─ ui\
├─ scripts\
│  ├─ migrate.mjs
│  └─ smoke.mjs
├─ docs\
│  ├─ CLOUD_HANDOFF.md
│  ├─ CURRENT_STATE.md
│  ├─ DEMO_SCRIPT.md
│  ├─ KNOWN_ISSUES.md
│  ├─ ORG_REQUIREMENTS.md
│  └─ KIMI_HANDOFF.md   ← этот файл
├─ AGENTS.md            # правила (no real names и т.д.)
├─ README.md
└─ package.json
```

---

## 4. Задачи (делать ПО ОДНОЙ, в порядке очереди)

### Принцип

- Каждая задача = один коммит.
- Перед началом задачи — `git pull`, `npm install`, `npm run smoke`.
- После задачи — `npm run smoke` + ручная проверка по acceptance criteria.
- Если что-то ломается — откати (`git restore .`) и сообщи об этом.

---

### TASK 1 (P0) — LLM-настройки в футер

**Что**: маленькая ссылка `LLM: Mock · настройки` сейчас наверху главной (под подзаголовком).
Перенести её в самый низ страницы, рядом с `ГигаСамобранка · Хакатон...`.

**Файл**: `app/page.tsx`

**Сейчас (примерно строки 181–187, в шапке)**:

```tsx
<a
  href="/settings"
  className="mt-3 inline-flex rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-white"
>
  LLM: {llmSettings?.provider === "scarlex" ? "Scarlex" : llmSettings?.provider === "gigachat" ? "GigaChat" : "Mock"} · настройки
</a>
```

**Должно стать**:

1. Удалить эту `<a>` из шапки.
2. В футере (который выглядит как `<p>ГигаСамобранка · Хакатон...</p>` в самом низу `<main>`)
   добавить рядом ту же ссылку, но более тихим стилем:

```tsx
<div className="text-center text-xs text-amber-700/60 mt-8 space-y-1">
  <p>ГигаСамобранка · Хакатон СберОбразование × Школа 21</p>
  <p>
    <a href="/settings" className="underline decoration-dotted hover:text-amber-800">
      LLM: {llmSettings?.provider === "scarlex" ? "Scarlex" : llmSettings?.provider === "gigachat" ? "GigaChat" : "Mock"} · настройки
    </a>
  </p>
</div>
```

**Acceptance criteria**:
- В шапке нет ссылки на LLM-настройки.
- В футере есть ссылка, кликабельна, ведёт на `/settings`.
- Текст показывает текущего провайдера (Mock/Scarlex/GigaChat).
- `npm run smoke` зелёный.
- Главная и редактор не сломались визуально.

**Коммит**: `ui(P0): LLM-настройки перенесены в футер`

---

### TASK 2 (P0) — ZIP-дисклеймер на форме

**Что**: в зоне drag-and-drop сейчас написано `до 10 файлов, по 20 МБ`.
Добавить вторую строчку про ZIP.

**Файл**: `app/page.tsx`

**Сейчас (примерно строка 302)**:

```tsx
<p className="text-xs text-gray-400 mt-1">до 10 файлов, по 20 МБ</p>
```

**Должно стать**:

```tsx
<p className="text-xs text-gray-400 mt-1">
  до 10 файлов, по 20 МБ
  <br />
  <span className="text-amber-600/80">ZIP пока не распаковываем — загрузите файлы отдельно</span>
</p>
```

**Acceptance criteria**:
- На главной видно дисклеймер про ZIP под текстом про размер.
- `npm run smoke` зелёный.

**Коммит**: `ui(P0): дисклеймер про ZIP в форме загрузки`

---

### TASK 3 (P1) — Select для предмета и класса

**Что**: сейчас Предмет и Класс — текстовые `<input>`.
Заменить на `<select>` с опцией «Другое», при которой появляется текстовый input.

**Файл**: `app/page.tsx`

**Списки опций** (использовать ровно эти, не выдумывай):

```ts
const SUBJECTS = [
  "Русский язык",
  "Математика",
  "Окружающий мир",
  "Литература",
  "Английский язык",
  "История",
  "Биология",
  "География",
  "Физика",
  "Химия",
  "Информатика",
];

const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
```

**Логика**:
- Завести два состояния `subjectSelect` и `gradeSelect`, изначально пустые (empty string).
- Если `subjectSelect === "__other__"`, показать рядом текстовый input для своего предмета.
- При сабмите формы: использовать значение из текстового input, если выбран `__other__`, иначе из select.
- Аналогично для класса.

**Пример (subject)**:

```tsx
<select
  value={subjectSelect}
  onChange={(e) => {
    setSubjectSelect(e.target.value);
    if (e.target.value !== "__other__") setSubject(e.target.value);
    else setSubject("");
  }}
  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
>
  <option value="">— выберите —</option>
  {SUBJECTS.map((s) => (
    <option key={s} value={s}>{s}</option>
  ))}
  <option value="__other__">Другое…</option>
</select>
{subjectSelect === "__other__" && (
  <input
    value={subject}
    onChange={(e) => setSubject(e.target.value)}
    required
    placeholder="Свой предмет"
    className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
  />
)}
```

**Acceptance criteria**:
- Поля «Предмет» и «Класс» — теперь select.
- При выборе «Другое…» появляется текстовый input.
- Кнопка «Сгенерировать» работает: при выбранном select шлёт его значение, при «Другое» — текст из инпута.
- Валидация (`Заполните предмет, класс и тему`) по-прежнему работает.
- Демо-карточки и существующий полный сценарий работают.
- `npm run smoke` зелёный.

**Коммит**: `ui(P1): select-поля для предмета и класса`

---

### TASK 4 (P1) — Страница «Мои наборы» `/library`

**Что**: создать новую страницу со списком всех наборов текущего пользователя
(определяется по cookie ownerKey).

**Файлы для создания**:
- `app/library/page.tsx`
- `app/api/library/route.ts`

**Файлы для правки**:
- `app/page.tsx` (добавить ссылку «📚 Мои наборы» в шапке или над формой).

#### 4.1. API `app/api/library/route.ts`

```ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getOwnerKey } from "@/lib/owner";

export async function GET() {
  const ownerKey = await getOwnerKey();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, subject, grade, topic, difficulty, count, created_at
       FROM sets
       WHERE owner_key = ?
       ORDER BY created_at DESC
       LIMIT 100`
    )
    .all(ownerKey) as Array<{
      id: string;
      subject: string;
      grade: string;
      topic: string;
      difficulty: string;
      count: number;
      created_at: string;
    }>;
  return NextResponse.json({ items: rows });
}
```

> ⚠️ **Перед написанием** проверь `lib/db/` и `lib/owner.ts` — какие именно функции экспортируются и какие имена колонок в таблице `sets`. Если имена отличаются (например `ownerKey` vs `owner_key`, `createdAt` vs `created_at`) — используй те, что реально есть в схеме (`scripts/migrate.mjs`).

#### 4.2. Страница `app/library/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  difficulty: string;
  count: number;
  created_at: string;
};

export default function LibraryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-amber-900">📚 Мои наборы</h1>
          <Link href="/" className="text-sm text-amber-700 hover:text-amber-900 underline">
            ← На главную
          </Link>
        </div>

        {loading && <p className="text-sm text-amber-700">Загружаю…</p>}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
            <p className="text-amber-700">Пока нет наборов.</p>
            <Link href="/" className="text-amber-900 underline mt-2 inline-block">
              Создать первый набор →
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="bg-white rounded-xl border border-amber-100 p-4 flex items-center justify-between hover:border-amber-300 transition"
              >
                <div className="min-w-0">
                  <p className="font-medium text-amber-900 truncate">{it.topic}</p>
                  <p className="text-xs text-amber-700/70">
                    {it.subject} · {it.grade} класс · {it.difficulty} · {it.count} карт.
                  </p>
                </div>
                <div className="flex gap-2 ml-3">
                  <Link
                    href={`/sets/${it.id}`}
                    className="text-xs bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg px-3 py-1.5"
                  >
                    Редактор
                  </Link>
                  <Link
                    href={`/play/${it.id}`}
                    className="text-xs bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg px-3 py-1.5"
                  >
                    Плеер
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
```

#### 4.3. Ссылка с главной

В `app/page.tsx`, прямо над формой (после блока «Демо в один клик», рядом с разделителем «── или составь свой набор ──») добавить:

```tsx
<div className="text-center mb-3">
  <Link
    href="/library"
    className="text-xs text-amber-700 hover:text-amber-900 underline decoration-dotted"
  >
    📚 Мои сохранённые наборы →
  </Link>
</div>
```

(импорт `Link` уже добавь сверху).

**Acceptance criteria**:
- `/library` открывается, показывает список наборов или пустое состояние.
- На главной есть ссылка «📚 Мои сохранённые наборы».
- При клике на «Редактор» в библиотеке открывается `/sets/[id]`.
- При клике на «Плеер» открывается `/play/[id]`.
- Если у текущего ownerKey нет наборов — показывается пустое состояние.
- Чужие наборы (других ownerKey) **не видны**.
- `npm run smoke` зелёный.

**Коммит**: `feat(P1): страница /library со списком наборов учителя`

---

### TASK 5 (P1) — Экспорт DOCX из редактора

**Что**: добавить кнопку «Скачать DOCX» рядом с уже существующей «Печать» в редакторе.
Это даст «≥2 формата вывода» — критерий хакатона.

**Зависимость**: добавить `docx` пакет.

```bash
cd C:\gs-mvp
npm install docx@9
```

**Файлы**:
- Создать `app/api/sets/[id]/docx/route.ts`
- Дописать кнопку в `app/sets/[id]/page.tsx`

#### 5.1. API `app/api/sets/[id]/docx/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { getDb } from "@/lib/db";
import { getOwnerKey } from "@/lib/owner";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ownerKey = await getOwnerKey();
  const db = getDb();

  const set = db
    .prepare(`SELECT * FROM sets WHERE id = ? AND owner_key = ?`)
    .get(id, ownerKey) as
    | { id: string; subject: string; grade: string; topic: string }
    | undefined;

  if (!set) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const cards = db
    .prepare(`SELECT question, answer FROM cards WHERE set_id = ? ORDER BY position ASC`)
    .all(id) as Array<{ question: string; answer: string }>;

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: set.topic,
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `${set.subject} · ${set.grade} класс`,
            heading: HeadingLevel.HEADING_3,
          }),
          ...cards.flatMap((c, i) => [
            new Paragraph({
              children: [new TextRun({ text: `${i + 1}. ${c.question}`, bold: true })],
            }),
            new Paragraph({
              children: [new TextRun({ text: c.answer ?? "" })],
            }),
            new Paragraph({ text: "" }),
          ]),
        ],
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        set.topic,
      )}.docx"`,
    },
  });
}
```

> ⚠️ **Сверь имена полей** (`set_id`, `position`, `owner_key`) с реальной схемой в `scripts/migrate.mjs`. Если отличаются — используй фактические.

#### 5.2. Кнопка в редакторе `app/sets/[id]/page.tsx`

Найди блок с кнопкой «🖨️ Печать» (или похожей ссылкой на `/print/[id]`) и рядом добавь:

```tsx
<a
  href={`/api/sets/${id}/docx`}
  className="text-xs bg-white border border-amber-200 hover:bg-amber-50 rounded-lg px-3 py-1.5"
>
  📄 DOCX
</a>
```

**Acceptance criteria**:
- В редакторе есть кнопка «📄 DOCX».
- При клике скачивается `.docx` файл с нужным контентом (название темы, карточки, вопрос+ответ).
- Файл открывается в Word/LibreOffice без ошибок.
- Чужие наборы по `/api/sets/[чужой_id]/docx` возвращают 404.
- `npm run smoke` зелёный.

**Коммит**: `feat(P1): экспорт набора в DOCX`

---

### TASK 6 (P1) — Параметры режима плеера (опционально)

**Что**: в плеере `/play/[id]` добавить простой блок настроек: время на карточку (сек), число попыток.
Пока хранить в `localStorage`, без БД.

**Файл**: `app/play/[id]/page.tsx`

**Логика**:
- В верхней панели плеера добавить две настройки: «⏱ {N} сек» и «🔁 {N} попыт.».
- Сохранять в `localStorage` (`gs_play_settings`).
- Если `seconds > 0` — авто-флип карточки через N сек.
- `attempts` — пока **только UI** (в счёт не идёт), это маркер для роадмапа.

**Acceptance criteria**:
- В плеере есть две кнопки «⏱» и «🔁» с числами, кликом меняется значение (0/15/30/60 для времени, 1/2/3 для попыток).
- При `seconds=0` старого поведения не меняется.
- При `seconds>0` карточка авто-показывает ответ через N секунд (один раз, не циклично).
- Настройки сохраняются между перезагрузками страницы.
- `npm run smoke` зелёный.

**Коммит**: `feat(P1): настройки тайминга и попыток в плеере`

---

### TASK 7 (P0) — Проверка перед сдачей

**Что делать**:
1. `git pull && npm install`
2. `npm run smoke` — должен быть зелёным.
3. Открыть `http://localhost:3000` и пройти полный сценарий:
   - Кликнуть демо-карточку → попасть в редактор.
   - В редакторе нажать «Плеер» → пройти 1–2 карточки.
   - В редакторе нажать «🔗 Ссылка ученикам» (должна копироваться или показываться).
   - В редакторе нажать «🖨️ Печать» → открывается `/print/[id]`.
   - В редакторе нажать «📄 DOCX» (если есть) → скачивается файл.
   - Открыть `/library` → видим только что созданный набор.
4. Если всё ок — `git push`.

**Не считается завершением**, пока:
- `smoke` красный,
- любой шаг сценария ломается,
- консоль браузера полна ошибок.

---

## 5. Что НЕ делать

- Не делать P2-задачи (mindmap, fork, версионирование) — это для презентации, не для кода.
- Не переписывать LLM-провайдеры.
- Не менять схему БД (`scripts/migrate.mjs`) без явной задачи.
- Не добавлять авторизацию/регистрацию.
- Не убирать существующий `mock` LLM — это запасной вариант для жюри без ключа.
- Не коммитить `.env.local`, `local.db`, `node_modules/`.

---

## 6. Если что-то непонятно

Прочти в порядке убывания пользы:
1. `docs/CURRENT_STATE.md` — что работает, что нет.
2. `docs/KNOWN_ISSUES.md` — известные баги.
3. `docs/DEMO_SCRIPT.md` — какой сценарий показывают жюри.
4. `docs/ORG_REQUIREMENTS.md` — требования организаторов.
5. `docs/CLOUD_HANDOFF.md` — общий контекст.
6. `AGENTS.md` — правила (no real names).

Если после прочтения всё ещё непонятно — **не пиши код**. Сообщи об этом.

---

## 7. Очередь задач (TL;DR)

| # | Приоритет | Задача | Коммит |
|---|-----------|--------|--------|
| 1 | P0 | LLM-настройки в футер | `ui(P0): LLM-настройки перенесены в футер` |
| 2 | P0 | ZIP-дисклеймер | `ui(P0): дисклеймер про ZIP в форме загрузки` |
| 3 | P1 | Select для предмета/класса | `ui(P1): select-поля для предмета и класса` |
| 4 | P1 | Страница `/library` | `feat(P1): страница /library со списком наборов учителя` |
| 5 | P1 | Экспорт DOCX | `feat(P1): экспорт набора в DOCX` |
| 6 | P1 | Параметры плеера | `feat(P1): настройки тайминга и попыток в плеере` |
| 7 | P0 | Финальная проверка + push | (без коммита, только проверка) |

После завершения — отчитайся одним сообщением: какие задачи сделаны, какие коммиты, прошёл ли smoke.
