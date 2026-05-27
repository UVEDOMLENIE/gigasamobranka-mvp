import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { sets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const ownerKey = cookieStore.get(process.env.OWNER_KEY_COOKIE_NAME ?? "gs_owner")?.value;
    if (!ownerKey) {
      return NextResponse.json({ items: [] });
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(sets)
      .where(eq(sets.ownerKey, ownerKey))
      .orderBy(desc(sets.createdAt))
      .limit(100);

    const items = rows.map((r) => {
      let settings: Record<string, unknown> = {};
      try {
        settings = JSON.parse(r.settings);
      } catch {
        settings = {};
      }
      return {
        id: r.id,
        subject: r.subject,
        grade: r.grade,
        topic: r.topic,
        difficulty: (settings.difficulty as string) || "medium",
        count: (settings.count as number) || 0,
        created_at: r.createdAt,
      };
    });

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[GET /api/library]", err);
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
