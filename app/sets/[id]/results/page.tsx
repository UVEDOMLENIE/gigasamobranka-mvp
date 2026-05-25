"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type SessionRow = {
  id: string;
  studentName: string;
  startedAt: number;
  finishedAt: number | null;
  known: number;
  total: number;
};

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sets/${id}/results`)
      .then((r) => r.json())
      .then((data) => {
        setRows((data as { sessions: SessionRow[] }).sessions ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Не удалось загрузить результаты");
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="p-8 text-gray-500">Загрузка…</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <main className="min-h-screen bg-amber-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href={`/sets/${id}`} className="text-sm text-amber-600 hover:underline mb-4 inline-block">
          ← Назад к редактору
        </Link>
        <h1 className="text-xl font-bold text-amber-900 mb-6">📊 Результаты прохождений</h1>

        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-amber-100 p-8 text-center text-gray-400">
            Пока никто не прошёл этот набор. Поделитесь ссылкой с учениками.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-amber-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Ученик</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Дата</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Результат</th>
                  <th className="px-4 py-3 font-medium text-gray-600">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const pct = row.total > 0 ? Math.round((row.known / row.total) * 100) : 0;
                  const date = new Date(row.startedAt * 1000).toLocaleDateString("ru", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  });
                  return (
                    <tr key={row.id} className="border-t border-gray-50 hover:bg-amber-50/40">
                      <td className="px-4 py-3 font-medium">{row.studentName}</td>
                      <td className="px-4 py-3 text-gray-500">{date}</td>
                      <td className="px-4 py-3">
                        {row.known} / {row.total}
                      </td>
                      <td className="px-4 py-3">
                        <span className={pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-500"}>
                          {pct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
