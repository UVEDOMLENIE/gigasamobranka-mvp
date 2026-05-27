"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { KatexRender } from "@/components/KatexRender";

type Card = {
  id: string;
  question: string;
  answer: string;
  source?: string | null;
};
type SetData = {
  id: string;
  subject: string | null;
  grade: string | null;
  topic: string | null;
  cards: Card[];
};

export default function Player() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const [attempts, setAttempts] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/sets/${id}`)
      .then((r) => r.json())
      .then((data: SetData) => {
        setSet(data);
        setOrder(data.cards.map((_, i) => i));
        setLoading(false);
      });
  }, [id]);

  // Fullscreen tracking
  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Load play settings
  useEffect(() => {
    try {
      const raw = localStorage.getItem("gs_play_settings");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.timerSec === "number") setTimerSec(parsed.timerSec);
        if (typeof parsed.attempts === "number") setAttempts(parsed.attempts);
      }
    } catch { /* ignore */ }
  }, []);

  // Save play settings
  useEffect(() => {
    localStorage.setItem("gs_play_settings", JSON.stringify({ timerSec, attempts }));
  }, [timerSec, attempts]);

  // Auto-flip timer
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!timerSec || flipped || done || !set) return;
    timerRef.current = setTimeout(() => setFlipped(true), timerSec * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timerSec, flipped, done, current, set]);

  // Keyboard shortcuts (для учителя на доске)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!sessionId && !isTeacher) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!flipped) setFlipped(true);
      } else if (e.key === "ArrowLeft") {
        if (current > 0) {
          setCurrent((c) => c - 1);
          setFlipped(false);
        }
      } else if (e.key === "ArrowRight") {
        if (flipped) answer(true);
      } else if (e.key === "1" || e.key.toLowerCase() === "n") {
        if (flipped) answer(false);
      } else if (e.key === "2" || e.key.toLowerCase() === "y") {
        if (flipped) answer(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, flipped, sessionId, isTeacher]);

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.();
    } else {
      await document.exitFullscreen?.();
    }
  }

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

  function restart() {
    setCurrent(0);
    setFlipped(false);
    setDone(false);
    setResults({ known: 0, total: 0 });
  }

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-amber-700">
        <span className="animate-pulse">Загружаю карточки…</span>
      </div>
    );

  if (!set || set.cards.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-3">
        <p className="text-2xl">📭</p>
        <p className="text-gray-600">Набор пустой</p>
        <Link href={`/sets/${id}`} className="text-amber-600 hover:underline text-sm">
          Открыть редактор
        </Link>
      </div>
    );

  // Экран ввода имени (режим ученика)
  if (!isTeacher && !sessionId) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-md border border-amber-100 p-8 max-w-sm w-full text-center">
          <div className="text-5xl mb-3">📖</div>
          <h1 className="font-bold text-xl text-amber-900 mb-1">{set.topic}</h1>
          <p className="text-sm text-gray-500 mb-6">
            {set.subject} · {set.grade} кл. · {set.cards.length} карточек
          </p>
          <input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && studentName.trim() && startSession()}
            placeholder="Введи имя"
            autoFocus
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base text-center mb-4 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            disabled={!studentName.trim()}
            onClick={startSession}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl py-3 text-base shadow-sm"
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
    const praise =
      pct >= 90 ? "Великолепно!" :
      pct >= 75 ? "Отлично!" :
      pct >= 50 ? "Хорошая работа!" :
      "Продолжай учиться!";
    const emoji =
      pct >= 90 ? "🌟" : pct >= 75 ? "🎉" : pct >= 50 ? "👏" : "💪";

    return (
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-md border border-amber-100 p-8 max-w-sm w-full text-center animate-flip-in">
          <div className="text-6xl mb-3">{emoji}</div>
          <h2 className="text-2xl font-bold text-amber-900 mb-2">{praise}</h2>
          <p className="text-gray-600 mb-1">
            Знал {results.known} из {results.total}
          </p>
          <div className="text-4xl font-bold text-amber-500 mb-6">{pct}%</div>
          <div className="space-y-2">
            <button
              onClick={restart}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-3 font-medium shadow-sm"
            >
              Пройти заново
            </button>
            <button
              onClick={shuffle}
              className="w-full border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl py-2.5 font-medium text-sm"
            >
              🔀 Перемешать и пройти
            </button>
            {isTeacher && (
              <Link
                href={`/sets/${id}`}
                className="block w-full text-gray-500 hover:text-gray-700 py-2 text-sm"
              >
                ← Редактор
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  const cardIdx = order[current];
  const card = set.cards[cardIdx];
  const progressPct = ((current + (flipped ? 0.5 : 0)) / order.length) * 100;

  return (
    <main
      ref={containerRef}
      className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex flex-col items-center justify-center px-4 py-8"
    >
      {/* Прогресс */}
      <div className="w-full max-w-xl mb-6">
        <div className="flex justify-between text-xs text-amber-700/70 mb-1.5">
          <span>{current + 1} / {order.length}</span>
          <span>✓ {results.known}</span>
        </div>
        <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
          <div
            className="h-2 bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Карточка */}
      <div
        key={`${cardIdx}-${flipped}`}
        className="w-full max-w-xl min-h-64 bg-white rounded-3xl border border-amber-100 shadow-lg flex flex-col items-center justify-center p-8 cursor-pointer select-none animate-flip-in"
        onClick={() => setFlipped((f) => !f)}
      >
        {!flipped ? (
          <>
            <p className="text-xs text-amber-600 uppercase tracking-wide mb-4 font-medium">
              Вопрос
            </p>
            <KatexRender
              text={card.question}
              className="text-2xl font-semibold text-gray-800 text-center leading-snug"
            />
            <p className="text-xs text-gray-300 mt-8">Нажмите чтобы увидеть ответ</p>
          </>
        ) : (
          <>
            <p className="text-xs text-amber-600 uppercase tracking-wide mb-4 font-medium">
              Ответ
            </p>
            <KatexRender
              text={card.answer}
              className="text-lg text-gray-700 text-center leading-relaxed"
            />
            {card.source && (
              <p className="text-xs text-amber-700/50 mt-6">📎 {card.source}</p>
            )}
          </>
        )}
      </div>

      {/* Кнопки ответа */}
      {flipped && (
        <div className="flex gap-3 mt-6 animate-flip-in">
          <button
            onClick={() => answer(false)}
            className="px-8 py-4 rounded-2xl bg-red-100 hover:bg-red-200 active:scale-95 text-red-700 font-bold text-base transition shadow-sm"
          >
            ✗ Не знал
          </button>
          <button
            onClick={() => answer(true)}
            className="px-8 py-4 rounded-2xl bg-green-100 hover:bg-green-200 active:scale-95 text-green-700 font-bold text-base transition shadow-sm"
          >
            ✓ Знал
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-3 mt-8 text-xs text-amber-700/60">
        <button onClick={shuffle} className="hover:text-amber-700 transition">
          🔀 Перемешать
        </button>
        <button
          onClick={() => setTimerSec((s) => (s === 0 ? 15 : s === 15 ? 30 : s === 30 ? 60 : 0))}
          className="hover:text-amber-700 transition"
          title="Время на просмотр карточки"
        >
          ⏱ {timerSec ? `${timerSec}с` : "∞"}
        </button>
        <button
          onClick={() => setAttempts((a) => (a >= 3 ? 1 : a + 1))}
          className="hover:text-amber-700 transition"
          title="Попытки (пока только UI)"
        >
          🔁 {attempts}
        </button>
        <button onClick={toggleFullscreen} className="hover:text-amber-700 transition">
          {isFullscreen ? "⤓ Выйти" : "⛶ На весь экран"}
        </button>
        {isTeacher && (
          <Link href={`/sets/${id}`} className="hover:text-amber-700 transition">
            ← Редактор
          </Link>
        )}
      </div>

      {/* Подсказка клавиш для учителя */}
      {isTeacher && !isFullscreen && (
        <p className="text-xs text-amber-700/30 mt-4 text-center">
          ⌨️ Пробел — открыть · Y — знал · N — не знал · ← / →
        </p>
      )}
    </main>
  );
}
