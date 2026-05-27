# Карточка прототипа — ГигаСамобранка

## Название
ГигаСамобранка — генератор учебных карточек

## Описание
MVP для учителя: загружает материалы → получает карточки → редактирует → даёт ссылку ученикам → видит результаты → печатает.

## Стек
- Next.js 16.2.6, React 19, Tailwind v4, TypeScript
- Drizzle ORM + libsql (SQLite via Vercel Blob persistence)
- KaTeX для формул
- LLM: mock-first; реальный через /settings (Scarlex V2 / GigaChat)

## Репозиторий
https://github.com/UVEDOMLENIE/gigasamobranka-mvp

## Live demo
https://gs-mvp-six.vercel.app

## Скриншоты
docs/screenshots/01_home.png — главная
docs/screenshots/02_set.png — набор карточек
docs/screenshots/03_library.png — библиотека
docs/screenshots/04_print.png — печать
docs/screenshots/05_settings.png — настройки

## Что работает
- Демо-генерация карточек (5 демо-наборов)
- Загрузка материалов (.docx, .pdf, .txt)
- Генерация через LLM (Scarlex / GigaChat / mock fallback)
- Редактирование карточек
- Режим ученика (прохождение, ответы)
- Результаты сессии
- Печать DOCX
- Persistence на проде (Vercel Blob)

## Демо-аккаунт
Не требуется — работает без регистрации, owner key в cookie.
