"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEMO_MATERIALS } from "@/lib/demo-materials";

type Difficulty = "easy" | "medium" | "hard";
type LlmProvider = "mock" | "scarlex" | "gigachat";
type ClientLlmSettings = {
  provider: LlmProvider;
  apiKey?: string;
  authKey?: string;
  baseUrl?: string;
  oauthUrl?: string;
  scope?: string;
  model?: string;
};

const LLM_SETTINGS_STORAGE_KEY = "gs_llm_settings_v1";

const LOADING_PHRASES = [
  "📖 Читаю учебник…",
  "🔍 Ищу ключевые понятия…",
  "✍️ Формулирую вопросы…",
  "✨ Собираю карточки…",
  "🎒 Готовлю набор для урока…",
];

export default function Home() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0]);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [filesPicked, setFilesPicked] = useState<File[]>([]);
  const [llmSettings, setLlmSettings] = useState<ClientLlmSettings | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = localStorage.getItem(LLM_SETTINGS_STORAGE_KEY);
      if (!raw) return;
      try {
        setLlmSettings(JSON.parse(raw) as ClientLlmSettings);
      } catch {
        localStorage.removeItem(LLM_SETTINGS_STORAGE_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function onFilesChange() {
    const files = fileInputRef.current?.files;
    setFilesPicked(files ? Array.from(files) : []);
  }

  function removeFile(idx: number) {
    setFilesPicked((prev) => prev.filter((_, i) => i !== idx));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setWarning(null);

    if (!subject.trim() || !grade.trim() || !topic.trim()) {
      setError("Заполните предмет, класс и тему");
      return;
    }

    setLoading(true);

    try {
      const sources: { filename: string; text: string }[] = [];

      if (filesPicked.length > 0) {
        const uploadData = new FormData();
        for (const file of filesPicked) uploadData.append("files", file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });
        const uploadJson = (await uploadRes.json().catch(() => ({}))) as {
          error?: string;
          items: { filename: string; text: string }[];
          warnings?: string[];
        };
        if (!uploadRes.ok) {
          throw new Error(uploadJson.error ?? "Ошибка загрузки файлов");
        }
        if (uploadJson.warnings?.length) {
          setWarning(uploadJson.warnings.join("\n"));
        }
        sources.push(...(uploadJson.items ?? []));
      }

      const trimmed = text.trim();
      if (sources.length === 0 && !trimmed) {
        throw new Error("Загрузите файлы или вставьте текст. Или попробуйте готовый пример выше �");
      }
      if (trimmed) {
        sources.push({ filename: "вставленный текст", text: trimmed });
      }

      const payload: {
        subject: string;
        grade: string;
        topic: string;
        count: number;
        difficulty: Difficulty;
        sources: { filename: string; text: string }[];
        llm?: ClientLlmSettings;
      } = { subject, grade, topic, count, difficulty, sources };
      if (llmSettings) payload.llm = llmSettings;

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? `Ошибка сервера (${res.status})`);
      }

      const { setId } = (await res.json()) as { setId: string };
      router.push(`/sets/${setId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      /\.(txt|md|pdf|docx|pptx)$/i.test(f.name),
    );
    if (dropped.length === 0) return;
    // Объединяем с уже выбранными
    const merged = [...filesPicked, ...dropped].slice(0, 10);
    setFilesPicked(merged);
    // Обновляем input через DataTransfer
    const dt = new DataTransfer();
    merged.forEach((f) => dt.items.add(f));
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Шапка */}
        <div className="mb-8 text-center">
          <div className="text-6xl mb-2 inline-block animate-bounce-slow">🎒</div>
          <h1 className="text-4xl font-bold text-amber-900 tracking-tight">
            ГигаСамобранка
          </h1>
          <p className="mt-2 text-amber-700 text-base">
            Открыл учебник — карточки накрыли стол сами
          </p>
        </div>

        {/* Демо: один клик → сразу карточки */}
        <div className="mb-8 bg-white/60 backdrop-blur rounded-2xl border border-amber-200 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-800/80 mb-3 text-center font-medium">
            ⚡ Демо в один клик · сразу сгенерирует
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {DEMO_MATERIALS.map((d) => {
              return (
                <a
                  key={d.id}
                  href={`/api/demo?id=${encodeURIComponent(d.id)}`}
                  className="text-sm bg-white border border-amber-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl px-3 py-2 transition shadow-sm flex items-center gap-1.5"
                >
                  <span className="text-base">{d.emoji}</span>
                  <span>{d.label}</span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Разделитель */}
        <div className="text-center text-xs text-amber-700/50 my-6">
          ── или составь свой набор ──
        </div>

        <form
          onSubmit={handleSubmit}
          method="post"
          action="#"
          noValidate
          className="bg-white rounded-2xl shadow-md border border-amber-100 p-6 space-y-5"
        >
          {/* Предмет, класс */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Предмет</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                placeholder="Русский язык"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Класс</label>
              <input
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                placeholder="3"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тема</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              placeholder="Словарные слова — Зима"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Карточек</label>
              <input
                type="number"
                min={3}
                max={30}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 8)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сложность</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="easy">Лёгкие</option>
                <option value="medium">Средние</option>
                <option value="hard">Сложные</option>
              </select>
            </div>
          </div>

          {/* Файлы */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Файлы (TXT, PDF, DOCX, PPTX)
            </label>
            <div
              className="border-2 border-dashed border-amber-200 rounded-xl p-5 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={onDrop}
            >
              <p className="text-sm text-gray-500">
                Перетащите файлы сюда или{" "}
                <span className="text-amber-600 font-medium">кликните чтобы выбрать</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                до 10 файлов, по 20 МБ
                <br />
                <span className="text-amber-600/80">ZIP пока не распаковываем — загрузите файлы отдельно</span>
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.pdf,.docx,.pptx,.md"
                onChange={onFilesChange}
                className="hidden"
              />
            </div>
            {filesPicked.length > 0 && (
              <div className="mt-2 space-y-1">
                {filesPicked.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <span className="truncate text-amber-900">
                      📄 {f.name}{" "}
                      <span className="text-amber-500">
                        · {(f.size / 1024).toFixed(0)} КБ
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-red-400 hover:text-red-600 ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Текст */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Или вставьте текст напрямую
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={`Вставьте учебный текст, словарные слова, конспект…\nМожно использовать формулы в LaTeX: $S = a \\cdot b$`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
            />
            {text.length > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                {text.length} символов · {text.split(/\s+/).filter(Boolean).length} слов
              </p>
            )}
          </div>

          {/* Ошибка */}
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {warning && (
            <div className="whitespace-pre-line text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              {warning}
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

        <div className="text-center text-xs text-amber-700/60 mt-8 space-y-1">
          <p>ГигаСамобранка · Хакатон СберОбразование × Школа 21</p>
          <p>
            <a href="/settings" className="underline decoration-dotted hover:text-amber-800">
              LLM: {llmSettings?.provider === "scarlex" ? "Scarlex" : llmSettings?.provider === "gigachat" ? "GigaChat" : "Mock"} · настройки
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
