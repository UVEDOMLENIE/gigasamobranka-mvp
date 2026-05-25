import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { sessions, answers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/sets/[id]/results">) {
  try {
    const { id } = await ctx.params;
    const db = getDb();

    const allSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.setId, id));

    const result = await Promise.all(
      allSessions.map(async (s) => {
        const ans = await db.select().from(answers).where(eq(answers.sessionId, s.id));
        const known = ans.filter((a) => a.known).length;
        return { ...s, known, total: ans.length };
      }),
    );

    return NextResponse.json({ sessions: result });
  } catch (err) {
    console.error("[GET /api/sets/[id]/results]", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
