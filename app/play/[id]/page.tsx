"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Card = {
  id: string;
  question: string;
  answer: string;
  source?: string | null;
};
type SetData = { id: string; subject: string | null; grade: string | null; topic: string | null; cards: Card[] };

export default function Player() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isTeacher = searchParams.get("mode") === "teacher";

  const [set, setSet] = useState<SetData | null>(null);
  const [studentName, setStudentName] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ known: number; total: number }>({ known: 0, total: 0 });
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(0);

  useEffect(() => {
    fetch(`/api/sets/${id}`)
      .then((r) => r.json())
      .then((data: SetData) => {
        setSet(data);
        setOrder(data.cards.map((_, i) => i));
        setLoading(false);
      });
  }, [id]);

  async function startSession() {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ setId: id, studentName }),
    });
    const { sessionId: sid } = await res.json();
    setSessionId(sid);
    setStartTime(Date.now());
  }

  async function answer(known: boolean) {
    if (!set) return;
    const cardIdx = order[current];
    const card = set.cards[cardIdx];
    const timeMs = Date.now() - startTime;

    if (sessionId) {
      await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, cardId: card.id, known, timeMs }),
      });
    }

    setResults((r) => ({ known: r.known + (known ? 1 : 0), total: r.total + 1 }));
    setFlipped(false);
    setStartTime(Date.now());

    if (current + 1 >= order.length) {
      // завершить сессию
      if (sessionId) {
        await fetch("/api/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
      }
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
    }
  }

  function shuffle() {
    setOrder((o) => [...o].sort(() => Math.random() - 0.5));
    setCurrent(0);
    setFlipped(false);
    setDone(false);
    setResults({ known: 0, total: 0 });
  }

  if (loading) return <div className="p-8 text-gray-500">Загрузка…</div>;
  if (!set) return <div className="p-8 text-red-600">Набор не найден</div>;

  // Экран ввода имени (режим ученика)
  if (!isTeacher && !sessionId) {
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8 max-w-sm w-full text-center">
          <p className="text-2xl mb-1">📖</p>
          <h1 className="font-bold text-lg text-amber-900 mb-1">
            {set.topic}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {set.subject} · {set.grade} кл. · {set.cards.length} карточек
          </p>
          <input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && studentName.trim() && startSession()}
            placeholder="Введите своё имя"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base mb-4 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            disabled={!studentName.trim()}
            onClick={startSession}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3"
          >
            Начать ▶
          </button>
        </div>
      </main>
    );
  }

  // Экран результатов
  if (done) {
    const pct = Math.round((results.known / results.total) * 100);
    return (
      <main className="min-h-screen bg-amber-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-2">🎉</p>
          <h2 className="text-xl font-bold text-amber-900 mb-1">
            {pct >= 80 ? "Молодец!" : pct >= 50 ? "Хорошая работа!" : "Продолжай!"}
          </h2>
          <p className="text-gray-600 mb-6">
            Знал {results.known} из {results.total} ({pct}%)
          </p>
          <div className="space-y-3">
            <button
              onClick={() => { setCurrent(0); setFlipped(false); setDone(false); setResults({ known: 0, total: 0 }); }}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 font-medium"
            >
              Пройти заново
            </button>
            {!isTeacher && (
              <Link
                href={`/sets/${id}`}
                className="block w-full border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl py-2.5 font-medium"
              >
                Вернуться к редактору
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  const cardIdx = order[current];
  const card = set.cards[cardIdx];

  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center px-4 py-8">
      {/* Прогресс */}
      <div className="w-full max-w-lg mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{current + 1} / {order.length}</span>
          <span>✓ {results.known}</span>
        </div>
        <div className="h-2 bg-amber-100 rounded-full">
          <div
            className="h-2 bg-amber-400 rounded-full transition-all"
            style={{ width: `${((current) / order.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Карточка */}
      <div
        className="w-full max-w-lg min-h-56 bg-white rounded-2xl border border-amber-100 shadow-md flex flex-col items-center justify-center p-8 cursor-pointer select-none"
        onClick={() => setFlipped((f) => !f)}
      >
        {!flipped ? (
          <>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Вопрос</p>
            <p className="text-xl font-semibold text-gray-800 text-center whitespace-pre-wrap">
              {card.question}
            </p>
            <p className="text-xs text-gray-300 mt-6">Нажмите чтобы увидеть ответ</p>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-4">Ответ</p>
            <p className="text-lg text-gray-700 text-center whitespace-pre-wrap">
              {card.answer}
            </p>
            {card.source && (
              <p className="text-xs text-gray-300 mt-4">📎 {card.source}</p>
            )}
          </>
        )}
      </div>

      {/* Кнопки ответа */}
      {flipped && (
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => answer(false)}
            className="px-8 py-3 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-sm"
          >
            ✗ Не знал
          </button>
          <button
            onClick={() => answer(true)}
            className="px-8 py-3 rounded-xl bg-green-100 hover:bg-green-200 text-green-700 font-semibold text-sm"
          >
            ✓ Знал
          </button>
        </div>
      )}

      {/* Вспомогательные кнопки */}
      <div className="flex gap-3 mt-6 text-xs text-gray-400">
        <button onClick={shuffle} className="hover:text-gray-600">
          🔀 Перемешать
        </button>
        {isTeacher && (
          <Link href={`/sets/${id}`} className="hover:text-gray-600">
            ← Редактор
          </Link>
        )}
      </div>
    </main>
  );
}
