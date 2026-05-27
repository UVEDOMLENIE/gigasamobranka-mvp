import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { sessions, answers } from "@/lib/db/schema";
import { uuid } from "@/lib/id";
import { eq } from "drizzle-orm";
import { backupDb } from "@/lib/db/blob-sync";

// POST /api/sessions — создать новую сессию ученика
export async function POST(req: NextRequest) {
  try {
    const { setId, studentName } = (await req.json()) as {
      setId?: string;
      studentName?: string;
    };

    if (!setId || !studentName?.trim())
      return NextResponse.json({ error: "setId и studentName обязательны" }, { status: 400 });

    const db = await getDb();
    const sessionId = uuid();
    await db.insert(sessions).values({
      id: sessionId,
      setId,
      studentName: studentName.trim(),
    });

    await backupDb();
    return NextResponse.json({ sessionId });
  } catch (err) {
    console.error("[/api/sessions POST]", err);
    return NextResponse.json({ error: "Ошибка создания сессии" }, { status: 500 });
  }
}

// PATCH /api/sessions — записать ответ на карточку
export async function PATCH(req: NextRequest) {
  try {
    const { sessionId, cardId, known, timeMs } = (await req.json()) as {
      sessionId?: string;
      cardId?: string;
      known?: boolean;
      timeMs?: number;
    };

    if (!sessionId || !cardId || known === undefined || !timeMs)
      return NextResponse.json({ error: "Неверные параметры" }, { status: 400 });

    const db = await getDb();
    await db.insert(answers).values({
      id: uuid(),
      sessionId,
      cardId,
      known,
      timeMs,
    });

    await backupDb();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/sessions PATCH]", err);
    return NextResponse.json({ error: "Ошибка записи ответа" }, { status: 500 });
  }
}

// PUT /api/sessions — завершить сессию
export async function PUT(req: NextRequest) {
  try {
    const { sessionId } = (await req.json()) as { sessionId?: string };
    if (!sessionId)
      return NextResponse.json({ error: "sessionId обязателен" }, { status: 400 });

    const db = await getDb();
    await db
      .update(sessions)
      .set({ finishedAt: Math.floor(Date.now() / 1000) })
      .where(eq(sessions.id, sessionId));

    await backupDb();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/sessions PUT]", err);
    return NextResponse.json({ error: "Ошибка завершения сессии" }, { status: 500 });
  }
}
