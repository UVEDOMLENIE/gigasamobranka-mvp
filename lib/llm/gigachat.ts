import "server-only";
import type { CardDraft, GenerateInput, RuntimeLlmSettings } from "./types";
import { CardDraftArraySchema } from "./types";
import { mockGenerate } from "./mock";

/**
 * Главная точка генерации карточек.
 * Default: mock (если ничего не выбрано — демо работает без ключа).
 * Если выбран scarlex/gigachat, но ключ пустой — fallback на mock.
 * Если реальный API падает — тоже fallback на mock.
 */
export type LlmDebug = {
  prompt?: string;
  url?: string;
  status?: number;
  rawResponse?: string;
  error?: string;
};

export async function generateCards(
  input: GenerateInput,
  runtime?: RuntimeLlmSettings,
): Promise<{
  cards: CardDraft[];
  usedMock: boolean;
  reason?: string;
  provider: "mock" | "scarlex" | "gigachat";
  debug?: LlmDebug;
}> {
  const envProvider = process.env.LLM_PROVIDER as
    | "mock"
    | "scarlex"
    | "gigachat"
    | undefined;
  const provider = runtime?.provider ?? envProvider ?? "mock";

  if (provider === "mock") {
    return {
      cards: mockGenerate(input),
      usedMock: true,
      reason: "provider=mock",
      provider: "mock",
    };
  }

  if (provider === "scarlex") {
    const apiKey = runtime?.apiKey ?? process.env.SCARLEX_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        cards: mockGenerate(input),
        usedMock: true,
        reason: "Scarlex API key отсутствует",
        provider: "scarlex",
        debug: { error: "Scarlex API key отсутствует" },
      };
    }

    try {
      const { cards, debug } = await callOpenAiCompatible(input, {
        apiKey,
        baseUrl:
          runtime?.baseUrl ??
          process.env.SCARLEX_BASE_URL ??
          process.env.OPENAI_BASE_URL ??
          "https://api.scarlex.ru/v1",
        model: runtime?.model ?? process.env.SCARLEX_MODEL ?? "claude-haiku-4-7",
      });
      return { cards, usedMock: false, provider: "scarlex", debug };
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown scarlex error";
      console.error(`[generateCards/scarlex] fallback to mock: ${reason}`);
      return { cards: mockGenerate(input), usedMock: true, reason, provider: "scarlex", debug: { error: reason } };
    }
  }

  const authKey =
    runtime?.authKey ??
    runtime?.apiKey ??
    process.env.GIGACHAT_AUTH_KEY ??
    process.env.GIGACHAT_API_KEY;
  if (!authKey) {
    return {
      cards: mockGenerate(input),
      usedMock: true,
      reason: "GigaChat Auth Key отсутствует",
      provider: "gigachat",
    };
  }

  try {
    const cards = await callGigaChat(input, {
      authKey,
      baseUrl: runtime?.baseUrl,
      oauthUrl: runtime?.oauthUrl,
      scope: runtime?.scope,
      model: runtime?.model,
    });
    return { cards, usedMock: false, provider: "gigachat" };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown gigachat error";
    return { cards: mockGenerate(input), usedMock: true, reason, provider: "gigachat" };
  }
}

// ----------- Low-level LLM clients -----------

let cachedToken: { authKey: string; value: string; expiresAt: number } | null = null;

async function getAccessToken(
  authKey: string,
  oauthUrl?: string,
  scopeOverride?: string,
): Promise<string> {
  if (
    cachedToken &&
    cachedToken.authKey === authKey &&
    cachedToken.expiresAt > Date.now() + 60_000
  ) {
    return cachedToken.value;
  }
  const url =
    oauthUrl ??
    process.env.GIGACHAT_OAUTH_URL ??
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";
  const scope = scopeOverride ?? process.env.GIGACHAT_SCOPE ?? "GIGACHAT_API_PERS";
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
    authKey,
    value: json.access_token,
    expiresAt: json.expires_at * 1000,
  };
  return cachedToken.value;
}

