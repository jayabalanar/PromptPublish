"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TourButton } from "@/components/tour";

const EDITOR_TOUR = [
  {
    target: "editor-header",
    title: "File Editor",
    body: "You're editing this specific file. The breadcrumb shows the site and file path. Use the panel toggles on the right to show or hide each panel.",
    side: "bottom" as const,
  },
  {
    target: "content-panel",
    title: "Content Panel",
    body: "The Content tab shows every heading, paragraph, and text node in the file as editable text — no code visible. Click any text to edit it directly. The Diff tab appears after an AI edit, showing exactly what changed.",
    side: "right" as const,
  },
  {
    target: "center-tabs",
    title: "Preview / Edit / Diff",
    body: "Switch between Preview (live dev server iframe), Edit (editable file content), and Diff (line-by-line changes from the last AI edit). Preview requires the dev server to be running.",
    side: "bottom" as const,
  },
  {
    target: "prompt-textarea",
    title: "AI Prompt",
    body: "Describe what you want to change in plain English — e.g. 'Change the hero headline to Welcome' or 'Add a testimonials section after features'. The AI makes a surgical edit and shows you the diff.",
    side: "left" as const,
  },
  {
    target: "generate-btn",
    title: "Generate Edit",
    body: "Sends your prompt plus the current file content to the AI. You'll see a diff and explanation before anything is saved. Press ⌘ Enter as a shortcut.",
    side: "left" as const,
  },
  {
    target: "stage-btn",
    title: "Stage to Branch",
    body: "Commits the AI-edited file to your staging branch on GitHub. Nothing goes live yet — review the diff first.",
    side: "left" as const,
  },
  {
    target: "publish-btn",
    title: "Publish to Production",
    body: "Promotes the staged file to your production branch. This is the final step — your change goes live on GitHub.",
    side: "left" as const,
  },
  {
    target: "edit-history",
    title: "Edit History",
    body: "Every staged edit is logged here with its commit SHA. Click the hash to view the commit on GitHub. History is also sent to the AI so it remembers what's already been changed.",
    side: "left" as const,
  },
];
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

type Stage = "idle" | "generating" | "review" | "staging" | "staged" | "publishing" | "published";
type CodeTab = "code" | "diff";
type CenterView = "preview" | "code" | "diff";
type DeviceSize = "desktop" | "tablet" | "mobile";
type SiteStatus = "idle" | "cloning" | "installing" | "starting" | "running" | "error" | "stopped";

interface DevState { status: SiteStatus; port?: number; error?: string; logs: string[] }
interface EditResult { original: string; edited: string; diff: string; explanation: string }
interface StageResult { commitSha: string; url: string; branch: string }

interface Props {
  siteId: string; siteId_num: string; siteName: string;
  filePath: string; initialContent: string;
  stagingBranch: string; githubRepo: string; defaultBranch: string;
  siteUrl: string; pageRoute: string;
}

const DEVICE_WIDTHS: Record<DeviceSize, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };
const EXAMPLE_PROMPTS = [
  "Change the hero headline to '…'",
  "Add a testimonials section after the features",
  "Make the CTA button more prominent",
  "Update the footer copyright year to 2025",
  "Add a subtle gradient background to the hero section",
];
const STATUS_LABEL: Record<SiteStatus, string> = {
  idle: "Not running", cloning: "Cloning…", installing: "Installing…",
  starting: "Starting…", running: "Running", error: "Error", stopped: "Stopped",
};

// ── Panel layout helpers ───────────────────────────────────────────────────

function useResize(initial: number, min: number, max: number) {
  const [width, setWidth] = useState(initial);
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  function onMouseDown(e: React.MouseEvent, direction: "right" | "left" = "right") {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: width };
    const move = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = direction === "right"
        ? ev.clientX - dragRef.current.startX
        : dragRef.current.startX - ev.clientX;
      setWidth(Math.max(min, Math.min(max, dragRef.current.startW + dx)));
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  return { width, setWidth, onMouseDown };
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-brand/50 active:bg-brand transition-colors relative z-10"
      title="Drag to resize"
    />
  );
}

