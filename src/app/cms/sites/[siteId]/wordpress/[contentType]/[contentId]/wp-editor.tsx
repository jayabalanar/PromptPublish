"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createPatch } from "diff";
import type { WPItem, SEOConfig } from "@/lib/wordpress";
import { TourButton } from "@/components/tour";

const WP_EDITOR_TOUR = [
  {
    target: "wp-editor-header",
    title: "WordPress Content Editor",
    body: "You're editing a WordPress page or post. Changes are saved directly to your WordPress site via the REST API — no need to open WP Admin.",
    side: "bottom" as const,
  },
  {
    target: "wp-view-tabs",
    title: "Edit / Preview / Diff",
    body: "Edit shows the title and body as a clean document you can type in directly. Preview renders the HTML in a sandboxed browser view. Diff appears after an AI edit, showing what changed.",
    side: "bottom" as const,
  },
  {
    target: "wp-right-tabs",
    title: "AI Edit & SEO",
    body: "Switch between AI Edit (to generate content changes with a prompt) and SEO (to manage title, description, keywords and focus phrase for this page).",
    side: "left" as const,
  },
  {
    target: "wp-prompt",
    title: "AI Prompt",
    body: "Describe what you want to change — e.g. 'Rewrite the intro paragraph to be more friendly' or 'Add a bullet list of benefits after the heading'. The AI edits only what you describe.",
    side: "left" as const,
  },
  {
    target: "wp-generate-btn",
    title: "Generate Edit",
    body: "Sends the prompt plus the full current content to the AI. You'll see a Diff tab appear so you can review what changed before saving.",
    side: "left" as const,
  },
  {
    target: "wp-save-draft-btn",
    title: "Save as Draft",
    body: "Commits the AI-edited content to WordPress as a draft. The page won't go live until you click Publish.",
    side: "left" as const,
  },
  {
    target: "wp-publish-btn",
    title: "Publish",
    body: "Makes the content live on your WordPress site. You can do this after saving as a draft, or promote the content directly after reviewing the AI diff.",
    side: "left" as const,
  },
  {
    target: "wp-seo-tab-btn",
    title: "SEO Panel",
    body: "Configure SEO title, meta description, keywords, and focus keyphrase. Click 'Generate with AI' to auto-fill these from the page content. Writes to Yoast SEO fields if detected, otherwise uses generic meta.",
    side: "left" as const,
  },
];

type Stage = "idle" | "generating" | "review" | "saving" | "draft" | "publishing" | "published";
type RightTab = "ai-edit" | "seo";

interface EditResult {
  original: string;
  edited: string;
  diff: string;
  explanation: string;
}

