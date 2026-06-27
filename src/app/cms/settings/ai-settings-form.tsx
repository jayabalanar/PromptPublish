"use client";

import { useEffect, useState } from "react";
import { MODEL_PRESETS, PROVIDER_LABELS, type ProviderName } from "@/lib/ai-providers";

const PROVIDERS: ProviderName[] = ["anthropic", "gemini", "nvidia", "openai"];

const PROVIDER_ICONS: Record<ProviderName, React.ReactNode> = {
  anthropic: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <path d="M10.9 3h2.2L18 15h-2.3l-1.1-2.9h-4.9L8.6 15H6.3L10.9 3zm2.1 7.3-1.7-4.6-1.7 4.6h3.4zM4.9 3H7l4.7 12H9.4L8.3 12H3.4L2.3 15H0L4.9 3zm1.6 7.3-1.7-4.6-1.7 4.6h3.4z"/>
    </svg>
  ),
  gemini: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 1.5C9 5.1 6.1 8 2.5 8c3.6 0 6.5 2.9 6.5 6.5C9 10.9 11.9 8 15.5 8 11.9 8 9 5.1 9 1.5z" fill="currentColor"/>
    </svg>
  ),
  nvidia: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <path d="M7.2 6.3V4.9C7.6 4.9 8 4.8 8.4 4.8c3 0 5 1.8 5 4.2 0 2.2-1.7 4-4.8 4.3v-1.4c1.7-.3 2.8-1.4 2.8-2.9C11.4 7.3 9.7 6.3 7.2 6.3zM7.2 13.5V15C3.7 14.7 1.5 12.4 1.5 9s2.2-5.5 5.7-5.8v1.5C4.7 5 3 7 3 9c0 2 1.6 4.1 4.2 4.5z"/>
    </svg>
  ),
  openai: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
      <path d="M16.5 9a7.5 7.5 0 0 1-10.3 6.9L2.5 17l1.1-3.7A7.5 7.5 0 1 1 16.5 9zm-7.5 6a6 6 0 1 0 0-12 6 6 0 0 0 0 12zm-1-8h2v5H8V7zm1-3a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
    </svg>
  ),
};

const KEY_HINT: Record<ProviderName, { label: string; link?: string; placeholder: string }> = {
  anthropic: {
    label: "Anthropic API key",
    link: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-…",
  },
  gemini: {
    label: "Google AI API key",
    link: "https://aistudio.google.com/app/apikey",
    placeholder: "AIza…",
  },
  nvidia: {
    label: "NVIDIA API key",
    link: "https://build.nvidia.com",
    placeholder: "nvapi-…",
  },
  openai: {
    label: "OpenAI API key",
    link: "https://platform.openai.com/api-keys",
    placeholder: "sk-…",
  },
};

interface SettingsState {
  provider: ProviderName;
  model: string;
  anthropicKey: string;
  geminiKey: string;
  nvidiaKey: string;
  openaiKey: string;
}

export function AISettingsForm() {
  const [settings, setSettings] = useState<SettingsState>({
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    anthropicKey: "",
    geminiKey: "",
    nvidiaKey: "",
    openaiKey: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/cms/settings")
      .then((r) => r.json())
      .then((data: Partial<SettingsState>) => {
        setSettings((s) => ({
          ...s,
          provider: (data.provider as ProviderName) ?? "anthropic",
          model: data.model ?? "claude-sonnet-4-6",
          anthropicKey: data.anthropicKey ?? "",
          geminiKey: data.geminiKey ?? "",
          nvidiaKey: data.nvidiaKey ?? "",
          openaiKey: data.openaiKey ?? "",
        }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeKeyField = `${settings.provider}Key` as keyof SettingsState;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/cms/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Spinner /> Loading settings…
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-8">
      {/* Provider selector */}
      <section>
        <h2 className="text-sm font-medium text-foreground mb-3">Provider</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setSettings((s) => ({
                  ...s,
                  provider: p,
                  // Switch model to the first preset for this provider
                  model: MODEL_PRESETS[p][0].id,
                }));
              }}
              className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm font-medium transition-all ${
                settings.provider === p
                  ? "border-brand bg-brand/8 text-brand"
                  : "border-border text-foreground/70 hover:border-brand/40 hover:bg-muted/50"
              }`}
            >
              <span className={settings.provider === p ? "text-brand" : "text-foreground/50"}>
                {PROVIDER_ICONS[p]}
              </span>
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>
      </section>

      {/* API key for active provider */}
      <section>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {KEY_HINT[settings.provider].label}
          {KEY_HINT[settings.provider].link && (
            <a
              href={KEY_HINT[settings.provider].link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 text-xs text-brand hover:underline font-normal"
            >
              Get one ↗
            </a>
          )}
        </label>
        <input
          type="password"
          value={settings[activeKeyField] as string}
          onChange={(e) => setSettings((s) => ({ ...s, [activeKeyField]: e.target.value }))}
          placeholder={settings[activeKeyField] === "***" ? "Already set — paste to replace" : KEY_HINT[settings.provider].placeholder}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Stored server-side in Payload. Never sent to the browser.
        </p>
      </section>

      {/* Model selector */}
      <section>
        <h2 className="text-sm font-medium text-foreground mb-3">Model</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {MODEL_PRESETS[settings.provider].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSettings((s) => ({ ...s, model: m.id }))}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                settings.model === m.id
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border text-foreground/70 hover:border-brand/40"
              }`}
            >
              {m.label}
              {m.note && (
                <span className={`text-[10px] ${settings.model === m.id ? "opacity-70" : "text-muted-foreground"}`}>
                  · {m.note}
                </span>
              )}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={settings.model}
          onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
          placeholder="Custom model ID…"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition"
        />
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? <><Spinner /> Saving…</> : "Save Settings"}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Saved
          </span>
        )}
      </div>
    </form>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
