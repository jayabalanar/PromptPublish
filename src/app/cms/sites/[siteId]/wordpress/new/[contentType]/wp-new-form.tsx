"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { WPItem } from "@/lib/wordpress";

export function WPNewForm({
  siteId,
  siteName,
  contentType,
}: {
  siteId: string;
  siteName: string;
  contentType: "pages" | "posts";
}) {
  const router = useRouter();
  const label = contentType === "posts" ? "Post" : "Page";
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(status: "draft" | "publish") {
    if (!title.trim()) { setError("Title is required"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/wp-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contentType, title, content, excerpt, status }),
      });
      const d = await res.json() as WPItem & { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Create failed");
      router.push(`/cms/sites/${siteId}/wordpress/${contentType}/${d.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center gap-4">
        <Link
          href={`/cms/sites/${siteId}/wordpress`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <div>
          <h1 className="text-base font-semibold text-foreground">New {label}</h1>
          <p className="text-xs text-muted-foreground">{siteName}</p>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">{label} title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`My new ${label.toLowerCase()}…`}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your content here (HTML is supported)…"
              rows={16}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
            />
          </div>

          {contentType === "posts" && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Optional short summary shown in listings…"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => submit("draft")}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {loading ? <><Spinner /> Creating…</> : "Create as Draft"}
            </button>
            <button
              onClick={() => submit("publish")}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? <><Spinner /> Creating…</> : "Create & Publish"}
            </button>
          </div>
        </div>
      </div>
    </div>
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