export function WPEditor({
  siteId,
  siteName,
  contentType,
  contentId,
  initialItem,
  fetchError,
}: {
  siteId: string;
  siteName: string;
  contentType: "pages" | "posts";
  contentId: number;
  initialItem: WPItem | null;
  fetchError: string;
}) {
  const [item, setItem] = useState<WPItem | null>(initialItem);
  const [content, setContent] = useState(initialItem?.content ?? "");
  const [title, setTitle] = useState(initialItem?.title ?? "");
  const [viewTab, setViewTab] = useState<"edit" | "diff" | "preview">("edit");
  const [rightTab, setRightTab] = useState<RightTab>("ai-edit");
  const [stage, setStage] = useState<Stage>("idle");
  const [editResult, setEditResult] = useState<EditResult | null>(null);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState(fetchError);
  // incremented when AI edit is applied → forces WPDocEditor to re-sync DOM
  const [contentKey, setContentKey] = useState(0);
  // ref-based flush so generateEdit reads latest typed content before sending
  const flushEditorRef = useRef<(() => void) | null>(null);
  // memory: accumulates edit history sent with every AI request
  const [editHistory, setEditHistory] = useState<Array<{ prompt: string; explanation: string }>>([]);

  // SEO state
  const [seo, setSeo] = useState<SEOConfig>({ title: "", description: "", keywords: "", focusPhrase: "", noIndex: false });
  const [hasYoast, setHasYoast] = useState(false);
  const [seoLoaded, setSeoLoaded] = useState(false);
  const [seoSaving, setSeoSaving] = useState(false);
  const [seoError, setSeoError] = useState("");
  const [seoGenerating, setSeoGenerating] = useState(false);

  useEffect(() => {
    if (rightTab === "seo" && !seoLoaded) loadSEO();
  }, [rightTab]);

  async function loadSEO() {
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/wp-content/${contentId}/seo?type=${contentType}`);
      if (!res.ok) throw new Error("Failed to load SEO");
      const d = await res.json() as { seo: SEOConfig; hasYoast: boolean };
      setSeo(d.seo);
      setHasYoast(d.hasYoast);
      setSeoLoaded(true);
    } catch (err) {
      setSeoError(err instanceof Error ? err.message : "Failed to load SEO");
    }
  }

  async function generateEdit() {
    if (!prompt.trim()) return;
    // flush any unsaved contenteditable typing before sending
    flushEditorRef.current?.();
    setStage("generating");
    setError("");
    setViewTab("edit");
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/wp-content/${contentId}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "content",
          content,
          prompt,
          title,
          contentType,
          // Pass accumulated history so AI has memory of all prior edits
          history: editHistory,
        }),
      });
      const d = await res.json() as EditResult & { error?: string };
      if (!res.ok) throw new Error(d.error ?? "AI edit failed");
      setEditResult(d);
      setStage("review");
      setViewTab((v) => v === "preview" ? "preview" : "diff");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setStage("idle");
    }
  }

  async function saveDraft() {
    if (!editResult) return;
    setStage("saving");
    setError("");
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/wp-content/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contentType, content: editResult.edited, status: "draft" }),
      });
      const d = await res.json() as WPItem & { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Save failed");
      setItem(d);
      setContent(d.content);
      setContentKey((k) => k + 1); // re-sync editor DOM with new AI content
      // Record for history so future AI requests have memory of this edit
      setEditHistory((h) => [...h, { prompt, explanation: editResult.explanation }]);
      setStage("draft");
      setViewTab("edit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setStage("review");
    }
  }

  async function publish() {
    setStage("publishing");
    setError("");
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/wp-content/${contentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contentType, status: "publish" }),
      });
      const d = await res.json() as WPItem & { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Publish failed");
      setItem(d);
      setStage("published");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
      setStage("draft");
    }
  }

  function discardEdit() {
    setEditResult(null);
    setStage("idle");
    setViewTab("edit");
    setPrompt("");
  }

  async function saveSEO() {
    setSeoSaving(true);
    setSeoError("");
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/wp-content/${contentId}/seo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contentType, seo, hasYoast }),
      });
      const d = await res.json() as { seo?: SEOConfig; error?: string };
      if (!res.ok) throw new Error(d.error ?? "SEO save failed");
      if (d.seo) setSeo(d.seo);
    } catch (err) {
      setSeoError(err instanceof Error ? err.message : "SEO save failed");
    } finally {
      setSeoSaving(false);
    }
  }

  async function resetSEO() {
    if (!confirm("Reset all SEO fields?")) return;
    setSeoSaving(true);
    try {
      await fetch(`/api/cms/sites/${siteId}/wp-content/${contentId}/seo?type=${contentType}&hasYoast=${hasYoast}`, {
        method: "DELETE",
      });
      setSeo({ title: "", description: "", keywords: "", focusPhrase: "", noIndex: false });
    } catch {
      setSeoError("Reset failed");
    } finally {
      setSeoSaving(false);
    }
  }

  async function generateSEO() {
    setSeoGenerating(true);
    setSeoError("");
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/wp-content/${contentId}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "seo", content, title }),
      });
      const d = await res.json() as { seo?: SEOConfig; error?: string };
      if (!res.ok) throw new Error(d.error ?? "SEO generation failed");
      if (d.seo) setSeo((prev) => ({ ...prev, ...d.seo }));
    } catch (err) {
      setSeoError(err instanceof Error ? err.message : "SEO generation failed");
    } finally {
      setSeoGenerating(false);
    }
  }

  const diffText = editResult
    ? createPatch("content", editResult.original, editResult.edited, "original", "edited")
    : "";

  const isGenerating = stage === "generating" || stage === "saving" || stage === "publishing";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div data-tour="wp-editor-header" className="border-b border-border px-6 py-4 flex items-center gap-4">
        <Link
          href={`/cms/sites/${siteId}/wordpress`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-foreground truncate">{title || "(no title)"}</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{siteName}</span>
            <span className="text-border">·</span>
            <span className="capitalize">{contentType.slice(0, -1)}</span>
            {item && (
              <>
                <span className="text-border">·</span>
                <StatusBadge status={item.status} />
              </>
            )}
          </div>
        </div>
        {item?.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            View live ↗
          </a>
        )}
      </div>

      {/* Main split layout */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: edit / preview / diff panel */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          {/* Panel tabs */}
          <div data-tour="wp-view-tabs" className="border-b border-border px-4 py-2 flex items-center gap-1">
            <ViewTabBtn active={viewTab === "edit"} onClick={() => setViewTab("edit")}>Edit</ViewTabBtn>
            <ViewTabBtn active={viewTab === "preview"} onClick={() => setViewTab("preview")}>Preview</ViewTabBtn>
            <ViewTabBtn active={viewTab === "diff"} onClick={() => setViewTab("diff")} disabled={!editResult}>Diff</ViewTabBtn>
            {editResult && viewTab !== "diff" && (
              <span className="ml-auto text-xs text-muted-foreground italic truncate max-w-[200px]">
                {editResult.explanation}
              </span>
            )}
          </div>

          {/* Edit / Preview / Diff body */}
          <div className="flex-1 overflow-hidden">
            {viewTab === "edit" ? (
              <WPDocEditor
                title={title}
                content={content}
                contentKey={contentKey}
                disabled={isGenerating}
                onTitleChange={setTitle}
                onContentChange={setContent}
                onFlushRef={flushEditorRef}
              />
            ) : viewTab === "preview" ? (
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:2rem auto;padding:0 1.5rem;line-height:1.7;color:#111}h1,h2,h3,h4{line-height:1.3;margin-top:1.5em}img{max-width:100%;height:auto}a{color:#0066cc}p{margin:1em 0}</style></head><body>${content || "<p style='color:#999;font-style:italic'>No content yet.</p>"}</body></html>`}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-same-origin"
                title="Content preview"
              />
            ) : editResult ? (
              <pre className="p-4 text-xs font-mono leading-relaxed overflow-auto h-full whitespace-pre-wrap">
                {diffText.split("\n").map((line, i) => (
                  <span
                    key={i}
                    className={
                      line.startsWith("+") && !line.startsWith("+++")
                        ? "block bg-green-500/10 text-green-700 dark:text-green-400"
                        : line.startsWith("-") && !line.startsWith("---")
                        ? "block bg-red-500/10 text-red-700 dark:text-red-400"
                        : line.startsWith("@@")
                        ? "block text-blue-500/70"
                        : "block text-muted-foreground"
                    }
                  >
                    {line}
                  </span>
                ))}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No diff yet — generate an edit first.
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Edit / SEO panel */}
        <div className="w-96 flex flex-col shrink-0">
          {/* Panel tabs */}
          <div data-tour="wp-right-tabs" className="border-b border-border px-4 py-2 flex items-center gap-1">
            {([["ai-edit", "AI Edit"], ["seo", "SEO"]] as [RightTab, string][]).map(([t, label]) => (
              <button
                key={t}
                data-tour={t === "seo" ? "wp-seo-tab-btn" : undefined}
                onClick={() => setRightTab(t)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  rightTab === t
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
            <div className="ml-auto">
              <TourButton steps={WP_EDITOR_TOUR} />
            </div>
          </div>

          {rightTab === "ai-edit" ? (
            <AIEditPanel
              stage={stage}
              prompt={prompt}
              setPrompt={setPrompt}
              error={error}
              editResult={editResult}
              item={item}
              onGenerate={generateEdit}
              onSaveDraft={saveDraft}
              onPublish={publish}
              onDiscard={discardEdit}
            />
          ) : (
            <SEOPanel
              seo={seo}
              setSeo={setSeo}
              hasYoast={hasYoast}
              seoLoaded={seoLoaded}
              seoSaving={seoSaving}
              seoGenerating={seoGenerating}
              seoError={seoError}
              onSave={saveSEO}
              onReset={resetSEO}
              onGenerate={generateSEO}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AIEditPanel({
  stage, prompt, setPrompt, error, editResult, item,
  onGenerate, onSaveDraft, onPublish, onDiscard,
}: {
  stage: Stage;
  prompt: string;
  setPrompt: (v: string) => void;
  error: string;
  editResult: EditResult | null;
  item: WPItem | null;
  onGenerate: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onDiscard: () => void;
}) {
  const isGenerating = stage === "generating" || stage === "saving" || stage === "publishing";

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-auto">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}

      {stage === "published" && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
          Published successfully.{" "}
          {item?.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="underline">
              View live ↗
            </a>
          )}
        </div>
      )}

      {(stage === "draft" || stage === "published") && (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
          Saved as draft.{" "}
          {stage === "draft" && (
            <button data-tour="wp-publish-btn" onClick={onPublish} className="text-foreground font-medium hover:underline">
              Publish now →
            </button>
          )}
        </div>
      )}

      {/* Prompt area */}
      {(stage === "idle" || stage === "generating") && (
        <>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Describe your edit
            </label>
            <textarea
              data-tour="wp-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onGenerate(); }}
              disabled={isGenerating}
              placeholder="e.g. Make the intro more engaging and add a clear call-to-action…"
              className="w-full h-32 rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            />
            <p className="text-[11px] text-muted-foreground">⌘↵ to generate</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">Examples</p>
            {[
              "Improve readability and fix any grammar issues",
              "Add a compelling conclusion paragraph",
              "Rewrite in a more professional tone",
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => setPrompt(ex)}
                className="w-full text-left text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted px-3 py-2 rounded-lg transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>

          <button
            data-tour="wp-generate-btn"
            onClick={onGenerate}
            disabled={true}
            // disabled={isGenerating || !prompt.trim()}
            className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {stage === "generating" ? (
              <><Spinner /> Generating…</>
            ) : (
              "Generate Edit"
            )}
          </button>
        </>
      )}

      {/* Review stage */}
      {stage === "review" && editResult && (
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">AI summary</p>
            <p className="text-sm text-foreground">{editResult.explanation}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Review the diff on the left, then save as draft or discard.
          </p>
          <div className="flex flex-col gap-2">
            <button
              data-tour="wp-save-draft-btn"
              onClick={onSaveDraft}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 transition-opacity"
            >
              Save as Draft
            </button>
            <button
              onClick={onDiscard}
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {stage === "saving" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Saving draft…
        </div>
      )}

      {stage === "publishing" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner /> Publishing…
        </div>
      )}
    </div>
  );
}

function SEOPanel({
  seo, setSeo, hasYoast, seoLoaded, seoSaving, seoGenerating, seoError,
  onSave, onReset, onGenerate,
}: {
  seo: SEOConfig;
  setSeo: React.Dispatch<React.SetStateAction<SEOConfig>>;
  hasYoast: boolean;
  seoLoaded: boolean;
  seoSaving: boolean;
  seoGenerating: boolean;
  seoError: string;
  onSave: () => void;
  onReset: () => void;
  onGenerate: () => void;
}) {
  const set = (key: keyof SEOConfig) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setSeo((s) => ({ ...s, [key]: e.target.value }));

  const descLength = (seo.description ?? "").length;

  if (!seoLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 overflow-auto">
      {hasYoast && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <span className="text-xs font-medium text-foreground">Yoast SEO</span>
        </div>
      )}

      {seoError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {seoError}
        </div>
      )}

      <div className="space-y-4">
        <SEOField label="SEO Title" hint="Max 60 characters recommended">
          <input
            type="text"
            value={seo.title ?? ""}
            onChange={set("title")}
            maxLength={100}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </SEOField>

        <SEOField
          label="Meta Description"
          hint={
            <span className={descLength > 160 ? "text-destructive" : ""}>
              {descLength}/160 chars
            </span>
          }
        >
          <textarea
            value={seo.description ?? ""}
            onChange={set("description")}
            rows={3}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </SEOField>

        <SEOField label="Keywords" hint="Comma-separated (e.g. SEO, marketing, tips)">
          <input
            type="text"
            value={seo.keywords ?? ""}
            onChange={set("keywords")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </SEOField>

        <SEOField label="Focus Keyphrase" hint="Primary keyword phrase for this content">
          <input
            type="text"
            value={seo.focusPhrase ?? ""}
            onChange={set("focusPhrase")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </SEOField>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={seo.noIndex ?? false}
            onChange={(e) => setSeo((s) => ({ ...s, noIndex: e.target.checked }))}
            className="rounded border-input"
          />
          <span className="text-sm text-foreground">No-index (exclude from search engines)</span>
        </label>
      </div>

      <div className="mt-auto space-y-2 pt-2">
        <button
          onClick={onGenerate}
          disabled={seoGenerating || seoSaving}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand/40 text-brand px-4 py-2 text-sm font-medium hover:bg-brand/5 disabled:opacity-50 transition-colors"
        >
          {seoGenerating ? <><Spinner /> Generating…</> : "Generate with AI"}
        </button>
        <button
          onClick={onSave}
          disabled={seoSaving || seoGenerating}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {seoSaving ? <><Spinner /> Saving…</> : "Save SEO"}
        </button>
        <button
          onClick={onReset}
          disabled={seoSaving}
          className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1"
        >
          Reset SEO fields
        </button>
      </div>
    </div>
  );
}

function ViewTabBtn({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
      }`}
    >
      {children}
    </button>
  );
}

function SEOField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    publish: "bg-green-500/10 text-green-600 border-green-500/20",
    draft: "bg-muted text-muted-foreground border-border",
    private: "bg-yellow-500/10 text-yellow-600",
    pending: "bg-orange-500/10 text-orange-600",
  };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${styles[status] ?? styles.draft}`}>
      {status}
    </span>
  );
}

function Spinner({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin shrink-0 ${className}`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

/**
 * Document-style contenteditable editor.
 * Title and body are editable inline — no HTML tags visible.
 * Uses refs + imperative DOM sync to avoid React/contenteditable cursor fighting.
 * contentKey: increment from the parent when AI edit content is applied externally.
 * onFlushRef: parent registers a flush fn here so it can read latest typed content
 *             before sending an AI request (avoids needing a debounced onChange).
 */
function WPDocEditor({
  title,
  content,
  contentKey,
  disabled,
  onTitleChange,
  onContentChange,
  onFlushRef,
}: {
  title: string;
  content: string;
  contentKey: number;
  disabled?: boolean;
  onTitleChange: (v: string) => void;
  onContentChange: (v: string) => void;
  onFlushRef: React.MutableRefObject<(() => void) | null>;
}) {
  const titleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Register flush so parent can pull latest DOM content before AI request
  const flush = useCallback(() => {
    if (titleRef.current) onTitleChange(titleRef.current.textContent ?? "");
    if (bodyRef.current) onContentChange(bodyRef.current.innerHTML);
  }, [onTitleChange, onContentChange]);

  useEffect(() => {
    onFlushRef.current = flush;
  }, [flush, onFlushRef]);

  // Mount: write initial content into the DOM
  useEffect(() => {
    if (titleRef.current) titleRef.current.textContent = title;
    if (bodyRef.current) bodyRef.current.innerHTML = content;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // External content change (AI edit applied): re-sync DOM
  useEffect(() => {
    if (contentKey === 0) return; // skip the initial mount cycle
    if (titleRef.current) titleRef.current.textContent = title;
    if (bodyRef.current) bodyRef.current.innerHTML = content;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto px-8 py-8 space-y-6">
        {/* Title zone */}
        <div className="group">
          <div className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground mb-1.5 select-none">
            Title
          </div>
          <div
            ref={titleRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onBlur={(e) => onTitleChange(e.currentTarget.textContent ?? "")}
            data-placeholder="Untitled"
            className={[
              "text-2xl font-bold text-foreground leading-snug outline-none min-h-[1.4em]",
              "focus:border-b focus:border-brand/40 transition-colors",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40",
              disabled ? "opacity-50 pointer-events-none" : "cursor-text",
            ].join(" ")}
          />
        </div>

        <div className="border-t border-border" />

        {/* Body zone */}
        <div className="group">
          <div className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground mb-1.5 select-none">
            Content
          </div>
          <div
            ref={bodyRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onBlur={(e) => onContentChange(e.currentTarget.innerHTML)}
            data-placeholder="Start writing…"
            className={[
              "min-h-[320px] text-base leading-relaxed text-foreground outline-none",
              "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-2",
              "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2",
              "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1",
              "[&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2",
              "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2",
              "[&_li]:my-1 [&_a]:text-brand [&_a]:underline",
              "[&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
              "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/40",
              disabled ? "opacity-50 pointer-events-none" : "cursor-text",
            ].join(" ")}
          />
        </div>
      </div>
    </div>
  );
}
