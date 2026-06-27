import { getAllSites } from "@/lib/sites-store";
import Link from "next/link";
import type { Metadata } from "next";
import { DashboardTourButton } from "./dashboard-tour";

export const metadata: Metadata = { title: "Sites — PromptPublish" };
export const dynamic = "force-dynamic";

export default function CMSIndexPage() {
  const sites = getAllSites();

  if (sites.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-brand">
              <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="15" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="3" y="15" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M20 15v10M15 20h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No sites yet</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Connect a GitHub repository to start editing pages with AI prompts — no switching apps.
          </p>
          <Link
            href="/cms/connect"
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 transition-opacity"
          >
            Connect your first site
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 data-tour="sites-heading" className="text-2xl font-semibold tracking-tight text-foreground">Sites</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sites.length} connected {sites.length === 1 ? "repository" : "repositories"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          <Link
            data-tour="connect-btn"
            href="/cms/connect"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
            Connect site
          </Link>
          <DashboardTourButton />
        </div>
      </div>

      <div className="grid gap-3">
        {sites.map((site, i) => (
          <Link
            key={site.id}
            href={site.framework === "wordpress" ? `/cms/sites/${site.id}/wordpress` : `/cms/sites/${site.id}`}
            {...(i === 0 ? { "data-tour": "site-card" } : {})}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:border-brand/40 hover:shadow-sm transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
              <FrameworkBadge framework={site.framework} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground group-hover:text-brand transition-colors leading-none mb-1">
                {site.name}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {site.framework === "wordpress" ? (
                  <span className="font-mono">{site.wpUrl}</span>
                ) : (
                  <>
                    <span className="font-mono">{site.githubRepo}</span>
                    <span className="text-border">·</span>
                    <span>{site.defaultBranch}</span>
                    {site.stagingBranch && (
                      <>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{site.stagingBranch}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground shrink-0">
              {new Date(site.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-muted-foreground/40 group-hover:text-brand/60 transition-colors shrink-0">
              <path d="M4 8h8M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

function FrameworkBadge({ framework }: { framework: string }) {
  if (framework === "nextjs" || framework === "react") {
    return (
      <svg width="18" height="18" viewBox="0 0 180 180" fill="currentColor" className="text-foreground">
        <mask id="m" style={{ maskType: "alpha" }}>
          <circle cx="90" cy="90" r="90"/>
        </mask>
        <circle cx="90" cy="90" r="90" fill="black"/>
        <g mask="url(#m)">
          <circle cx="90" cy="90" r="90" fill="black"/>
          <path d="M149 162L68.5 54H54V126.5H68.5V73.5L137 168.5C141.5 166.5 145.5 164.3 149 162Z" fill="url(#g1)"/>
          <rect x="111" y="54" width="14" height="72.5" fill="url(#g2)"/>
        </g>
        <defs>
          <linearGradient id="g1" x1="109" y1="116.5" x2="144.5" y2="163" gradientUnits="userSpaceOnUse">
            <stop stopColor="white"/>
            <stop offset="1" stopColor="white" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="g2" x1="111" y1="54" x2="111" y2="126.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="white"/>
            <stop offset="1" stopColor="white" stopOpacity="0"/>
          </linearGradient>
        </defs>
      </svg>
    );
  }
  return <span className="text-xs font-bold text-muted-foreground">W</span>;
}