function CollapsedStrip({ label, icon, onExpand, side = "left" }: {
  label: string; icon: React.ReactNode; onExpand: () => void; side?: "left" | "right";
}) {
  return (
    <button
      onClick={onExpand}
      title={`Expand ${label}`}
      className="w-7 shrink-0 flex flex-col items-center gap-3 py-4 bg-card border-border hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
      style={{ borderRight: side === "left" ? "1px solid var(--border)" : undefined, borderLeft: side === "right" ? "1px solid var(--border)" : undefined }}
    >
      <span className="opacity-60">{icon}</span>
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
        {label}
      </span>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AIEditor({
  siteId, siteId_num, siteName, filePath, initialContent,
  stagingBranch, githubRepo, defaultBranch, siteUrl, pageRoute,
}: Props) {
  // Edit state
  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [currentContent, setCurrentContent] = useState(initialContent);
  const [editResult, setEditResult] = useState<EditResult | null>(null);
  const [stageResult, setStageResult] = useState<StageResult | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<{ prompt: string; explanation: string; sha: string }[]>([]);
  const [codeTab, setCodeTab] = useState<CodeTab>("code");
  const [centerView, setCenterView] = useState<CenterView>("preview");
  // incremented when AI edit is staged → JSXContentEditor re-parses with fresh content
  const [contentParseKey, setContentParseKey] = useState(0);

  // Panel collapse
  const [codeCollapsed, setCodeCollapsed] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [promptCollapsed, setPromptCollapsed] = useState(false);

  // Panel resize
  const code = useResize(420, 180, 900);
  const prompt_ = useResize(300, 220, 560);

  // Preview/dev server state
  const [deviceSize, setDeviceSize] = useState<DeviceSize>("desktop");
  const [previewKey, setPreviewKey] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const [devState, setDevState] = useState<DevState>({ status: "idle", logs: [] });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const previewBase = devState.status === "running" && devState.port
    ? `http://localhost:${devState.port}` : "http://localhost:3000";
  const previewPageUrl = previewBase + pageRoute;

  const promptRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Dev server polling ──────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/cms/sites/${siteId}/dev`)
      .then(r => r.json()).then((d: DevState) => setDevState(d)).catch(() => {});
  }, [siteId]);

  useEffect(() => {
    const active = ["cloning","installing","starting"].includes(devState.status);
    if (active && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const d = await fetch(`/api/cms/sites/${siteId}/dev`).then(r => r.json()) as DevState;
        setDevState(d);
        if (d.status === "running") setPreviewKey(k => k + 1);
      }, 1500);
    } else if (!active && pollRef.current) {
      clearInterval(pollRef.current); pollRef.current = null;
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [devState.status, siteId]);

  async function startDevServer() {
    setDevState(s => ({ ...s, status: "cloning", logs: [] }));
    await fetch(`/api/cms/sites/${siteId}/dev`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });
  }
  async function stopDevServer() {
    await fetch(`/api/cms/sites/${siteId}/dev`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    setDevState(s => ({ ...s, status: "stopped" }));
  }

  // ── AI edit actions ────────────────────────────────────────────────────
  const runEdit = useCallback(async () => {
    if (!prompt.trim() || stage === "generating") return;
    setError(""); setStage("generating"); setCodeTab("code");
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/edit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filePath,
          prompt: prompt.trim(),
          // Send the current editor state so the AI sees in-editor changes,
          // not a stale re-fetch from GitHub.
          currentContent,
          pageRoute,
          // Pass edit history so the AI has memory across successive edits.
          history: history.map(h => ({ prompt: h.prompt, explanation: h.explanation })),
        }),
      });
      const data = await res.json() as EditResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Edit failed"); setStage("idle"); return; }
      setEditResult(data); setCodeTab("diff");
      setCenterView((v) => v === "preview" ? "preview" : "diff");
      setStage("review");
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); setStage("idle"); }
  }, [prompt, stage, siteId, filePath, currentContent, pageRoute, history]);

  async function applyToStaging() {
    if (!editResult) return;
    setError(""); setStage("staging");
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/stage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, content: editResult.edited, commitMessage: `feat: ${editResult.explanation} [PromptPublish]`, targetBranch: "staging" }),
      });
      const data = await res.json() as StageResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Staging failed"); setStage("review"); return; }
      setHistory(h => [...h, { prompt: prompt.trim(), explanation: editResult.explanation, sha: data.commitSha }]);
      setCurrentContent(editResult.edited); setStageResult(data);
      setContentParseKey(k => k + 1); // re-parse JSX content editor with new file
      setCodeTab("code"); setPrompt(""); setEditResult(null); setStage("staged");
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); setStage("review"); }
  }

  async function publishToProduction() {
    if (!stageResult) return;
    setError(""); setStage("publishing");
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/stage`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, content: currentContent, commitMessage: `release: ${filePath} [PromptPublish]`, targetBranch: "production" }),
      });
      const data = await res.json() as StageResult & { error?: string };
      if (!res.ok) { setError(data.error ?? "Publish failed"); setStage("staged"); return; }
      setStageResult(data); setStage("published"); setPreviewKey(k => k + 1);
    } catch (e) { setError(e instanceof Error ? e.message : "Network error"); setStage("staged"); }
  }

  const isWorking = stage === "generating" || stage === "staging" || stage === "publishing";
  const fileName = filePath.split("/").pop() ?? filePath;
  const fileExt = fileName.split(".").pop() ?? "";

  return (
    <div className="flex flex-col h-screen overflow-hidden select-none">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header data-tour="editor-header" className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0 select-text">
        <Link href={`/cms/sites/${siteId_num}`}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {siteName}
        </Link>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-border shrink-0"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono shrink-0">{fileExt}</span>
          <code className="text-xs text-foreground font-mono truncate">{filePath}</code>
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Panel toggles */}
          <PanelToggle label="Code" active={!codeCollapsed} onClick={() => setCodeCollapsed(v => !v)} />
          <PanelToggle label="Preview" active={!previewCollapsed} onClick={() => setPreviewCollapsed(v => !v)} />
          <PanelToggle label="Prompt" active={!promptCollapsed} onClick={() => setPromptCollapsed(v => !v)} />
          <TourButton steps={EDITOR_TOUR} />
          <div className="w-px h-4 bg-border mx-1" />
          <BranchPill branch={defaultBranch} />
          <a href={`https://github.com/${githubRepo}/blob/${defaultBranch}/${filePath}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <GitHubIcon /> View
          </a>
        </div>
      </header>

      {/* ── Panels ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Code panel */}
        {codeCollapsed ? (
          <CollapsedStrip label="Code" side="left" onExpand={() => setCodeCollapsed(false)}
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L2 7l3 4M9 3l3 4-3 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          />
        ) : (
          <div data-tour="content-panel" className="flex flex-col overflow-hidden border-r border-border"
            style={{ width: code.width, minWidth: 180 }}>
            {/* Code panel header */}
            <div className="flex items-center gap-1 px-3 pt-2 pb-0 border-b border-border bg-card shrink-0">
              <CodeTabBtn active={codeTab === "code"} onClick={() => setCodeTab("code")}>Content</CodeTabBtn>
              {editResult && (
                <CodeTabBtn active={codeTab === "diff"} onClick={() => setCodeTab("diff")}>
                  <span className="flex items-center gap-1.5">
                    Diff <span className="text-[10px] bg-brand/15 text-brand px-1.5 py-0.5 rounded-full font-medium">new</span>
                  </span>
                </CodeTabBtn>
              )}
              <div className="ml-auto flex items-center gap-2 pb-2">
                {stage === "generating" && <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Spinner className="text-brand" /> Generating…</span>}
                <CollapseBtn onClick={() => setCodeCollapsed(true)} title="Collapse code" />
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              {codeTab === "diff" && editResult
                ? <div className="h-full overflow-auto bg-[oklch(0.985_0_0)] dark:bg-[oklch(0.08_0.003_264)]"><DiffView diff={editResult.diff} /></div>
                : <JSXContentEditor
                    content={currentContent}
                    parseKey={contentParseKey}
                    onChange={setCurrentContent}
                  />
              }
            </div>
          </div>
        )}

        {/* Resize handle: code ↔ preview */}
        {!codeCollapsed && !previewCollapsed && (
          <ResizeHandle onMouseDown={(e) => code.onMouseDown(e, "right")} />
        )}

        {/* Center panel: Preview / Code / Diff */}
        {previewCollapsed ? (
          <CollapsedStrip label="Preview" side="left" onExpand={() => setPreviewCollapsed(false)}
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 5h12" stroke="currentColor" strokeWidth="1"/></svg>}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden min-w-[180px]">
            {/* Panel toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
              {/* View toggle tabs */}
              <div data-tour="center-tabs" className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5 gap-0.5 shrink-0">
                <CenterTabBtn active={centerView === "preview"} onClick={() => setCenterView("preview")}>Preview</CenterTabBtn>
                <CenterTabBtn active={centerView === "code"} onClick={() => setCenterView("code")}>Edit</CenterTabBtn>
                <CenterTabBtn active={centerView === "diff"} onClick={() => setCenterView("diff")} disabled={!editResult}>Diff</CenterTabBtn>
              </div>

              {/* Device switcher — only in preview mode */}
              {centerView === "preview" && (
                <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5 gap-0.5 shrink-0">
                  {(["desktop","tablet","mobile"] as DeviceSize[]).map(d => (
                    <button key={d} onClick={() => setDeviceSize(d)} title={d}
                      className={`rounded-md px-2 py-1 transition-colors ${deviceSize === d ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                      {d === "desktop" && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.1"/><path d="M5 12h4M7 10v2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>}
                      {d === "tablet" && <svg width="12" height="14" viewBox="0 0 12 14" fill="none"><rect x="1" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="6" cy="11.5" r="0.75" fill="currentColor"/></svg>}
                      {d === "mobile" && <svg width="9" height="14" viewBox="0 0 9 14" fill="none"><rect x="0.5" y="0.5" width="8" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.1"/><circle cx="4.5" cy="11.5" r="0.75" fill="currentColor"/></svg>}
                    </button>
                  ))}
                </div>
              )}

              {/* URL bar — only in preview mode */}
              {centerView === "preview" && (
                <div className="flex-1 min-w-0 flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-mono text-muted-foreground truncate">
                  <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${devState.status === "running" ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  <span className="truncate select-text">{previewPageUrl}</span>
                </div>
              )}

              {/* Code/Diff label when not in preview */}
              {centerView !== "preview" && (
                <span className="flex-1 text-xs text-muted-foreground font-mono truncate select-text">{filePath}</span>
              )}

              {centerView === "preview" && (
                <>
                  <button onClick={() => setPreviewKey(k => k + 1)} title="Reload" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5A4.5 4.5 0 0 1 10.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M10.5 1.5v2h-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 6.5A4.5 4.5 0 0 1 2.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M2.5 11.5v-2h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <a href={previewPageUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab" className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M5.5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M8 1h4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 1L6.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  </a>
                </>
              )}
              <CollapseBtn onClick={() => setPreviewCollapsed(true)} title="Collapse panel" />
            </div>

            {/* Dev server bar — only relevant in preview mode */}
            {centerView === "preview" && (
              <DevServerBar status={devState.status} port={devState.port} error={devState.error}
                logs={devState.logs} showLogs={showLogs}
                onToggleLogs={() => setShowLogs(v => !v)}
                onStart={startDevServer} onStop={stopDevServer} />
            )}

            {/* Panel body */}
            {centerView === "code" ? (
              <textarea
                value={currentContent}
                onChange={(e) => setCurrentContent(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full h-full resize-none p-5 text-sm leading-relaxed text-foreground bg-background font-sans focus:outline-none placeholder:text-muted-foreground/40"
                placeholder="No content yet…"
              />
            ) : centerView === "diff" && editResult ? (
              <div className="flex-1 overflow-auto bg-[oklch(0.985_0_0)] dark:bg-[oklch(0.08_0.003_264)] select-text">
                <DiffView diff={editResult.diff} />
              </div>
            ) : centerView === "diff" && !editResult ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                No diff yet — generate an edit first.
              </div>
            ) : /* preview */ devState.status === "running" ? (
              <div className="flex-1 overflow-auto flex items-start justify-center bg-[hsl(220,13%,91%)] p-3">
                <div className="bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300"
                  style={{ width: DEVICE_WIDTHS[deviceSize], minHeight: "100%" }}>
                  <iframe key={previewPageUrl + previewKey} ref={iframeRef}
                    src={previewPageUrl} className="w-full border-0"
                    style={{ minHeight: "calc(100vh - 160px)" }} title="Local dev preview" />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-muted-foreground">
                    <polygon points="4,2 18,11 4,20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Start the dev server</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
                    Clones the repo, installs deps, and runs <code className="bg-muted px-1 rounded font-mono">npm run dev</code>
                  </p>
                </div>
                {(devState.status === "idle" || devState.status === "stopped" || devState.status === "error") && (
                  <button onClick={startDevServer}
                    className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 transition-opacity">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><polygon points="2,1 11,6 2,11"/></svg>
                    Run Site
                  </button>
                )}
                {devState.error && <p className="text-xs text-destructive max-w-[240px] leading-relaxed">{devState.error}</p>}
              </div>
            )}
          </div>
        )}

        {/* Resize handle: preview ↔ prompt */}
        {!previewCollapsed && !promptCollapsed && (
          <ResizeHandle onMouseDown={(e) => prompt_.onMouseDown(e, "left")} />
        )}

        {/* Prompt panel */}
        {promptCollapsed ? (
          <CollapsedStrip label="Prompt" side="right" onExpand={() => setPromptCollapsed(false)}
            icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3h10M2 7h6M2 11h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>}
          />
        ) : (
          <div className="flex flex-col bg-card overflow-hidden" style={{ width: prompt_.width, minWidth: 220 }}>
            {/* Staged/published banners */}
            {stage === "staged" && stageResult && <CommitBanner label="Staged" branch={stagingBranch} sha={stageResult.commitSha} url={stageResult.url} color="emerald" />}
            {stage === "published" && stageResult && <CommitBanner label="Published" branch={defaultBranch} sha={stageResult.commitSha} url={stageResult.url} color="brand" />}

            {/* Collapse button row */}
            <div className="flex justify-end px-3 pt-2 shrink-0">
              <CollapseBtn onClick={() => setPromptCollapsed(true)} title="Collapse prompt" />
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col select-text">
              {stage === "review" && editResult ? (
                <div className="px-4 pb-4 space-y-4 flex-1">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">Change summary</p>
                    <div className="rounded-lg border border-border bg-background p-3 text-sm text-foreground leading-relaxed">{editResult.explanation}</div>
                  </div>
                  <div className="rounded-lg border border-brand/20 bg-brand/5 p-3">
                    <p className="text-xs font-medium text-brand/70 mb-1">Your prompt</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{prompt}</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setEditResult(null); setCodeTab("code"); setStage("idle"); setError(""); }}
                      disabled={isWorking}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-40">
                      Discard
                    </button>
                    <button data-tour="stage-btn" onClick={applyToStaging} disabled={isWorking}
                      className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                      {isWorking ? <><Spinner /> Staging…</> : <>Stage <BranchChip>{stagingBranch}</BranchChip></>}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-4 pb-4 space-y-4 flex-1 flex flex-col">
                  {(stage === "staged" || stage === "published") && stageResult && (
                    <div className="space-y-2">
                      {stage === "staged" && (
                        <button data-tour="publish-btn" onClick={publishToProduction} disabled={isWorking}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                          {isWorking ? <><Spinner /> Publishing…</> : <>Publish to <BranchChip>{defaultBranch}</BranchChip></>}
                        </button>
                      )}
                      {stage === "published" && (
                        <div className="text-xs text-center text-muted-foreground py-1">Live on <code className="font-mono">{defaultBranch}</code></div>
                      )}
                      <button onClick={() => { setStage("idle"); setStageResult(null); }}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                        Make another edit
                      </button>
                      <div className="border-t border-border pt-2" />
                    </div>
                  )}
                  <div className="flex-1 flex flex-col space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-widest block mb-2">Prompt</label>
                      <textarea data-tour="prompt-textarea" ref={promptRef} value={prompt} onChange={e => setPrompt(e.target.value)}
                        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); runEdit(); } }}
                        disabled={isWorking} placeholder="Describe what to change…" rows={5}
                        className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 transition leading-relaxed" />
                      <p className="text-[11px] text-muted-foreground mt-1.5">⌘ Enter to generate</p>
                    </div>
                    <button data-tour="generate-btn" onClick={runEdit} disabled={!prompt.trim() || isWorking}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
                      {stage === "generating" ? <><Spinner /> Generating…</> : <>
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 6.5h9M6.5 2l4.5 4.5L6.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Generate Edit
                      </>}
                    </button>
                    {!prompt && stage === "idle" && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-muted-foreground/60">Try:</p>
                        {EXAMPLE_PROMPTS.map(ex => (
                          <button key={ex} onClick={() => { setPrompt(ex); promptRef.current?.focus(); }}
                            className="block w-full text-left text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md px-2.5 py-1.5 transition-colors">
                            "{ex}"
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div data-tour="edit-history" className="border-t border-border px-4 py-3 space-y-1 max-h-[160px] overflow-y-auto">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-2">History</p>
                {history.map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <a href={`https://github.com/${githubRepo}/commit/${h.sha}`} target="_blank" rel="noopener noreferrer"
                      className="font-mono text-brand/70 hover:text-brand shrink-0 mt-px">{h.sha.slice(0, 7)}</a>
                    <span className="text-muted-foreground leading-relaxed">{h.explanation}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Status bar */}
            <div className="border-t border-border px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/30 shrink-0">
              <span>Stages to <code className="font-mono">{stagingBranch}</code></span>
              {error && <span className="text-destructive truncate max-w-[140px]" title={error}>{error}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PanelToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`text-[11px] px-2 py-1 rounded border transition-colors font-medium ${
        active ? "border-brand/30 bg-brand/8 text-brand" : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
      }`}>
      {label}
    </button>
  );
}

function CollapseBtn({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title}
      className="rounded-md p-1 text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted transition-colors shrink-0">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 6h8M5 3l-3 3 3 3M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  );
}

function CodeTabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`px-3 pb-2 text-xs font-medium border-b-2 transition-colors ${active ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
      {children}
    </button>
  );
}

function CenterTabBtn({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
      }`}>
      {children}
    </button>
  );
}


