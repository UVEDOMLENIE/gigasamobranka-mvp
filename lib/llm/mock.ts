import type { CardDraft, GenerateInput } from "./types";

/**
 * Детерминированный mock-генератор карточек.
 * Используется когда USE_MOCK_LLM=true или реальный GigaChat недоступен/упал.
 * Демо не должно умирать из-за токенов.
 */
export function mockGenerate(input: GenerateInput): CardDraft[] {
  const corpus = input.sources
    .map((s) => `[${s.filename}]\n${s.text}`)
    .join("\n\n");

  const sentences = extractSentences(corpus, 200);
  const cards: CardDraft[] = [];

  for (let i = 0; i < input.count; i++) {
    const sentence = sentences[i % Math.max(sentences.length, 1)];
    if (!sentence) {
      cards.push({
        question: `Вопрос ${i + 1} по теме «${input.topic}»`,
        answer: `(mock) Ответ ${i + 1}. Реальная генерация подключится при наличии GigaChat-ключа.`,
        source: input.sources[0]?.filename ?? "mock",
        difficulty: input.difficulty,
      });
      continue;
    }
    cards.push(makeCardFromSentence(sentence, input, i));
  }

  return cards;
}

function makeCardFromSentence(
  sentence: string,
  input: GenerateInput,
  index: number,
): CardDraft {
  const clean = sentence.replace(/\[[^\]]+\]/g, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const keyword = pickKeyword(words);

  const question = keyword
    ? `Что означает «${keyword}» в теме «${input.topic}»?`
    : `Раскрой смысл по теме «${input.topic}» (фрагмент ${index + 1}).`;

  const sourceMatch = sentence.match(/\[([^\]]+)\]/);
  const sourceName = sourceMatch?.[1] ?? input.sources[0]?.filename ?? "mock";

  return {
    question,
    answer: clean,
    source: sourceName,
    difficulty: input.difficulty,
  };
}

function pickKeyword(words: string[]): string | null {
  // Самое длинное слово ≥ 5 букв, не первое в предложении.
  const candidates = words
    .slice(1)
    .filter((w) => /^[А-Яа-яA-Za-zЁё-]+$/.test(w) && w.length >= 5);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0].toLowerCase();
}

function extractSentences(text: string, max: number): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && s.length <= 400)
    .slice(0, max);
}