async function callGigaChat(
  input: GenerateInput,
  config: {
    authKey: string;
    baseUrl?: string;
    oauthUrl?: string;
    scope?: string;
    model?: string;
  },
): Promise<CardDraft[]> {
  const token = await getAccessToken(config.authKey, config.oauthUrl, config.scope);
  const base =
    config.baseUrl ??
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
      model: config.model ?? "GigaChat",
      temperature: 0.4,
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "Ты методист. Ответь JSON-массивом карточек [{question,answer,source,difficulty}] без пояснений.",
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

async function callOpenAiCompatible(
  input: GenerateInput,
  config: {
    apiKey: string;
    baseUrl: string;
    model: string;
  },
): Promise<{ cards: CardDraft[]; debug: LlmDebug }> {
  const base = config.baseUrl.replace(/\/$/, "");
  const prompt = buildPrompt(input);
  const url = `${base}/chat/completions`;

  console.error(`[Scarlex] POST ${url} model=${config.model}`);
  console.error(`[Scarlex] Prompt (first 800 chars):\n${prompt.slice(0, 800)}...`);

  const MAX_RETRIES = 3;
  const BACKOFF_MS = [1000, 3000, 9000];

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 1) {
      console.error(`[Scarlex] Retry attempt ${attempt}/${MAX_RETRIES}`);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.4,
        stream: false,
        max_tokens: 4096,
        messages: [
          {
            role: "system",
            content:
              "Ты методист. Ответь JSON-массивом карточек [{question,answer,source,difficulty}] без пояснений.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    console.error(`[Scarlex] Response status: ${res.status} (attempt ${attempt}/${MAX_RETRIES})`);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[Scarlex] Error body (first 500):\n${body.slice(0, 500)}`);

      if (res.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = res.headers.get("Retry-After");
        let delay: number;
        if (retryAfter) {
          delay = parseInt(retryAfter, 10) * 1000;
          console.error(`[Scarlex] 429 → waiting ${delay}ms (Retry-After)`);
        } else {
          delay = BACKOFF_MS[attempt - 1];
          console.error(`[Scarlex] 429 → waiting ${delay}ms (backoff)`);
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (res.status === 429) {
        throw new Error("Scarlex rate-limited 3 retries");
      }

      throw new Error(`OpenAI-compatible chat failed: ${res.status}`);
    }

    // Scarlex ВСЕГДА возвращает SSE (chat.completion.chunk), даже при stream:false
    const bodyText = await res.text();
    console.error(`[Scarlex] Raw body (first 500 chars):\n${bodyText.slice(0, 500)}...`);

    const parts: string[] = [];
    for (const line of bodyText.trim().split("\n")) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") break;
      try {
        const obj = JSON.parse(payload) as {
          choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
        };
        const content = obj.choices?.[0]?.delta?.content ?? "";
        parts.push(content);
      } catch {
        // игнорируем битые строки
      }
    }

    const raw = parts.join("").trim();
    console.error(`[Scarlex] Extracted content (first 800 chars):\n${raw.slice(0, 800)}...`);

    if (!raw) {
      if (attempt < MAX_RETRIES) {
        console.error(`[Scarlex] Empty completion → retry ${attempt + 1}/${MAX_RETRIES}`);
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt - 1]));
        continue;
      }
      throw new Error("Empty completion");
    }

    const jsonText = extractJson(raw);
    const parsed = CardDraftArraySchema.safeParse(JSON.parse(jsonText));
    if (!parsed.success) {
      console.error(`[Scarlex] Schema validation failed. Extracted JSON:\n${jsonText.slice(0, 500)}`);
      if (attempt < MAX_RETRIES) {
        console.error(`[Scarlex] Schema error → retry ${attempt + 1}/${MAX_RETRIES}`);
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt - 1]));
        continue;
      }
      throw new Error("LLM response failed schema validation");
    }

    const debug: LlmDebug = {
      prompt: prompt.slice(0, 2000),
      url,
      status: res.status,
      rawResponse: raw.slice(0, 2000),
    };
    return { cards: parsed.data, debug };
  }

  // Should never reach here, but just in case
  throw new Error("Scarlex rate-limited 3 retries");
}

function buildPrompt(input: GenerateInput): string {
  const context = input.sources
    .map((s) => `${s.filename}:\n${s.text.slice(0, 2000)}`)
    .join("\n---\n");
  return [
    `Сгенерируй ${input.count} учебных карточек: тема «${input.topic}», ${input.grade} класс, ${input.subject}, сложность ${input.difficulty}.`,
    'Формат: [{"question","answer","source","difficulty"}].',
    'difficulty: easy|medium|hard. source — имя файла.',
    context,
  ].join("\n\n");
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}
