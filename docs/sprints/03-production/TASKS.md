# Sprint 3 — Production Fix

## Контекст (читай ОБЯЗАТЕЛЬНО)

Прод задеплоен на https://gs-mvp-six.vercel.app, но **набитый багами**:

1. **БД эфемерная** — наборы создаются, через минуту исчезают (serverless `/tmp`)
2. **Ключ Scarlex утёк в git history** — public repo, security inci­dent
3. Скриншоты, карточка прототипа, скринкаст — не сделаны (нужно для жюри)

Если ты не понял что-то из контекста — читай `docs/sprints/02-stability/REPORT.md` целиком.

## Правила (как в S02)

1. Один коммит = одна задача.
2. `npm run smoke` green после каждого коммита.
3. **`SMOKE_BASE=https://gs-mvp-six.vercel.app node scripts/smoke.mjs`** должен быть green после T1.
4. Не коммитить `.env*`, `tmp*`, `local.db`, ключи. **ПЕРЕД** `git add -A` всегда `git status` и убедись что лишнего нет.
5. `git author = UVEDOMLENIE`.
6. Если задача не идёт 30 минут — пропусти, опиши почему.

---

## Задачи (по приоритету)

### T1 — Миграция на Turso (P0, ОСНОВНАЯ ЗАДАЧА СПРИНТА)

**Проблема**: `file:/tmp/local.db` на Vercel — эфемерный. Создаём набор → через 5 минут он исчез.

**Решение**: Turso — libsql cloud, бесплатно 5GB, regional replicas. Код **уже готов** для libsql (см. `lib/db/client.ts`).

**Что делать**:

1. **Юзер** регистрируется на https://turso.tech через GitHub (1 минута).
2. **Юзер** создаёт БД через web-UI:
   - Name: `gigasamobranka`
   - Region: `Frankfurt` (`fra`) или `Warsaw` (`waw`) — ближайший к РФ
3. **Юзер** копирует `Database URL` (типа `libsql://gigasamobranka-uvedomlenie.turso.io`).
4. **Юзер** генерирует токен через web-UI → "Generate Token" → копирует.
5. **Юзер** даёт тебе URL и токен в чат.
6. **Ты** добавляешь в Vercel env (тип stdin как в S02):
   ```bash
   echo "libsql://gigasamobranka-XXX.turso.io" > /tmp/turso_url.txt
   vercel env add DATABASE_URL production < /tmp/turso_url.txt
   echo "eyJ..." > /tmp/turso_token.txt
   vercel env add DATABASE_AUTH_TOKEN production < /tmp/turso_token.txt
   rm /tmp/turso_url.txt /tmp/turso_token.txt
   ```
7. **Ты** убираешь костыль `/tmp/local.db` из `lib/db/client.ts` — он больше не нужен.
   - Оставь auto-migrate (он сработает на Turso при первом запросе).
8. **Ты** редеплоишь: `vercel --yes --prod`.
9. **Ты** запускаешь smoke на проде:
   ```bash
   node -e "process.env.SMOKE_BASE='https://gs-mvp-six.vercel.app'; require('./scripts/smoke.mjs')"
   ```
10. **Ты** делаешь **ручной тест** на персистентность:
    - Создай набор через `curl` → сохрани setId
    - Подожди 60 секунд (`sleep 60`)
    - Запроси `curl https://gs-mvp-six.vercel.app/api/sets/$setId`
    - Должен вернуться JSON с карточками — НЕ 404.

**Acceptance**:
- Smoke на проде green.
- Тест с задержкой 60с проходит.
- В Vercel logs нет SQL-ошибок.

**Коммит**: `feat: миграция на Turso для prod БД`

---

### T2 — Удалить ключ Scarlex из git history (P0, security)

**Проблема**: `sk-scarlex-8ea63dd597e686add0afdaf5645a91d2` лежит в коммите `a021f89` в файле `Ctmpscarlex_env.txt`. Репо публичный → ключ скомпрометирован.

**Что делать**:

1. **Юзер** идёт в Scarlex Dashboard → отзывает старый ключ → генерирует новый.
2. **Юзер** даёт новый ключ тебе в чат.
3. **Ты** обновляешь Vercel env:
   ```bash
   vercel env rm SCARLEX_API_KEY production --yes
   echo "sk-scarlex-NEW-KEY" > /tmp/sk.txt
   vercel env add SCARLEX_API_KEY production < /tmp/sk.txt
   rm /tmp/sk.txt
   ```
