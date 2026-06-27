"use client";

import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, type ReactNode,
} from "react";
import { createPortal } from "react-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TourStep {
  /** Matches [data-tour="value"] on the target element */
  target: string;
  title: string;
  body: string;
  /** Preferred popover side; auto-flips if near viewport edge */
  side?: "top" | "bottom" | "left" | "right";
}

interface TourContextValue {
  start: (steps: TourStep[]) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const TourCtx = createContext<TourContextValue>({ start: () => {} });

export function useTour() {
  return useContext(TourCtx);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function TourProvider({ children }: { children: ReactNode }) {
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [idx, setIdx] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    setIdx(-1);
    setSteps([]);
    setRect(null);
  }, []);

  const start = useCallback((s: TourStep[]) => {
    setSteps(s);
    setIdx(0);
  }, []);

  const next = useCallback(() => {
    setIdx((i) => {
      const n = i + 1;
      if (n >= steps.length) { stop(); return -1; }
      return n;
    });
  }, [steps.length, stop]);

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  const active = idx >= 0 && idx < steps.length;
  const step = active ? steps[idx] : null;

  // Locate target element and measure it after scroll settles
  useEffect(() => {
    if (!step) { setRect(null); return; }
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      setRect(el.getBoundingClientRect());
    }, 320);
    return () => { if (scrollTimer.current) clearTimeout(scrollTimer.current); };
  }, [step]);

  // Re-measure on resize
  useEffect(() => {
    if (!active || !step) return;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, step]);

  return (
    <TourCtx.Provider value={{ start }}>
      {children}
      {active && step && typeof document !== "undefined" &&
        createPortal(
          <TourOverlay
            step={step}
            rect={rect}
            current={idx + 1}
            total={steps.length}
            onNext={next}
            onPrev={idx > 0 ? prev : undefined}
            onClose={stop}
          />,
          document.body
        )
      }
    </TourCtx.Provider>
  );
}

// ── Overlay (spotlight + popover) ─────────────────────────────────────────────

const PAD = 10; // spotlight padding around element
const POPOVER_W = 300;
const POPOVER_MARGIN = 14;

function TourOverlay({
  step, rect, current, total, onNext, onPrev, onClose,
}: {
  step: TourStep;
  rect: DOMRect | null;
  current: number;
  total: number;
  onNext: () => void;
  onPrev?: () => void;
  onClose: () => void;
}) {
  const popoverPos = rect ? computePopoverPos(rect, step.side) : centerPos();

  return (
    <>
      {/* Dim backdrop — click to close */}
      <div
        className="fixed inset-0 z-[9990]"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Spotlight cutout — transparent hole over the target */}
      {rect && (
        <div
          className="fixed z-[9991] rounded-xl pointer-events-none"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            backgroundColor: "transparent",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
            outline: "2px solid hsl(var(--brand, 221 83% 53%) / 0.6)",
          }}
        />
      )}

      {/* Popover */}
      <div
        className="fixed z-[9992] rounded-2xl border border-border bg-card shadow-2xl"
        style={{ width: POPOVER_W, ...popoverPos }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              {current} / {total}
            </span>
            {/* Progress dots */}
            <div className="flex items-center gap-1">
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={`inline-block rounded-full transition-all ${
                    i === current - 1
                      ? "w-4 h-1.5 bg-brand"
                      : "w-1.5 h-1.5 bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-0.5 hover:bg-muted"
            title="Close tour"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-2">
          <h3 className="text-sm font-semibold text-foreground mb-1.5">{step.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{step.body}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {onPrev && (
              <button
                onClick={onPrev}
                className="text-xs px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
              >
                ← Back
              </button>
            )}
            <button
              onClick={onNext}
              className="text-xs px-3 py-1.5 rounded-lg bg-brand text-brand-foreground hover:opacity-90 transition-opacity font-medium"
            >
              {current === total ? "Done" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function computePopoverPos(rect: DOMRect, side?: string): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const estimated_h = 200;

  // Preferred positions
  const positions = {
    bottom: { top: rect.bottom + POPOVER_MARGIN, left: rect.left + rect.width / 2 - POPOVER_W / 2 },
    top:    { top: rect.top - estimated_h - POPOVER_MARGIN, left: rect.left + rect.width / 2 - POPOVER_W / 2 },
    right:  { top: rect.top + rect.height / 2 - estimated_h / 2, left: rect.right + POPOVER_MARGIN },
    left:   { top: rect.top + rect.height / 2 - estimated_h / 2, left: rect.left - POPOVER_W - POPOVER_MARGIN },
  };

  // Prefer the requested side; auto-fallback if it overflows
  const order: Array<keyof typeof positions> = side === "top"
    ? ["top", "bottom", "right", "left"]
    : side === "left"
    ? ["left", "right", "bottom", "top"]
    : side === "right"
    ? ["right", "left", "bottom", "top"]
    : ["bottom", "top", "right", "left"];

  for (const s of order) {
    const pos = positions[s];
    if (
      pos.top >= POPOVER_MARGIN &&
      pos.top + estimated_h <= vh - POPOVER_MARGIN &&
      pos.left >= POPOVER_MARGIN &&
      pos.left + POPOVER_W <= vw - POPOVER_MARGIN
    ) {
      // Clamp left to viewport
      const clampedLeft = Math.max(POPOVER_MARGIN, Math.min(pos.left, vw - POPOVER_W - POPOVER_MARGIN));
      return { top: pos.top, left: clampedLeft };
    }
  }

  // Last resort: bottom clamped
  const fallback = positions.bottom;
  return {
    top: Math.max(POPOVER_MARGIN, Math.min(fallback.top, vh - estimated_h - POPOVER_MARGIN)),
    left: Math.max(POPOVER_MARGIN, Math.min(fallback.left, vw - POPOVER_W - POPOVER_MARGIN)),
  };
}

function centerPos(): React.CSSProperties {
  return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
}

// ── TourButton ────────────────────────────────────────────────────────────────

export function TourButton({ steps }: { steps: TourStep[] }) {
  const { start } = useTour();
  return (
    <button
      onClick={() => start(steps)}
      title="Start page tour"
      className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2.5 py-1.5 hover:text-foreground hover:border-foreground/20 hover:bg-muted/50 transition-colors shrink-0"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M6 5.5v3M6 3.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
      Tour
    </button>
  );
}
