import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { notFound, redirect } from "next/navigation";
import { getRepoTree, extractPages, detectFramework } from "@/lib/github";
import type { Metadata } from "next";
import Link from "next/link";
import { SitePagesTourButton } from "./site-pages-tour";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ siteId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId } = await params;
  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id: siteId });
  if (!site) return {};
  return { title: `${((site as unknown) as { name: string }).name} — PromptPublish` };
}

export default async function SitePagesPage({ params }: Props) {
  const { siteId } = await params;
  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id: siteId });
  if (!site) notFound();

  // WordPress sites have their own management UI
  if (((site as unknown) as { framework: string }).framework === "wordpress") {
    redirect(`/cms/sites/${siteId}/wordpress`);
  }

  const { name, githubRepo, githubToken, defaultBranch, stagingBranch, siteUrl } = (site as unknown) as {
    name: string;
    githubRepo: string;
    githubToken: string;
    defaultBranch: string;
    stagingBranch: string;
    siteUrl?: string;
  };

  let pages: Awaited<ReturnType<typeof extractPages>> = [];
  let framework = "unknown";
  let fetchError = "";

  try {
    const [tree, fw] = await Promise.all([
      getRepoTree(githubToken, githubRepo, defaultBranch),
      detectFramework(githubToken, githubRepo, defaultBranch),
    ]);
    framework = fw;
    pages = extractPages(tree, framework);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load pages";
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div data-tour="site-pages-header" className="border-b border-border px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{name}</h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
              <span>{githubRepo}</span>
              <span className="text-border/60">·</span>
              <span>{defaultBranch}</span>
              {stagingBranch && (
                <>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{stagingBranch}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SitePagesTourButton />
            <a
              href={`https://github.com/${githubRepo}/tree/${defaultBranch}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:text-foreground hover:border-foreground/20 transition-colors"
            >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-8">
        {fetchError ? (
          <div className="max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <p className="text-sm font-medium text-destructive mb-1">Could not load pages</p>
            <p className="text-xs text-destructive/80 leading-relaxed">{fetchError}</p>
            <p className="text-xs text-muted-foreground mt-3">
              Check that the token has <code className="bg-muted px-1 rounded">repo</code> read access and the branch exists.
            </p>
          </div>
        ) : pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-muted-foreground">
                <path d="M3 5h14M3 10h8M3 15h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No pages detected</p>
            <p className="text-xs text-muted-foreground">
              Framework detected:{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{framework}</code>
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                {pages.length} page{pages.length !== 1 ? "s" : ""}
              </p>
              <span data-tour="site-framework-badge" className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md font-mono">
                {framework}
              </span>
            </div>

            <div data-tour="site-pages-list" className="rounded-xl border border-border bg-card overflow-hidden">
              {pages.map((page, i) => (
                <Link
                  key={page.path}
                  href={`/cms/sites/${siteId}/edit/${encodeFilePath(page.path)}?route=${encodeURIComponent(page.route)}`}
                  className={`group flex items-center gap-4 px-5 py-3.5 hover:bg-muted/50 transition-colors ${
                    i < pages.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  {/* Route badge */}
                  <code className="shrink-0 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md font-mono min-w-[3rem] text-center">
                    {page.route === "/" ? "/" : page.route}
                  </code>

                  {/* Label + path */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground group-hover:text-brand transition-colors">
                      {page.label}
                    </span>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                      {page.path}
                    </div>
                  </div>

                  {/* Edit arrow */}
                  <span className="text-xs text-muted-foreground/40 group-hover:text-brand/60 transition-colors flex items-center gap-1 shrink-0">
                    Edit
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function encodeFilePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}
