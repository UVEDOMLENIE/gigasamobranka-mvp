# Scarlex — доступные модели и конфигурация

## Источник

Конфигурация от OpenCode.ai (пользователь прислал 2026-05-27).

## Правильные model ID

Важно: мы тестировали `claude-haiku-4-7` (работала!), но в официальном списке только `claude-haiku-3.5`. Возможно `4-7` — скрытый алиас или legacy ID.

| ID | Название | Статус тестов |
|---|---|---|
| `claude-opus-4.7` | Claude Opus 4.7 | Не тестировали |
| `claude-opus-4.6` | Claude Opus 4.6 | Не тестировали |
| `claude-sonnet-4.6` | Claude Sonnet 4.6 | Не тестировали |
| `claude-sonnet-4` | Claude Sonnet 4 | Не тестировали |
| `claude-sonnet-4-thinking` | Claude Sonnet 4 Thinking | Не тестировали |
| `claude-haiku-3.5` | Claude Haiku 3.5 | Не тестировали |

## Неправильные ID (что мы использовали раньше)

| ID | Результат | Вывод |
|---|---|---|
| `claude-haiku-4-7` | **200 OK, 169 tokens** | ✅ **Рабочий алиас**. Генерирует полный JSON |
| `claude-haiku-3.5` | **200 OK, 1 token, пустой content** | ❌ Не генерирует карточки |
| `claude-sonnet-4-7` | **200 + "Service temporarily unavailable"** | ❌ Неверный ID (не существует) |
| `claude-sonnet-4` | **200 OK, 169 tokens** | ✅ **Работает** |
| `claude-opus-4-7` | **429** | ❌ Неверный ID (не существует) |
| `claude-opus-4.7` | **200 OK, 147 tokens** | ✅ **Работает** |
| `gpt-4o` | **402 Quota exceeded** | ❌ Не назначена квота |
| `gpt-4o-mini` | **402 Quota exceeded** | ❌ Не назначена квота |

## Провайдер конфигурация

```json
{
  "SCARLEX": {
    "npm": "@ai-sdk/openai-compatible",
    "name": "SCARLEX",
    "options": {
      "baseURL": "https://api.scarlex.ru",
      "apiKey": "YOUR_API_KEY"
    }
  }
}
```

## Лимиты

| Параметр | Значение |
|---|---|
| context | 200000 tokens |
| output | 64000 tokens |

## Рекомендация для MVP

- GPT-модели не работают (402 квота) — убраны из UI
- `claude-haiku-4-7` — ✅ default, работает, быстрая
- `claude-sonnet-4` — ✅ работает, умнее haiku
- `claude-opus-4.7` — ✅ работает, самая умная
- `claude-haiku-3.5` — ❌ пустой ответ, не подходит
- Использовать ID **с точкой**: `claude-opus-4.7`, не `claude-opus-4-7`

## Rate-limit наблюдения

- Первый запуск дал 429 на все модели
- После 60с паузы — 10 запросов подряд к `claude-haiku-4-7` — все 200 OK
- Возможно rate-limit по количеству токенов/времени, не по числу запросов
- Требуется retry с backoff ≥ 60 секунд