function DevServerBar({ status, port, error, logs, showLogs, onToggleLogs, onStart, onStop }: {
  status: SiteStatus; port?: number; error?: string; logs: string[];
  showLogs: boolean; onToggleLogs: () => void; onStart: () => void; onStop: () => void;
}) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (showLogs) logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs, showLogs]);

  const isActive = ["cloning","installing","starting"].includes(status);
  const dotCls = status === "running" ? "bg-emerald-500" : isActive ? "bg-amber-400 animate-pulse" : status === "error" ? "bg-destructive" : "bg-muted-foreground/30";

  return (
    <div className="border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-2.5 px-3 py-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotCls}`} />
        <span className="text-xs text-muted-foreground">
          {status === "running" && port
            ? <><span className="text-emerald-600 font-medium">Running</span> · <code className="font-mono">:{port}</code></>
            : STATUS_LABEL[status]}
        </span>
        {isActive && <Spinner className="text-amber-500" />}
        <div className="ml-auto flex items-center gap-1.5">
          {logs.length > 0 && (
            <button onClick={onToggleLogs} className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded border border-border hover:border-foreground/20 transition-colors">
              {showLogs ? "Hide" : "Logs"}
            </button>
          )}
          {status === "running"
            ? <button onClick={onStop} className="text-[10px] text-destructive border border-destructive/30 hover:border-destructive/60 px-1.5 py-0.5 rounded transition-colors">Stop</button>
            : (status === "idle" || status === "stopped" || status === "error")
              ? <button onClick={onStart} className="text-[10px] text-brand border border-brand/30 hover:border-brand/60 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><polygon points="1,0.5 7.5,4 1,7.5"/></svg> Run
                </button>
              : null}
        </div>
      </div>
      {showLogs && (
        <div className="border-t border-border bg-[oklch(0.06_0.003_264)] max-h-[140px] overflow-y-auto px-3 py-2">
          {logs.map((l, i) => <div key={i} className="font-mono text-[10px] text-muted-foreground/80 leading-relaxed whitespace-pre-wrap select-text">{l}</div>)}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}

function BranchPill({ branch }: { branch: string }) {
  return (
    <span className="flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
      <svg width="9" height="10" viewBox="0 0 9 10" fill="none"><circle cx="2" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1"/><circle cx="7" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1"/><path d="M2 4v1.5a2 2 0 0 0 2 2h1" stroke="currentColor" strokeWidth="1"/></svg>
      {branch}
    </span>
  );
}

function BranchChip({ children }: { children: React.ReactNode }) {
  return <code className="text-[11px] bg-white/20 px-1.5 py-0.5 rounded font-mono">{children}</code>;
}

function CommitBanner({ label, branch, sha, url, color }: { label: string; branch: string; sha: string; url: string; color: "emerald" | "brand" }) {
  const cls = color === "emerald"
    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
    : "border-brand/20 bg-brand/5 text-brand";
  return (
    <div className={`border-b px-4 py-3 flex items-center justify-between gap-3 ${cls}`}>
      <div>
        <p className="text-xs font-semibold">{label} to {branch}</p>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[11px] opacity-70 hover:opacity-100 font-mono hover:underline">{sha.slice(0, 7)}</a>
      </div>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  );
}

function CodeView({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="flex h-full font-mono text-xs leading-[1.7]">
      <div className="select-none text-right text-muted-foreground/30 pr-4 pt-4 pb-4 pl-4 border-r border-border/40 min-w-[3.5rem]" aria-hidden>
        {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <pre className="flex-1 overflow-auto pt-4 pb-4 pl-4 pr-6 text-foreground/80 whitespace-pre-wrap break-all"><code>{content}</code></pre>
    </div>
  );
}

function DiffView({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  let lo = 0, ln = 0;
  const hunk = (l: string) => { const m = l.match(/@@ -(\d+)(?:,\d+)? \+(\d+)/); return m ? [+m[1]-1,+m[2]-1] as const : null; };
  return (
    <div className="font-mono text-xs leading-[1.7] h-full overflow-auto">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, i) => {
            if (line.startsWith("@@")) { const h = hunk(line); if (h) { [lo,ln]=h; } return <tr key={i} className="bg-brand/5"><td className="w-10 pr-2 pl-2 py-0.5 text-muted-foreground/40 select-none border-r border-border/30"/><td className="w-10 pr-2 py-0.5 text-muted-foreground/40 select-none border-r border-border/30"/><td className="pl-4 pr-4 py-0.5 text-brand/60">{line}</td></tr>; }
            if (line.startsWith("---")||line.startsWith("+++")||line.startsWith("diff")||line.startsWith("index")) return <tr key={i}><td className="w-10 border-r border-border/30"/><td className="w-10 border-r border-border/30"/><td className="pl-4 pr-4 py-0.5 text-muted-foreground/40">{line}</td></tr>;
            const add=line.startsWith("+"), del=line.startsWith("-");
            const on=!add?++lo:null, nn=!del?++ln:null;
            return <tr key={i} className={add?"bg-emerald-50 dark:bg-emerald-900/20":del?"bg-red-50 dark:bg-red-900/20":""}>
              <td className="w-10 text-right pr-2 pl-2 py-0.5 text-muted-foreground/30 select-none border-r border-border/30 text-[10px]">{del?on:""}</td>
              <td className="w-10 text-right pr-2 py-0.5 text-muted-foreground/30 select-none border-r border-border/30 text-[10px]">{add?nn:""}</td>
              <td className={`pl-4 pr-4 py-0.5 whitespace-pre-wrap break-all ${add?"text-emerald-700 dark:text-emerald-300":del?"text-red-700 dark:text-red-400":"text-foreground/70"}`}>{line}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

function GitHubIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>;
}

function Spinner({ className = "" }: { className?: string }) {
  return <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={`animate-spin ${className}`}><circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25"/><path d="M6.5 1.5A5 5 0 0 1 11.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

// ── JSX content extractor + inline editor ─────────────────────────────────

type JSXNode = {
  id: string;
  tag: string;
  text: string;       // trimmed display text
  rawInner: string;   // exact inner content as it appears in source
  fullMatch: string;  // full "<tag…>rawInner</tag>" for precise replacement
};

/**
 * Extracts editable text nodes from JSX/HTML source.
 * Only matches elements whose content is plain text — no nested tags, no {expressions}.
 */
function extractJSXText(source: string): JSXNode[] {
  // Matches <tag attrs?>plaintext</tag> — skips anything with < { } inside
  const re = /<(h[1-6]|p|li|dt|dd|th|td|figcaption|blockquote|caption|label|button)\b([^>]*)>([^<>{}\n][^<>{}]*)<\/\1>/g;
  const nodes: JSXNode[] = [];
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(source)) !== null) {
    const rawInner = m[3];
    const text = rawInner.trim();
    if (!text || text.length < 2) continue;
    nodes.push({ id: `n${i++}`, tag: m[1], text, rawInner, fullMatch: m[0] });
  }
  return nodes;
}

/** Replaces a single node's text in the source, returns updated source. */
function patchJSXNode(source: string, node: JSXNode, newText: string): string {
  const newInner = node.rawInner.replace(node.text, newText);
  const newMatch = node.fullMatch.replace(node.rawInner, newInner);
  // Replace the first occurrence of this exact full match
  return source.replace(node.fullMatch, newMatch);
}

function tagStyle(tag: string): string {
  if (tag === "h1") return "text-2xl font-bold leading-snug";
  if (tag === "h2") return "text-xl font-semibold leading-snug";
  if (tag === "h3") return "text-lg font-semibold leading-snug";
  if (tag === "h4" || tag === "h5" || tag === "h6") return "text-base font-semibold";
  if (tag === "li") return "text-sm leading-relaxed pl-3 before:content-['·'] before:pr-2 before:text-muted-foreground";
  if (tag === "blockquote") return "text-base italic text-muted-foreground border-l-4 border-border pl-4";
  if (tag === "button" || tag === "label") return "text-sm font-medium";
  return "text-base leading-relaxed"; // p, td, th, etc.
}

/**
 * Shows JSX/HTML file content as an editable document — headings, paragraphs,
 * list items — without any code or HTML tag syntax visible.
 * Each text node is contenteditable; on blur the change is patched into the source.
 */
function JSXContentEditor({
  content,
  parseKey,
  onChange,
}: {
  content: string;
  parseKey: number;
  onChange: (v: string) => void;
}) {
  const [nodes, setNodes] = useState<JSXNode[]>([]);
  // Keep a mutable ref to the latest source so concurrent blur handlers patch correctly
  const liveContent = useRef(content);

  function parse(src: string) {
    liveContent.current = src;
    setNodes(extractJSXText(src));
  }

  // Mount: initial parse
  useEffect(() => { parse(content); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-parse when AI edit is applied (parseKey bumps)
  useEffect(() => {
    if (parseKey > 0) parse(content);
  }, [parseKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleBlur(node: JSXNode, newText: string) {
    if (newText === node.text) return; // unchanged
    const patched = patchJSXNode(liveContent.current, node, newText);
    liveContent.current = patched;
    onChange(patched);
    setNodes(extractJSXText(patched));
  }

  if (nodes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-muted-foreground">
            <path d="M3 5h12M3 9h8M3 13h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">No editable text found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
            Use the <strong>Edit</strong> tab in the center panel to edit this file directly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto px-7 py-7 space-y-4">
        {nodes.map((node) => (
          <ContentNodeEl key={node.id} node={node} onBlur={handleBlur} />
        ))}
      </div>
    </div>
  );
}

/** Individual editable node. Uses a ref so React never fights the browser's editing. */
function ContentNodeEl({
  node,
  onBlur,
}: {
  node: JSXNode;
  onBlur: (node: JSXNode, newText: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Set DOM text on mount (and when node identity changes after re-parse)
  useEffect(() => {
    if (ref.current && ref.current.textContent !== node.text) {
      ref.current.textContent = node.text;
    }
  }, [node.id, node.text]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onBlur(node, e.currentTarget.textContent ?? "")}
      className={[
        "outline-none cursor-text text-foreground rounded px-1 -mx-1",
        "focus:bg-muted/40 focus:ring-1 focus:ring-brand/20 transition-colors",
        tagStyle(node.tag),
      ].join(" ")}
    />
  );
}
