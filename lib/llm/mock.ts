import type { CardDraft, GenerateInput } from "./types";

/**
 * Умный mock-генератор учебных карточек.
 * Парсит исходный текст несколькими стратегиями и собирает разнообразные карточки.
 * Используется когда USE_MOCK_LLM=true или реальный GigaChat недоступен.
 */
export function mockGenerate(input: GenerateInput): CardDraft[] {
  const cards: CardDraft[] = [];

  for (const src of input.sources) {
    cards.push(...extractCardsFromText(src.text, src.filename, input));
    if (cards.length >= input.count * 2) break;
  }

  // Дедуп по вопросу
  const seen = new Set<string>();
  const unique = cards.filter((c) => {
    const key = c.question.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Дополняем общими вопросами по теме если не хватает
  let i = 0;
  while (unique.length < input.count) {
    unique.push(makeFallback(input, i++));
  }

  return unique.slice(0, input.count);
}

function extractCardsFromText(
  text: string,
  filename: string,
  input: GenerateInput,
): CardDraft[] {
  const result: CardDraft[] = [];

  // 1. Арифметика: "X умножить на Y равно Z" / "X + Y = Z" / "X * Y = Z"
  result.push(...extractArithmetic(text, filename, input));

  // 2. Формулы с описанием: "S = a × b, где a и b — стороны"
  result.push(...extractFormulas(text, filename, input));

  // 3. Словарные определения: "слово — значение" / "слово: значение"
  result.push(...extractDefinitions(text, filename, input));

  // 4. Предложения-факты: используем как ответы
  result.push(...extractFactSentences(text, filename, input));

  return result;
}

// --- 1. Арифметика ---
function extractArithmetic(
  text: string,
  filename: string,
  input: GenerateInput,
): CardDraft[] {
  const cards: CardDraft[] = [];

  // "7 умножить на 2 равно 14"
  for (const m of text.matchAll(/(\d+)\s*умножить\s+на\s*(\d+)\s*(?:равно|=)\s*(\d+)/gi)) {
    cards.push({
      question: `Сколько будет ${m[1]} × ${m[2]}?`,
      answer: `${m[1]} × ${m[2]} = ${m[3]}`,
      source: filename,
      difficulty: input.difficulty,
    });
  }
  // "7 + 2 = 9", "7 × 2 = 14", "10 - 3 = 7", "10 / 2 = 5"
  for (const m of text.matchAll(/(\d+)\s*([+\-×x*/:])\s*(\d+)\s*=\s*(\d+)/g)) {
    const op = m[2].replace(/[xX*]/, "×").replace(":", "÷").replace("/", "÷");
    cards.push({
      question: `Сколько будет ${m[1]} ${op} ${m[3]}?`,
      answer: `${m[1]} ${op} ${m[3]} = ${m[4]}`,
      source: filename,
      difficulty: input.difficulty,
    });
  }
  // "разделить на", "плюс", "минус"
  for (const m of text.matchAll(/(\d+)\s*(плюс|минус|разделить\s+на)\s*(\d+)\s*(?:равно|=)\s*(\d+)/gi)) {
    const opMap: Record<string, string> = { плюс: "+", минус: "−" };
    const op = opMap[m[2].toLowerCase()] ?? "÷";
    cards.push({
      question: `Сколько будет ${m[1]} ${op} ${m[3]}?`,
      answer: `${m[1]} ${op} ${m[3]} = ${m[4]}`,
      source: filename,
      difficulty: input.difficulty,
    });
  }
  return cards;
}

// --- 2. Формулы с описанием ---
function extractFormulas(
  text: string,
  filename: string,
  input: GenerateInput,
): CardDraft[] {
  const cards: CardDraft[] = [];

  // "Площадь X — это $формула$, где ..."
  for (const m of text.matchAll(
    /([А-ЯЁ][а-яёА-ЯЁ\s]{3,40})\s*[—–\-]\s*это\s+(\$[^$]+\$)\s*,?\s*([^.]{0,200})\./gi,
  )) {
    const term = m[1].trim();
    const formula = m[2].trim();
    const desc = m[3].trim();
    cards.push({
      question: `По какой формуле вычисляется ${term.toLowerCase()}?`,
      answer: `${formula}${desc ? `\n${capitalize(desc)}.` : ""}`,
      source: filename,
      difficulty: input.difficulty,
    });
  }

  // "X вычисляется по формуле $...$, где ..."
  for (const m of text.matchAll(
    /([А-ЯЁ][а-яёА-ЯЁ\s]{3,50}?)\s+вычисляется\s+по\s+формуле\s+(\$[^$]+\$)\s*,?\s*([^.]{0,200})\./gi,
  )) {
    const term = m[1].trim();
    const formula = m[2].trim();
    const desc = m[3].trim();
    cards.push({
      question: `По какой формуле вычисляется ${term.toLowerCase()}?`,
      answer: `${formula}${desc ? `\n${capitalize(desc)}.` : ""}`,
      source: filename,
      difficulty: input.difficulty,
    });
  }

  return cards;
}

// --- 3. Словарные определения ---
function extractDefinitions(
  text: string,
  filename: string,
  input: GenerateInput,
): CardDraft[] {
  const cards: CardDraft[] = [];

  // "слово — значение." (тире длинное или короткое или двоеточие)
  for (const m of text.matchAll(
    /([А-ЯЁ][а-яёА-ЯЁ\-]{2,25})\s*[—–\-:]\s*([^.;\n]{8,200})[.;\n]/g,
  )) {
    const word = m[1].trim();
    const def = m[2].trim();
    // Игнорируем формулы (они уже обработаны)
    if (def.includes("$")) continue;
    cards.push({
      question: pickDefinitionQuestion(word, input),
      answer: capitalize(def) + ".",
      source: filename,
      difficulty: input.difficulty,
    });
  }

  // "X — это Y"
  for (const m of text.matchAll(
    /([А-ЯЁ][а-яёА-ЯЁ\s]{2,40}?)\s+—\s+это\s+([^.]{10,200})\./gi,
  )) {
    const term = m[1].trim();
    const def = m[2].trim();
    if (def.includes("$")) continue;
    cards.push({
      question: `Что такое «${term.toLowerCase()}»?`,
      answer: capitalize(def) + ".",
      source: filename,
      difficulty: input.difficulty,
    });
  }

  return cards;
}

// --- 4. Предложения-факты ---
function extractFactSentences(
  text: string,
  filename: string,
  input: GenerateInput,
): CardDraft[] {
  const cards: CardDraft[] = [];
  const clean = text.replace(/\s+/g, " ").trim();

  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 300)
    // Пропускаем уже обработанные шаблоны
    .filter((s) => !/^\d+\s*[+\-×x*/:]/.test(s))
    .filter((s) => !/умножить\s+на\s*\d/i.test(s))
    .filter((s) => !/—\s*это\s+/.test(s));

  const usedKeywords = new Set<string>();

  for (const sentence of sentences) {
    if (cards.length >= 20) break;

    // Ищем существительные с заглавной (термины)
    const words = sentence
      .replace(/[«»"']/g, "")
      .split(/\s+/)
      .filter((w) => /^[А-ЯЁ][а-яё]{3,}/.test(w))
      .map((w) => w.replace(/[.,;!?]$/, ""));

    let keyword = words.find((w) => !usedKeywords.has(w.toLowerCase()));

    // Если нет терминов с заглавной — берём длинное слово в середине
    if (!keyword) {
      const fallback = sentence
        .split(/\s+/)
        .filter((w) => /[а-яё]{5,}/i.test(w) && !["который", "которая", "которое", "потому", "поэтому", "значит"].includes(w.toLowerCase()))
        .map((w) => w.replace(/[.,;!?«»]/g, ""));
      keyword = fallback.find((w) => !usedKeywords.has(w.toLowerCase()));
    }

    if (!keyword) continue;
    usedKeywords.add(keyword.toLowerCase());

    cards.push({
      question: factQuestion(keyword, input),
      answer: sentence,
      source: filename,
      difficulty: input.difficulty,
    });
  }

  return cards;
}

// --- Шаблоны вопросов ---

function pickDefinitionQuestion(word: string, input: GenerateInput): string {
  const w = word.toLowerCase();
  const templates = [
    `Что означает слово «${w}»?`,
    `Дай определение: «${word}».`,
    `Что такое «${w}»?`,
    `Объясни значение слова «${w}».`,
  ];
  return templates[simpleHash(word + input.topic) % templates.length];
}

function factQuestion(keyword: string, input: GenerateInput): string {
  const lower = keyword.toLowerCase();
  const templates = [
    `Что говорится о понятии «${lower}» в теме «${input.topic}»?`,
    `Расскажи про «${lower}».`,
    `Какую роль играет «${lower}» в этой теме?`,
    `Объясни значение слова «${lower}».`,
    `Что нужно знать о «${lower}»?`,
  ];
  return templates[simpleHash(keyword + lower) % templates.length];
}

function makeFallback(input: GenerateInput, i: number): CardDraft {
  const templates = [
    {
      q: `Кратко расскажи о теме «${input.topic}».`,
      a: `Тема «${input.topic}» изучается в ${input.grade} классе по предмету «${input.subject}».`,
    },
    {
      q: `Назови главное в теме «${input.topic}».`,
      a: `Основные понятия темы «${input.topic}» — это база для дальнейшего обучения в ${input.grade} классе.`,
    },
    {
      q: `Что изучается в теме «${input.topic}»?`,
      a: `В рамках темы «${input.topic}» по предмету «${input.subject}» рассматриваются ключевые понятия и примеры.`,
    },
    {
      q: `Какие понятия важны в теме «${input.topic}»?`,
      a: `Загрузите больше учебного материала, чтобы карточки получились содержательнее.`,
    },
    {
      q: `Приведи пример из темы «${input.topic}».`,
      a: `Примеры можно найти в учебнике ${input.grade} класса по предмету «${input.subject}».`,
    },
  ];
  const t = templates[i % templates.length];
  return {
    question: t.q,
    answer: t.a,
    source: input.sources[0]?.filename ?? "demo",
    difficulty: input.difficulty,
  };
}

// --- утилиты ---

function capitalize(s: string): string {
  const t = s.trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
