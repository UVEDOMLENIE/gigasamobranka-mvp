import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { sets, cards } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

type RouteCtx = RouteContext<"/api/sets/[id]">;

// GET /api/sets/[id] — получить набор с карточками
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const db = await getDb();
    const set = await db.query.sets.findFirst({ where: eq(sets.id, id) });
    if (!set) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

    const cardList = await db
      .select()
      .from(cards)
      .where(eq(cards.setId, id))
      .orderBy(asc(cards.position));

    return NextResponse.json({ ...set, cards: cardList });
  } catch (err) {
    console.error("[GET /api/sets/[id]]", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}

// PUT /api/sets/[id] — обновить карточки набора (после редактирования)
export async function PUT(req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const cookieStore = await cookies();
    const ownerKey = cookieStore.get(process.env.OWNER_KEY_COOKIE_NAME ?? "gs_owner")?.value;
    if (!ownerKey)
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

    const db = await getDb();
    const set = await db.query.sets.findFirst({ where: eq(sets.id, id) });
    if (!set) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    if (set.ownerKey !== ownerKey)
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

    const { cards: newCards } = (await req.json()) as {
      cards: { id: string; question: string; answer: string; source?: string; difficulty?: string; position: number }[];
    };

    // Удаляем все, вставляем заново (простой подход для MVP)
    await db.delete(cards).where(eq(cards.setId, id));
    if (newCards.length > 0) {
      await db.insert(cards).values(
        newCards.map((c, i) => ({
          id: c.id,
          setId: id,
          position: c.position ?? i,
          question: c.question,
          answer: c.answer,
          source: c.source ?? null,
          difficulty: (c.difficulty as "easy" | "medium" | "hard") ?? "medium",
        })),
      );
    }

    await db
      .update(sets)
      .set({ updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(sets.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PUT /api/sets/[id]]", err);
    return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 });
  }
}

// DELETE /api/sets/[id] — удалить набор учителя
export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const cookieStore = await cookies();
    const ownerKey = cookieStore.get(process.env.OWNER_KEY_COOKIE_NAME ?? "gs_owner")?.value;
    if (!ownerKey)
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

    const db = await getDb();
    const set = await db.query.sets.findFirst({ where: eq(sets.id, id) });
    if (!set) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    if (set.ownerKey !== ownerKey)
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });

    await db.delete(sets).where(eq(sets.id, id));
    // cards удалятся автоматически по cascade
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/sets/[id]]", err);
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }
}
