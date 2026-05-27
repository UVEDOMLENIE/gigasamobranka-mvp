"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Provider = "mock" | "scarlex" | "gigachat";

type LlmSettings = {
  provider: Provider;
  apiKey: string;
  authKey: string;
  baseUrl: string;
  oauthUrl: string;
  scope: string;
  model: string;
};

const STORAGE_KEY = "gs_llm_settings_v1";

const DEFAULT_SETTINGS: LlmSettings = {
  provider: "mock",
  apiKey: "",
  authKey: "",
  baseUrl: "https://api.scarlex.ru/v1",
  oauthUrl: "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
  scope: "GIGACHAT_API_PERS",
  model: "claude-opus-4-7",
};

const PROVIDER_DEFAULTS: Record<Provider, Partial<LlmSettings>> = {
  mock: {},
  scarlex: {
    baseUrl: "https://api.scarlex.ru/v1",
    model: "claude-opus-4-7",
  },
  gigachat: {
    baseUrl: "https://gigachat.devices.sberbank.ru/api/v1",
    oauthUrl: "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    scope: "GIGACHAT_API_PERS",
    model: "GigaChat",
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<LlmSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function update<K extends keyof LlmSettings>(key: K, value: LlmSettings[K]) {
    setSaved(false);
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateProvider(provider: Provider) {
    setSaved(false);
    setSettings((prev) => ({ ...prev, provider, ...PROVIDER_DEFAULTS[provider] }));
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
  }

  function reset() {
    localStorage.removeItem(STORAGE_KEY);
    setSettings(DEFAULT_SETTINGS);
    setSaved(true);
  }

  const secretType = showSecrets ? "text" : "password";

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-amber-800 hover:text-amber-950">
          ← На главную
        </Link>

        <section className="mt-5 rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Настройки учителя
          </p>
          <h1 className="mt-2 text-3xl font-bold text-amber-950">Ключи генерации</h1>
          <p className="mt-2 text-sm text-gray-600">
            Ключи хранятся только в этом браузере и отправляются на сервер только при генерации.
            В базу и git они не записываются.
          </p>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Режим генерации</span>
              <select
                value={settings.provider}
                onChange={(e) => updateProvider(e.target.value as Provider)}
                className="w-full rounded-xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
              >
                <option value="mock">Mock — быстрое демо без внешнего API</option>
                <option value="scarlex">Scarlex V2 — OpenAI-compatible</option>
                <option value="gigachat">GigaChat — OAuth Basic key</option>
              </select>
            </label>

            {settings.provider === "scarlex" && (
              <div className="space-y-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Scarlex API key</span>
                  <input
                    type={secretType}
                    value={settings.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="sk-scarlex-..."
                    className="w-full rounded-xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
                    autoComplete="off"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Base URL</span>
                  <input
                    value={settings.baseUrl}
                    onChange={(e) => update("baseUrl", e.target.value)}
                    className="w-full rounded-xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Model</span>
                  <input
                    value={settings.model}
                    onChange={(e) => update("model", e.target.value)}
                    className="w-full rounded-xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
                  />
                </label>
              </div>
            )}

            {settings.provider === "gigachat" && (
              <div className="space-y-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">GigaChat Auth Key</span>
                  <input
                    type={secretType}
                    value={settings.authKey}
                    onChange={(e) => update("authKey", e.target.value)}
                    placeholder="Basic auth key из кабинета GigaChat"
                    className="w-full rounded-xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
                    autoComplete="off"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Chat Base URL</span>
                  <input
                    value={settings.baseUrl}
                    onChange={(e) => update("baseUrl", e.target.value)}
                    placeholder="https://gigachat.devices.sberbank.ru/api/v1"
                    className="w-full rounded-xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">OAuth URL</span>
                  <input
                    value={settings.oauthUrl}
                    onChange={(e) => update("oauthUrl", e.target.value)}
                    className="w-full rounded-xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Scope</span>
                  <input
                    value={settings.scope}
                    onChange={(e) => update("scope", e.target.value)}
                    className="w-full rounded-xl border border-amber-200 px-4 py-3 outline-none focus:border-amber-500"
                  />
                </label>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showSecrets}
                onChange={(e) => setShowSecrets(e.target.checked)}
              />
              Показать ключи
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={save}
                className="rounded-xl bg-amber-700 px-5 py-3 font-semibold text-white shadow-sm hover:bg-amber-800"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={reset}
                className="rounded-xl border border-amber-200 bg-white px-5 py-3 font-semibold text-amber-900 hover:bg-amber-50"
              >
                Сбросить
              </button>
              {saved && <span className="self-center text-sm text-green-700">Сохранено</span>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
