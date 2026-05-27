import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { sets, cards } from "@/lib/db/schema";
import { generateCards } from "@/lib/llm/gigachat";
import { GenerateInputSchema, RuntimeLlmSettingsSchema } from "@/lib/llm/types";
import { uuid, shortKey } from "@/lib/id";
import { checkRateLimit, llmHourLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = GenerateInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Неверные параметры: " + parsed.error.issues[0]?.message },
        { status: 400 },
      );
    }
    const input = parsed.data;
    const runtimeLlm = RuntimeLlmSettingsSchema.safeParse(
      (body as { llm?: unknown }).llm,
    );
    if (!runtimeLlm.success) {
      return NextResponse.json(
        { error: "Неверные настройки LLM" },
        { status: 400 },
      );
    }

    // owner key
    const cookieStore = await cookies();
    const cookieName = process.env.OWNER_KEY_COOKIE_NAME ?? "gs_owner";
    let ownerKey = cookieStore.get(cookieName)?.value;
    if (!ownerKey) {
      ownerKey = shortKey();
      cookieStore.set(cookieName, ownerKey, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    // rate limit
    const rl = checkRateLimit(`llm:${ownerKey}`, llmHourLimit(), 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Превышен лимит запросов. Повторите через ${Math.ceil(rl.retryAfterMs / 60000)} мин.` },
        { status: 429 },
      );
    }

    // generate
    const { cards: drafts, usedMock, provider } = await generateCards(
      input,
      runtimeLlm.data,
    );

    // save
    const db = getDb();
    const setId = uuid();

    await db.insert(sets).values({
      id: setId,
      ownerKey,
      subject: input.subject,
      grade: input.grade,
      topic: input.topic,
      settings: JSON.stringify({ provider, usedMock }),
    });

    const cardRows = drafts.map((d, i) => ({
      id: uuid(),
      setId,
      position: i,
      question: d.question,
      answer: d.answer,
      source: d.source ?? null,
      difficulty: d.difficulty,
    }));

    await db.insert(cards).values(cardRows);

    return NextResponse.json({ setId, usedMock, count: cardRows.length });
  } catch (err) {
    console.error("[/api/generate]", err);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
