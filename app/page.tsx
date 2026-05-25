"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Difficulty = "easy" | "medium" | "hard";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const form = e.currentTarget;
      const data = new FormData(form);

      // Собираем файлы
      const files = fileInputRef.current?.files;
      const sources: { filename: string; text: string }[] = [];

      if (files && files.length > 0) {
        const uploadData = new FormData();
        for (const file of Array.from(files)) uploadData.append("files", file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });
        if (!uploadRes.ok) throw new Error("Ошибка загрузки файлов");
        const { items } = (await uploadRes.json()) as {
          items: { filename: string; text: string }[];
        };
        sources.push(...items);
      }

      // Если ничего не загружено — используем textarea
      const textareaText = (data.get("text") as string)?.trim();
      if (sources.length === 0) {
        if (!textareaText) {
          throw new Error(
            "Загрузите файлы или вставьте текст в поле ниже",
          );
        }
        sources.push({ filename: "вставленный текст", text: textareaText });
      }

      const body = {
        subject: data.get("subject"),
        grade: data.get("grade"),
        topic: data.get("topic"),
        count: Number(data.get("count") ?? 8),
        difficulty: data.get("difficulty") as Difficulty,
        sources,
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `Ошибка сервера (${res.status})`,
        );
      }

      const { setId } = (await res.json()) as { setId: string };
      router.push(`/sets/${setId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-amber-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Шапка */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-amber-900">
            🎒 ГигаСамобранка
          </h1>
          <p className="mt-1 text-amber-700 text-sm">
            Загрузите учебный материал — карточки появятся сами
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 space-y-5"
        >
          {/* Предмет, класс, тема */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Предмет
              </label>
              <input
                name="subject"
                required
                placeholder="Русский язык"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Класс
              </label>
              <input
                name="grade"
                required
                placeholder="3"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тема
            </label>
            <input
              name="topic"
              required
              placeholder="Словарные слова — Зима"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Количество и сложность */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Карточек
              </label>
              <input
                name="count"
                type="number"
                min={3}
                max={30}
                defaultValue={8}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Сложность
              </label>
              <select
                name="difficulty"
                defaultValue="medium"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="easy">Лёгкие</option>
                <option value="medium">Средние</option>
                <option value="hard">Сложные</option>
              </select>
            </div>
          </div>

          {/* Загрузка файлов */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Файлы (TXT, PDF, DOCX, PPTX)
            </label>
            <div
              className="border-2 border-dashed border-amber-200 rounded-xl p-6 text-center cursor-pointer hover:border-amber-400 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-sm text-gray-500">
                Перетащите файлы или{" "}
                <span className="text-amber-600 font-medium">выберите</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                до 10 файлов, по 20 МБ каждый
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.pdf,.docx,.pptx,.md"
                className="hidden"
              />
            </div>
          </div>

          {/* Или текст */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Или вставьте текст напрямую
            </label>
            <textarea
              name="text"
              rows={4}
              placeholder="Вставьте учебный текст, словарные слова, конспект..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
            />
          </div>

          {/* Ошибка */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Кнопка */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition text-sm"
          >
            {loading ? "Генерирую карточки…" : "✨ Сгенерировать карточки"}
          </button>
        </form>
      </div>
    </main>
  );
}
