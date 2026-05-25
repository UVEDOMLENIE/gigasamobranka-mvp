import "server-only";
import type { CardDraft, GenerateInput } from "./types";
import { CardDraftArraySchema } from "./types";
import { mockGenerate } from "./mock";

/**
 * Главная точка генерации карточек.
 * Если USE_MOCK_LLM=true или ключа нет — возвращаем mock-карточки.
 * Если реальный API падает — тоже fallback на mock. Демо не должно умирать.
 */
export async function generateCards(input: GenerateInput): Promise<{
  cards: CardDraft[];
  usedMock: boolean;
  reason?: string;
}> {
  if (process.env.USE_MOCK_LLM === "true") {
    return { cards: mockGenerate(input), usedMock: true, reason: "USE_MOCK_LLM=true" };
  }
  const authKey = process.env.GIGACHAT_AUTH_KEY;
  if (!authKey) {
    return {
      cards: mockGenerate(input),
      usedMock: true,
      reason: "GIGACHAT_AUTH_KEY отсутствует",
    };
  }

  try {
    const cards = await callGigaChat(input, authKey);
    return { cards, usedMock: false };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown gigachat error";
    return { cards: mockGenerate(input), usedMock: true, reason };
  }
}

// ----------- GigaChat low-level (заготовка под Phase 2) -----------

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(authKey: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const url =
    process.env.GIGACHAT_OAUTH_URL ??
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
  const scope = process.env.GIGACHAT_SCOPE ?? "GIGACHAT_API_PERS";
  const rqUid = crypto.randomUUID();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: rqUid,
      Authorization: `Basic ${authKey}`,
    },
    body: new URLSearchParams({ scope }),
  });
  if (!res.ok) {
    throw new Error(`GigaChat OAuth failed: ${res.status}`);
  }
  const json = (await res.json()) as { access_token: string; expires_at: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: json.expires_at * 1000,
  };
  return cachedToken.value;
}

async function callGigaChat(
  input: GenerateInput,
  authKey: string,
): Promise<CardDraft[]> {
  const token = await getAccessToken(authKey);
  const base =
    process.env.GIGACHAT_BASE_URL ??
    "https://gigachat.devices.sberbank.ru/api/v1";

  const prompt = buildPrompt(input);
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: "GigaChat",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "Ты — методист российской школы. Возвращай только валидный JSON-массив.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GigaChat chat failed: ${res.status}`);
  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const raw = json.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("Empty completion");

  const jsonText = extractJson(raw);
  const parsed = CardDraftArraySchema.safeParse(JSON.parse(jsonText));
  if (!parsed.success) {
    throw new Error("LLM response failed schema validation");
  }
  return parsed.data;
}

function buildPrompt(input: GenerateInput): string {
  const context = input.sources
    .map((s) => `Файл: ${s.filename}\n${s.text.slice(0, 8000)}`)
    .join("\n---\n");
  return [
    `Сгенерируй ровно ${input.count} учебных карточек на тему «${input.topic}»`,
    `для ${input.grade} класса по предмету ${input.subject}.`,
    `Уровень сложности: ${input.difficulty}.`,
    "Используй только материал ниже. Если в материале есть формулы — сохрани их в LaTeX между $...$.",
    "Каждая карточка: { question, answer, source, difficulty }.",
    'difficulty ∈ { "easy", "medium", "hard" }.',
    "source — имя файла или короткая цитата куска, на котором основан вопрос.",
    "Верни строго JSON-массив без пояснений.",
    "",
    "Материал:",
    "---",
    context,
    "---",
  ].join("\n");
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}
