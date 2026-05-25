import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { sets, cards } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { PrintActions } from "./print-actions";
import { KatexRender } from "@/components/KatexRender";

type Props = { params: Promise<{ id: string }> };

export default async function PrintPage({ params }: Props) {
  const { id } = await params;
  const db = getDb();
  const set = await db.query.sets.findFirst({ where: eq(sets.id, id) });
  if (!set) notFound();

  const cardList = await db
    .select()
    .from(cards)
    .where(eq(cards.setId, id))
    .orderBy(asc(cards.position));

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body { margin: 0; background: white; }
          .no-print { display: none !important; }
          .card-grid { page-break-inside: auto; }
        }
        .card-cell {
          border: 1px dashed #ccc;
          padding: 12px;
          min-height: 90px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      `}</style>

      <PrintActions setId={id} />

      {/* A4 сетка */}
      <div className="p-8 bg-white">
        <h2 className="text-sm font-bold mb-1 text-gray-700">
          {set.subject} · {set.grade} кл. · {set.topic}
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          {cardList.length} карточек · Сторона А: Вопросы
        </p>

        {/* Вопросы — 2×N сетка */}
        <div
          className="card-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
            marginBottom: "16px",
          }}
        >
          {cardList.map((card, i) => (
            <div key={card.id} className="card-cell">
              <p className="text-xs text-gray-400 mb-1">#{i + 1} — вопрос</p>
              <div className="text-sm font-medium text-gray-800">
                <KatexRender text={card.question} />
              </div>
              {card.source && (
                <p className="text-xs text-gray-300 mt-1">📎 {card.source}</p>
              )}
            </div>
          ))}
        </div>

        {/* Разрыв страницы */}
        <div style={{ pageBreakBefore: "always" }} />

        <p className="text-xs text-gray-400 mb-4">Сторона Б: Ответы</p>

        {/* Ответы — зеркально */}
        <div
          className="card-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
          }}
        >
          {/* Зеркалируем: нечётные колонки меняются местами для двусторонней печати */}
          {cardList.map((card, i) => (
            <div key={card.id} className="card-cell">
              <p className="text-xs text-gray-400 mb-1">#{i + 1} — ответ</p>
              <div className="text-sm text-gray-700">
                <KatexRender text={card.answer} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
