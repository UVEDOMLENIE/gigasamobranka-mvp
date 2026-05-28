# Архитектура ГигаСамобранка

## Общая схема

```mermaid
flowchart TD
    Browser["🌐 Браузер (React 19 + Tailwind)"] -->|HTTP / WebSocket| NextJS["▲ Next.js 16 App Router"]
    NextJS -->|Server Actions / API Routes| API["API Layer"]

    subgraph API_Layer ["API Routes"]
        API -->|/api/generate| Gen["generateCards()"]
        API -->|/api/upload| Upload["parseUpload()"]
        API -->|/api/sets/*| CRUD["CRUD sets/cards"]
        API -->|/api/sets/*/docx| Docx["DOCX export"]
        API -->|/api/sessions| Stats["Session stats"]
    end

    Gen -->|OpenAI-compatible| Scarlex["Scarlex API<br/>Claude Sonnet 4.6"]
    Gen -->|OAuth 2.0| GigaChat["GigaChat API"]
    Gen -.->|fallback| Mock["Mock (regex)"]

    Upload -->|mammoth| DOCX_P["DOCX parser"]
    Upload -->|pdf-parse| PDF_P["PDF parser"]
    Upload -->|native| TXT_P["TXT parser"]

    CRUD -->|Drizzle ORM| DB[("SQLite<br/>libsql")]
    Stats --> DB

    DB -.->|backup/restore| Blob["Vercel Blob<br/>db.sqlite"]

    NextJS -->|static| Pages["/ /library /settings"]
    NextJS -->|dynamic| DynamicPages["/sets/[id]<br/>/play/[id]<br/>/print/[id]"]
```

## Диаграмма потоков данных

```mermaid
sequenceDiagram
    actor Teacher as Учитель
    participant Browser as Браузер
    participant NextJS as Next.js API
    participant LLM as Scarlex / GigaChat
    participant DB as SQLite + Blob

    Teacher->>Browser: Загружает PDF/DOCX
    Browser->>NextJS: POST /api/upload
    NextJS->>NextJS: Парсинг текста

    Teacher->>Browser: Жмёт "Составить набор"
    Browser->>NextJS: POST /api/generate
    NextJS->>LLM: Промпт + текст (4000 символов)
    LLM-->>NextJS: JSON-массив карточек
    NextJS->>DB: INSERT sets, cards
    NextJS->>Blob: backupDb()
    NextJS-->>Browser: setId

    Teacher->>Browser: Редактирует карточки
    Browser->>NextJS: PUT /api/sets/[id]
    NextJS->>DB: UPDATE cards
    NextJS->>Blob: backupDb()

    Teacher->>Browser: "Ссылка ученикам"
    Browser-->>Teacher: /play/[id]

    actor Student as Ученик
    Student->>Browser: Открывает ссылку
    Browser->>NextJS: GET /play/[id]
    NextJS->>DB: SELECT cards
    DB-->>NextJS: Карточки
    NextJS-->>Browser: Плеер

    Student->>Browser: Отвечает (Знал/Не знал)
    Browser->>NextJS: PATCH /api/sessions
    NextJS->>DB: INSERT answers
    NextJS->>Blob: backupDb()

    Teacher->>Browser: "Результаты"
    Browser->>NextJS: GET /api/sets/[id]/results
    NextJS->>DB: SELECT sessions, answers
    DB-->>NextJS: Статистика
    NextJS-->>Browser: Таблица с процентами
```

## Стек технологий

| Слой | Технология | Назначение |
|---|---|---|
| Frontend | Next.js 16.2.6, React 19, Tailwind v4 | SSR, компоненты, стили |
| ORM | Drizzle ORM | Type-safe SQL, миграции |
| БД | `@libsql/client` (SQLite) | Локально: файл; Prod: Vercel Blob |
| LLM | Scarlex (Claude), GigaChat, Mock | Генерация карточек |
| Парсинг | mammoth, pdf-parse, officeparser | DOCX, PDF, TXT, PPTX |
| Формулы | KaTeX | LaTeX в карточках |
| Экспорт | docx (npm) | DOCX вывод |
| Хостинг | Vercel | Serverless, SSL, CI/CD |

## Схема БД

```mermaid
erDiagram
    SETS ||--o{ CARDS : contains
    SETS ||--o{ SESSIONS : has
    SESSIONS ||--o{ ANSWERS : includes
    CARDS ||--o{ ANSWERS : answered_in

    SETS {
        text id PK
        text owner_key
        text subject
        text grade
        text topic
        text settings
        int created_at
        int updated_at
    }

    CARDS {
        text id PK
        text set_id FK
        int position
        text question
        text answer
        text source
        text difficulty
    }

    SESSIONS {
        text id PK
        text set_id FK
        text student_name
        int started_at
        int finished_at
    }

    ANSWERS {
        text id PK
        text session_id FK
        text card_id FK
        boolean known
        int time_ms
        int answered_at
    }
```

## Безопасность и изоляция

- `owner_key` — случайная строка в HttpOnly cookie (`gs_owner`), без регистрации.
- Rate-limit: `LLM_REQUESTS_PER_HOUR=30` на пользователя.
- Данные учеников (sessions, answers) привязаны к `set_id` → `owner_key`.
- Нет публичного API для чтения чужих наборов.
