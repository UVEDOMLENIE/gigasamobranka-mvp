import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { cards, sets } from "@/lib/db/schema";
import { findDemo } from "@/lib/demo-materials";
import { uuid, shortKey } from "@/lib/id";
import { generateCards } from "@/lib/llm/gigachat";
import { checkRateLimit, llmHourLimit } from "@/lib/rate-limit";
import { backupDb } from "@/lib/db/blob-sync";

function getRequestOrigin(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  try {
    const origin = getRequestOrigin(req);
    const demoId = req.nextUrl.searchParams.get("id") ?? "";
    const demo = findDemo(demoId);

    if (!demo) {
      return NextResponse.redirect(new URL("/?error=demo-not-found", origin), 303);
    }

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

    const rl = checkRateLimit(`llm:${ownerKey}`, llmHourLimit(), 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.redirect(new URL("/?error=rate-limit", origin), 303);
    }

    const input = {
      subject: demo.subject,
      grade: demo.grade,
      topic: demo.topic,
      count: demo.count,
      difficulty: demo.difficulty,
      sources: [{ filename: `${demo.label}.txt`, text: demo.text }],
    };

    const { cards: drafts } = await generateCards(input, { provider: "mock" });
    const db = await getDb();
    const setId = uuid();

    await db.insert(sets).values({
      id: setId,
      ownerKey,
      subject: input.subject,
      grade: input.grade,
      topic: input.topic,
      settings: "{}",
    });

    await db.insert(cards).values(
      drafts.map((draft, position) => ({
        id: uuid(),
        setId,
        position,
        question: draft.question,
        answer: draft.answer,
        source: draft.source ?? null,
        difficulty: draft.difficulty,
      })),
    );

    await backupDb();
    return NextResponse.redirect(new URL(`/sets/${setId}`, origin), 303);
  } catch (err) {
    console.error("[/api/demo]", err);
    return NextResponse.redirect(new URL("/?error=demo-failed", getRequestOrigin(req)), 303);
  }
}