4. **Ты** переписываешь git history через `git filter-repo` (`pip install git-filter-repo` или `npx git-filter-repo`):
   ```bash
   git filter-repo --path Ctmpscarlex_env.txt --invert-paths
   git filter-repo --path Ctmpdb_env.txt --invert-paths
   git filter-repo --path Ctmpowner_env.txt --invert-paths
   git filter-repo --path Ctmprate_env.txt --invert-paths
   ```
5. **Ты** force-push: `git push origin main --force`.
6. **Ты** проверяешь что ключ исчез:
   ```bash
   git log --all --full-history -p -S "sk-scarlex" | head -5
   ```
   — должно быть пусто.

**Acceptance**:
- Старый ключ отозван.
- Новый ключ работает на проде (smoke green).
- В git history нет упоминаний `sk-scarlex-8ea...`.

**Коммит**: коммит не нужен (filter-repo переписывает history).

---

### T3 — Тест персистентности (P1)

**Проблема**: после T1 нужно **доказать**, что БД работает между инстансами.

**Что делать**:

Создай файл `scripts/persistence-test.mjs`:

```js
const BASE = process.env.SMOKE_BASE ?? 'https://gs-mvp-six.vercel.app';

const created = await fetch(`${BASE}/api/demo?id=winter-vocab`, { redirect: 'manual' });
const setId = created.headers.get('location')?.split('/').pop();
console.log('Created setId:', setId);

console.log('Waiting 90 seconds...');
await new Promise(r => setTimeout(r, 90000));

const fetched = await fetch(`${BASE}/api/sets/${setId}`);
if (fetched.status !== 200) {
  console.error(`FAIL: status ${fetched.status}`);
  process.exit(1);
}
const data = await fetched.json();
if (!data.cards || data.cards.length === 0) {
  console.error('FAIL: no cards');
  process.exit(1);
}
console.log(`OK: ${data.cards.length} cards persisted`);
```

Добавь в `package.json`:
```json
"persistence": "node scripts/persistence-test.mjs"
```

Запусти, скинь результат.

**Acceptance**: `npm run persistence` с `SMOKE_BASE=https://gs-mvp-six.vercel.app` — OK.

**Коммит**: `test: persistence-тест для prod БД`

---

### T4 — Скриншоты для презентации (P1)

То же самое что было в S02 (T6) — теперь когда прод стабильный, делаем по живому URL.

**Файлы**: `docs/screenshots/01_home.png` ... `09_settings.png`

**Acceptance**: 9 PNG в репе, без реальных имён/ключей в кадре.

**Коммит**: `docs: скриншоты для презентации`

---

### T5 — Карточка прототипа (P1, не код)

Заполнить карточку у организаторов хакатона.
- Ссылка на репу: `https://github.com/UVEDOMLENIE/gigasamobranka-mvp`
- Live URL: `https://gs-mvp-six.vercel.app`

---

### T6 — README badge с live URL (P2)

В `README.md` добавить:
```markdown
[![Live](https://img.shields.io/badge/live-gs--mvp--six.vercel.app-green)](https://gs-mvp-six.vercel.app)
```

**Коммит**: `docs: live badge в README`

---

## Что НЕ делать в этом спринте

- Скринкаст (отдельная задача, делает юзер сам).
- Любые код-фичи кроме T1-T3.
- Touch `lib/llm/*` — Scarlex и mock работают как нужно.
- Touch `lib/demo-materials.ts` — все 5 наборов чистые.
- Touch `app/settings/page.tsx` — список моделей актуальный.

## Что в финале

Live URL должен показывать:
1. Главная грузится.
2. Демо-набор создаётся, остаётся доступным через 5+ минут.
3. Real LLM-генерация через Scarlex с правильным ключом — работает.
4. Карточки сохраняются в Turso, не пропадают.
5. Smoke green на проде.

## Когда позвать Опуса

После T1+T2+T3 — это критический минимум. Юзер скажет «Опус, выныривай» — Опус сделает финальный аудит, обновит `CURRENT_STATE.md`, закроет S03.
