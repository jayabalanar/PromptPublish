"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { WPItem } from "@/lib/wordpress";
import { TourButton } from "@/components/tour";

const WP_LIST_TOUR = [
  {
    target: "wp-list-header",
    title: "WordPress Content",
    body: "This is your WordPress site's content hub. All pages and posts from your WordPress site are listed here — fetched live via the REST API.",
    side: "bottom" as const,
  },
  {
    target: "wp-content-tabs",
    title: "Posts & Pages",
    body: "Switch between Posts (blog entries, news) and Pages (static content like About, Contact, Services). Click a tab to load that content type.",
    side: "bottom" as const,
  },
  {
    target: "wp-new-btn",
    title: "Create New Content",
    body: "Create a new post or page directly from this app. Fill in the title and body, then publish or save as draft — no WordPress admin needed.",
    side: "bottom" as const,
  },
  {
    target: "wp-content-table",
    title: "Content List",
    body: "Each row shows status (Published, Draft, Pending), title, slug, and last modified date. Click Edit to open the AI-powered editor for that item.",
    side: "top" as const,
  },
];

type ContentType = "posts" | "pages";

interface ListResult {
  items: WPItem[];
  total: number;
}

export function WPContentList({
  siteId,
  siteName,
  wpUrl,
  isDemo = false,
}: {
  siteId: string;
  siteName: string;
  wpUrl: string;
  isDemo?: boolean;
}) {
  const [tab, setTab] = useState<ContentType>("posts");
  const [data, setData] = useState<ListResult>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const perPage = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        type: tab,
        page: String(page),
        perPage: String(perPage),
        search,
        status: "any",
      });
      const res = await fetch(`/api/cms/sites/${siteId}/wp-content?${params}`);
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to load content");
      }
      setData(await res.json() as ListResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [siteId, tab, page, search]);

  useEffect(() => { load(); }, [load]);

  function switchTab(t: ContentType) {
    setTab(t);
    setPage(1);
    setSearch("");
    setSearchInput("");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  async function confirmDelete() {
    if (deleteId == null) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/wp-content/${deleteId}?type=${tab}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        alert(d.error ?? "Delete failed");
        return;
      }
      setDeleteId(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(data.total / perPage);

  return (
    <div className="flex flex-col h-full">
      {isDemo && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-8 py-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 bg-amber-500/15 px-1.5 py-0.5 rounded">Demo</span>
          <span className="text-xs text-amber-700/80">Sample content — connect WordPress credentials to load real posts and pages.</span>
        </div>
      )}
      {/* Header */}
      <div data-tour="wp-list-header" className="border-b border-border px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{siteName}</h1>
            <a
              href={wpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground font-mono hover:text-foreground transition-colors"
            >
              {wpUrl}
            </a>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <WPBadge />
            <TourButton steps={WP_LIST_TOUR} />
            <Link
              data-tour="wp-new-btn"
              href={`/cms/sites/${siteId}/wordpress/new/${tab}`}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground hover:opacity-90 transition-opacity"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              New {tab === "posts" ? "Post" : "Page"}
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div data-tour="wp-content-tabs" className="flex items-center gap-1 mt-4">
          {(["posts", "pages"] as ContentType[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-8 py-3 border-b border-border flex items-center gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-sm">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={`Search ${tab}…`}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button type="submit" className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            Search
          </button>
        </form>
        {search && (
          <button
            onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">{data.total} total</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="w-6 h-6 text-muted-foreground" />
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-muted-foreground">
                <path d="M3 5h14M3 10h8M3 15h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No {tab} found</p>
            {search && <p className="text-xs text-muted-foreground">Try a different search term</p>}
          </div>
        ) : (
          <div data-tour="wp-content-table" className="rounded-xl border border-border bg-card overflow-hidden">
            {data.items.map((item, i) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors ${
                  i < data.items.length - 1 ? "border-b border-border" : ""
                }`}
              >
                {/* Status badge */}
                <StatusBadge status={item.status} />

                {/* Title + meta */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{item.title || "(no title)"}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground font-mono">
                    <span>{item.slug}</span>
                    <span className="text-border">·</span>
                    <span>{new Date(item.modified).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border hover:border-foreground/20"
                  >
                    View ↗
                  </a>
                  <Link
                    href={`/cms/sites/${siteId}/wordpress/${tab}/${item.id}`}
                    className="text-xs text-foreground bg-muted hover:bg-muted/80 px-2 py-1 rounded border border-border transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="text-xs text-destructive/70 hover:text-destructive px-2 py-1 rounded border border-border hover:border-destructive/30 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-md border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-md border border-border text-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-background border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-base font-semibold text-foreground mb-2">Delete {tab.slice(0, -1)}?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This permanently deletes the {tab.slice(0, -1)} from your WordPress site. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    publish: "bg-green-500/10 text-green-600 border-green-500/20",
    draft: "bg-muted text-muted-foreground border-border",
    private: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    pending: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  };
  return (
    <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${styles[status] ?? styles.draft}`}>
      {status}
    </span>
  );
}

function WPBadge() {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted border border-border rounded-md px-2 py-1">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.385 0 0 5.385 0 12s5.385 12 12 12 12-5.385 12-12S18.615 0 12 0M1.215 12c0-1.369.249-2.673.688-3.884l3.895 10.674A10.779 10.779 0 0 1 1.215 12M12 22.784c-1.059 0-2.081-.153-3.048-.437l3.237-9.406 3.315 9.087c.024.053.05.101.078.149A10.738 10.738 0 0 1 12 22.784m1.478-15.152c.645-.034 1.227-.102 1.227-.102.575-.068.508-.916-.067-.882 0 0-1.732.137-2.851.137-1.051 0-2.816-.137-2.816-.137-.576-.034-.644.848-.068.882 0 0 .537.068 1.114.102l1.657 4.542-2.329 6.985L6.03 7.632c.646-.034 1.228-.102 1.228-.102.576-.068.509-.916-.067-.882 0 0-1.732.137-2.852.137-.2 0-.437-.007-.686-.013A10.784 10.784 0 0 1 12 1.216c2.806 0 5.361 1.074 7.279 2.83-.045-.003-.09-.007-.135-.007-1.052 0-1.799.916-1.799 1.903 0 .882.509 1.628 1.051 2.51.407.712.882 1.628.882 2.951 0 .916-.35 1.968-.816 3.46l-1.073 3.579z"/>
      </svg>
      WordPress
    </span>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
