"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  subject: string | null;
  grade: string | null;
  topic: string | null;
  difficulty: string;
  count: number;
  created_at: number;
};

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function LibraryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((j) => setItems(j.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-amber-900">📚 Мои наборы</h1>
          <Link href="/" className="text-sm text-amber-700 hover:text-amber-900 underline">
            ← На главную
          </Link>
        </div>

        {loading && <p className="text-sm text-amber-700">Загружаю…</p>}

        {!loading && items.length === 0 && (
          <div className="bg-white rounded-2xl border border-amber-100 p-8 text-center">
            <p className="text-amber-700">Пока нет наборов.</p>
            <Link href="/" className="text-amber-900 underline mt-2 inline-block">
              Создать первый набор →
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="bg-white rounded-xl border border-amber-100 p-4 flex items-center justify-between hover:border-amber-300 transition"
              >
                <div className="min-w-0">
                  <p className="font-medium text-amber-900 truncate">{it.topic || "Без названия"}</p>
                  <p className="text-xs text-amber-700/70">
                    {it.subject || "—"} · {it.grade ? `${it.grade} класс` : "—"} · {it.difficulty === "easy" ? "лёгкие" : it.difficulty === "hard" ? "сложные" : "средние"} · {it.count} карт. · {formatDate(it.created_at)}
                  </p>
                </div>
                <div className="flex gap-2 ml-3 shrink-0">
                  <Link
                    href={`/sets/${it.id}`}
                    className="text-xs bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg px-3 py-1.5"
                  >
                    Редактор
                  </Link>
                  <Link
                    href={`/play/${it.id}`}
                    className="text-xs bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg px-3 py-1.5"
                  >
                    Плеер
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
