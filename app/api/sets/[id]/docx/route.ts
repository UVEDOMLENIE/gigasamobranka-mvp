import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { sets, cards } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

type RouteCtx = RouteContext<"/api/sets/[id]/docx">;

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    const cookieStore = await cookies();
    const ownerKey = cookieStore.get(process.env.OWNER_KEY_COOKIE_NAME ?? "gs_owner")?.value;
    if (!ownerKey) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const db = getDb();
    const set = await db.query.sets.findFirst({ where: eq(sets.id, id) });
    if (!set) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }
    if (set.ownerKey !== ownerKey) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const cardList = await db
      .select()
      .from(cards)
      .where(eq(cards.setId, id))
      .orderBy(asc(cards.position));

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: set.topic || "Набор карточек",
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: `${set.subject || "—"} · ${set.grade ? `${set.grade} класс` : "—"}`,
              heading: HeadingLevel.HEADING_3,
            }),
            ...cardList.flatMap((c, i) => [
              new Paragraph({
                children: [
                  new TextRun({ text: `${i + 1}. `, bold: true }),
                  new TextRun({ text: c.question, bold: true }),
                ],
              }),
              new Paragraph({
                children: [new TextRun({ text: c.answer })],
              }),
              new Paragraph({ text: "" }),
            ]),
          ],
        },
      ],
    });

    const buf = await Packer.toBuffer(doc);
    const filename = `${(set.topic || "набор").replace(/[^\w\s-а-яА-ЯёЁ]/g, "").trim() || "набор"}.docx`;
    return new NextResponse(buf, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/sets/[id]/docx]", err);
    return NextResponse.json({ error: "Ошибка генерации DOCX" }, { status: 500 });
  }
}
