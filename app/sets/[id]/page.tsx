"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { uuid } from "@/lib/id";
import { KatexRender } from "@/components/KatexRender";

type Difficulty = "easy" | "medium" | "hard";
type Card = {
  id: string;
  question: string;
  answer: string;
  source?: string | null;
  difficulty?: Difficulty | null;
  position: number;
};
type SetData = {
  id: string;
  subject: string | null;
  grade: string | null;
  topic: string | null;
  settings: string;
  cards: Card[];
};

export default function SetEditor() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [set, setSet] = useState<SetData | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [genInfo, setGenInfo] = useState<{ provider?: string; usedMock?: boolean }>({});
  const [debugLog, setDebugLog] = useState<unknown>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    fetch(`/api/sets/${id}`)
      .then((r) => r.json())
      .then((data: SetData) => {
        setSet(data);
        setCards(data.cards ?? []);
        try {
          const s = JSON.parse(data.settings || "{}");
          setGenInfo({ provider: s.provider, usedMock: s.usedMock });
        } catch {
          setGenInfo({});
        }
        try {
          const raw = localStorage.getItem(`gs_debug_${id}`);
          if (raw) setDebugLog(JSON.parse(raw));
        } catch {
          setDebugLog(null);
        }
      })
      .catch(() => setError("Не удалось загрузить набор"));
  }, [id]);

  const saveCards = useCallback(
    async (updated: Card[]) => {
      setSaving(true);
      setSaved(false);
      try {
        const res = await fetch(`/api/sets/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cards: updated }),
        });
        if (!res.ok) throw new Error();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setError("Ошибка сохранения");
      } finally {
        setSaving(false);
      }
    },
    [id],
  );

  function updateCard(idx: number, field: keyof Card, value: string) {
    setCards((prev) => {
      const next = prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c));
      saveCards(next);
      return next;
    });
  }

  function deleteCard(idx: number) {
    setCards((prev) => {
      const next = prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, position: i }));
      saveCards(next);
      return next;
    });
  }

  function addCard() {
    setCards((prev) => {
      const next = [
        ...prev,
        { id: uuid(), question: "", answer: "", source: null, difficulty: "medium" as Difficulty, position: prev.length },
      ];
      saveCards(next);
      return next;
    });
  }

  function moveCard(idx: number, dir: -1 | 1) {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= cards.length) return;
    setCards((prev) => {
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      const reindexed = next.map((c, i) => ({ ...c, position: i }));
      saveCards(reindexed);
      return reindexed;
    });
  }

  async function copyStudentLink() {
    const url = `${window.location.origin}/play/${id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      alert("Ссылка скопирована: " + url);
    } catch {
      window.prompt("Скопируйте ссылку ученикам:", url);
    }
  }

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!set) return <div className="p-8 text-gray-500">Загрузка…</div>;

  return (
    <main className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Шапка */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-amber-600 hover:underline mb-2 inline-block">
            ← Новый набор
          </Link>
          <h1 className="text-xl font-bold text-amber-900">
            {set.subject} · {set.grade} кл. · {set.topic}
          </h1>
          <p className="text-sm text-gray-500">
            {cards.length} карточек
            {genInfo.provider && (
              <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${genInfo.usedMock ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                {genInfo.usedMock ? `⚠️ ${genInfo.provider}` : `✓ ${genInfo.provider}`}
              </span>
            )}
          </p>
        </div>

        {/* Статус сохранения */}
        {saved && <p className="text-green-600 text-sm mb-4">✓ Сохранено</p>}
        {saving && <p className="text-gray-400 text-sm mb-4">Сохраняю…</p>}

        {/* Карточки */}
        <div className="space-y-4">
          {cards.map((card, i) => (
            <div
              key={card.id}
              className="bg-white rounded-xl border border-amber-100 shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-400">#{i + 1}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => moveCard(i, -1)}
                    disabled={i === 0}
                    className="text-gray-300 hover:text-gray-500 disabled:opacity-20 px-1"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveCard(i, 1)}
                    disabled={i === cards.length - 1}
                    className="text-gray-300 hover:text-gray-500 disabled:opacity-20 px-1"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => deleteCard(i)}
                    className="text-red-300 hover:text-red-500 px-1 text-sm"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-400">Вопрос</label>
                  <textarea
                    value={card.question}
                    onChange={(e) => updateCard(i, "question", e.target.value)}
                    placeholder="Вопрос"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  />
                  {card.question.includes("$") && (
                    <div className="mt-1 px-3 py-1 bg-amber-50/60 rounded text-sm">
                      <KatexRender text={card.question} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-gray-400">Ответ</label>
                  <textarea
                    value={card.answer}
                    onChange={(e) => updateCard(i, "answer", e.target.value)}
                    placeholder="Ответ"
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  />
                  {card.answer.includes("$") && (
                    <div className="mt-1 px-3 py-1 bg-amber-50/60 rounded text-sm">
                      <KatexRender text={card.answer} />
                    </div>
                  )}
                </div>
                {card.source && (
                  <p className="text-xs text-gray-400">📎 {card.source}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Кнопки */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={addCard}
            className="text-sm border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg px-4 py-2"
          >
            + Добавить карточку
          </button>
          <button
            onClick={() => router.push(`/play/${id}?mode=teacher`)}
            className="text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-4 py-2"
          >
            ▶ Открыть плеер
          </button>
          <button
            onClick={copyStudentLink}
            className="text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-2"
          >
            🔗 Ссылка ученикам
          </button>
          <button
            onClick={() => router.push(`/print/${id}`)}
            className="text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-2"
          >
            🖨 Печать
          </button>
          <a
            href={`/api/sets/${id}/docx`}
            className="text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-2 inline-flex items-center"
          >
            📄 DOCX
          </a>
          <button
            onClick={() => router.push(`/sets/${id}/results`)}
            className="text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg px-4 py-2"
          >
            📊 Результаты
          </button>
          {debugLog && (
            <button
              onClick={() => setShowDebug((s) => !s)}
              className="text-sm border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg px-4 py-2"
            >
              🐛 Отладочный лог
            </button>
          )}
        </div>

        {showDebug && debugLog && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 text-xs font-mono text-gray-700 space-y-2 overflow-auto max-h-96">
            <p className="font-bold text-blue-800">Отладочный лог генерации</p>
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(debugLog, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
