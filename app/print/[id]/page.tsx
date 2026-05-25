import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { sets, cards } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

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

      {/* Кнопка печати */}
      <div className="no-print p-4 bg-amber-50 flex gap-3">
        <button
          onClick={() => window.print()}
          className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          🖨 Печать
        </button>
        <a href={`/sets/${id}`} className="text-amber-600 text-sm self-center hover:underline">
          ← Редактор
        </a>
      </div>

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
              <p className="text-sm font-medium text-gray-800 whitespace-pre-wrap">
                {card.question}
              </p>
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
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {card.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
