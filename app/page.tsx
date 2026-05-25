"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEMO_MATERIALS, type DemoMaterial } from "@/lib/demo-materials";

type Difficulty = "easy" | "medium" | "hard";

const LOADING_PHRASES = [
  "📖 Читаю учебник…",
  "🔍 Ищу ключевые понятия…",
  "✍️ Формулирую вопросы…",
  "✨ Собираю карточки…",
  "🎒 Готовлю набор для урока…",
];

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const [error, setError] = useState<string | null>(null);
  const [filesPicked, setFilesPicked] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // прокручивающиеся фразы загрузки
  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % LOADING_PHRASES.length;
      setLoadingPhrase(LOADING_PHRASES[i]);
    }, 1200);
    return () => clearInterval(t);
  }, [loading]);

  function applyDemo(demo: DemoMaterial) {
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem("subject") as HTMLInputElement).value = demo.subject;
    (form.elements.namedItem("grade") as HTMLInputElement).value = demo.grade;
    (form.elements.namedItem("topic") as HTMLInputElement).value = demo.topic;
    (form.elements.namedItem("count") as HTMLInputElement).value = String(demo.count);
    (form.elements.namedItem("difficulty") as HTMLSelectElement).value = demo.difficulty;
    (form.elements.namedItem("text") as HTMLTextAreaElement).value = demo.text;
    setFilesPicked([]);
    setError(null);
  }

  function onFilesChange() {
    const files = fileInputRef.current?.files;
    if (!files) return setFilesPicked([]);
    setFilesPicked(Array.from(files).map((f) => f.name));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const form = e.currentTarget;
      const data = new FormData(form);

      const files = fileInputRef.current?.files;
      const sources: { filename: string; text: string }[] = [];

      if (files && files.length > 0) {
        const uploadData = new FormData();
        for (const file of Array.from(files)) uploadData.append("files", file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Ошибка загрузки файлов");
        }
        const { items } = (await uploadRes.json()) as {
          items: { filename: string; text: string }[];
        };
        sources.push(...items);
      }

      const textareaText = (data.get("text") as string)?.trim();
      if (sources.length === 0) {
        if (!textareaText) {
          throw new Error("Загрузите файлы или вставьте текст. Или попробуйте готовый пример 👇");
        }
        sources.push({ filename: "вставленный текст", text: textareaText });
      } else if (textareaText) {
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
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Шапка с маскотом */}
        <div className="mb-8 text-center">
          <div className="text-6xl mb-2 inline-block animate-bounce-slow">🎒</div>
          <h1 className="text-4xl font-bold text-amber-900 tracking-tight">
            ГигаСамобранка
          </h1>
          <p className="mt-2 text-amber-700 text-base">
            Открыл учебник — карточки накрыли стол сами
          </p>
        </div>

        {/* Демо-материалы */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-amber-700/70 mb-2 text-center font-medium">
            Попробовать на примере
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {DEMO_MATERIALS.map((d) => (
              <button
                key={d.id}
                onClick={() => applyDemo(d)}
                type="button"
                className="text-xs bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-full px-3 py-1.5 transition shadow-sm"
              >
                <span className="mr-1">{d.emoji}</span>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-md border border-amber-100 p-6 space-y-5"
        >
          {/* Предмет, класс */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
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
              className="border-2 border-dashed border-amber-200 rounded-xl p-5 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              {filesPicked.length === 0 ? (
                <>
                  <p className="text-sm text-gray-500">
                    Перетащите файлы или{" "}
                    <span className="text-amber-600 font-medium">выберите</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    до 10 файлов, по 20 МБ
                  </p>
                </>
              ) : (
                <div className="text-left">
                  <p className="text-sm font-medium text-amber-700 mb-1">
                    Выбрано {filesPicked.length}:
                  </p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {filesPicked.map((name) => (
                      <li key={name}>📄 {name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.pdf,.docx,.pptx,.md"
                onChange={onFilesChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Или вставьте текст напрямую
            </label>
            <textarea
              name="text"
              rows={5}
              placeholder="Вставьте учебный текст, словарные слова, конспект…&#10;Можно использовать формулы в LaTeX: $S = a \cdot b$"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
            />
          </div>

          {/* Ошибка */}
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Кнопка */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-70 disabled:cursor-wait text-white font-semibold rounded-xl py-3.5 transition text-base shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2 A 10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span>{loadingPhrase}</span>
              </>
            ) : (
              <>✨ Сгенерировать карточки</>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-amber-700/60 mt-8">
          ГигаСамобранка · Хакатон СберОбразование × Школа 21
        </p>
      </div>
    </main>
  );
}
