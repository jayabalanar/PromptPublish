"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TourButton } from "@/components/tour";

const TOUR_STEPS = [
  {
    target: "site-type-toggle",
    title: "Site Type",
    body: "Choose GitHub to connect a Next.js or React repository, or WordPress to connect a WP site using an Application Password.",
    side: "bottom" as const,
  },
  {
    target: "site-name-field",
    title: "Site Name",
    body: "A label for this site in the dashboard. Pick something descriptive like 'Company Website' or 'Blog'.",
    side: "bottom" as const,
  },
  {
    target: "github-repo-field",
    title: "GitHub Repository",
    body: "Enter owner/repo format (e.g. acme/website) or paste the full GitHub URL. The app reads and writes files via the GitHub API — no git clone needed.",
    side: "bottom" as const,
  },
  {
    target: "github-token-field",
    title: "Personal Access Token",
    body: "A GitHub token with repo scope. The app uses this to read files from your default branch and commit edits to your staging branch.",
    side: "bottom" as const,
  },
  {
    target: "branch-fields",
    title: "Branches",
    body: "Edits are committed to the Staging branch first for review, then promoted to the Production branch on publish. Leave blank to auto-detect.",
    side: "top" as const,
  },
  {
    target: "connect-submit",
    title: "Connect",
    body: "Verifies your credentials against GitHub or WordPress and saves the connection. You'll be taken to the site's page list on success.",
    side: "top" as const,
  },
];

type SiteType = "github" | "wordpress";

export function ConnectSiteForm() {
  const router = useRouter();
  const [siteType, setSiteType] = useState<SiteType>("github");
  const [form, setForm] = useState({
    name: "",
    githubRepo: "",
    githubToken: "",
    siteUrl: "",
    defaultBranch: "",
    stagingBranch: "staging",
    wpUrl: "",
    wpUsername: "",
    wpAppPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body =
        siteType === "wordpress"
          ? {
              name: form.name,
              framework: "wordpress",
              wpUrl: form.wpUrl,
              wpUsername: form.wpUsername,
              wpAppPassword: form.wpAppPassword,
            }
          : {
              name: form.name,
              githubRepo: form.githubRepo,
              githubToken: form.githubToken,
              siteUrl: form.siteUrl,
              defaultBranch: form.defaultBranch,
              stagingBranch: form.stagingBranch,
            };

      const res = await fetch("/api/cms/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { id?: string | number; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to connect site");
        return;
      }
      router.push(`/cms/sites/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Site type toggle */}
      <div data-tour="site-type-toggle" className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-foreground">Site type</label>
          <TourButton steps={TOUR_STEPS} />
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
          <TypeButton active={siteType === "github"} onClick={() => setSiteType("github")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </TypeButton>
          <TypeButton active={siteType === "wordpress"} onClick={() => setSiteType("wordpress")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
              <path d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.54.82-2.771.82-3.864 0-.405-.026-.78-.07-1.11m-7.981.105c.647-.03 1.232-.105 1.232-.105.582-.075.514-.93-.067-.899 0 0-1.755.135-2.88.135-1.064 0-2.85-.15-2.85-.15-.585-.03-.661.855-.075.885 0 0 .54.061 1.125.09l1.68 4.605-2.37 7.08L5.354 6.93c.648-.03 1.234-.1 1.234-.1.585-.075.516-.93-.065-.896 0 0-1.746.138-2.874.138-.2 0-.438-.008-.69-.015C4.911 3.15 8.235 1.215 12 1.215c2.809 0 5.365 1.072 7.286 2.826-.046-.003-.091-.009-.141-.009-1.06 0-1.812.923-1.812 1.914 0 .89.513 1.643 1.06 2.531.411.72.89 1.643.89 2.977 0 .915-.354 1.994-.821 3.479l-1.075 3.585-3.9-11.61zM12 22.784c-1.059 0-2.081-.153-3.048-.437l3.237-9.406 3.315 9.087c.024.053.05.101.078.149A10.738 10.738 0 0 1 12 22.784M1.215 12c0-1.369.249-2.673.688-3.884l3.895 10.674A10.779 10.779 0 0 1 1.215 12M12 0C5.385 0 0 5.385 0 12s5.385 12 12 12 12-5.385 12-12S18.615 0 12 0"/>
            </svg>
            WordPress
          </TypeButton>
        </div>
      </div>

      <div className="space-y-4">
        <div data-tour="site-name-field">
          <Field label="Site name" hint="How you'll identify this site in the dashboard">
            <Input
              type="text"
              value={form.name}
              onChange={set("name")}
              placeholder="My Company Website"
              required
            />
          </Field>
        </div>

        {siteType === "github" ? (
          <>
            <div data-tour="github-repo-field">
              <Field label="GitHub repository" hint="owner/repo, or paste the full GitHub URL — .git suffix is stripped automatically">
                <Input
                  type="text"
                  value={form.githubRepo}
                  onChange={set("githubRepo")}
                  placeholder="acme/website  or  https://github.com/acme/website"
                  required
                />
              </Field>
            </div>

            <div data-tour="github-token-field">
              <Field
                label="Personal Access Token"
                hint={
                  <>
                    Needs <code className="bg-muted px-1 py-0.5 rounded text-[11px]">repo</code> scope.{" "}
                    <a
                      href="https://github.com/settings/tokens/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:underline"
                    >
                      Create one on GitHub ↗
                    </a>
                  </>
                }
              >
                <Input
                  type="password"
                  value={form.githubToken}
                  onChange={set("githubToken")}
                  placeholder="ghp_…"
                  required
                />
              </Field>
            </div>

            <Field label="Live site URL" hint="Optional — enables in-app live preview (e.g. https://acme.com)">
              <Input
                type="url"
                value={form.siteUrl}
                onChange={set("siteUrl")}
                placeholder="https://your-site.com"
              />
            </Field>

            <div data-tour="branch-fields" className="grid grid-cols-2 gap-3">
              <Field label="Production branch" hint="Leave blank to auto-detect from GitHub">
                <Input
                  type="text"
                  value={form.defaultBranch}
                  onChange={set("defaultBranch")}
                  placeholder="auto-detect (main / master / …)"
                />
              </Field>
              <Field label="Staging branch">
                <Input type="text" value={form.stagingBranch} onChange={set("stagingBranch")} />
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="WordPress site URL" hint="The root URL of your WordPress site (e.g. https://mysite.com)">
              <Input
                type="url"
                value={form.wpUrl}
                onChange={set("wpUrl")}
                placeholder="https://mysite.com"
                required
              />
            </Field>

            <Field label="WordPress username" hint="Your WordPress admin username">
              <Input
                type="text"
                value={form.wpUsername}
                onChange={set("wpUsername")}
                placeholder="admin"
                required
                autoComplete="username"
              />
            </Field>

            <Field
              label="Application Password"
              hint={
                <>
                  Go to{" "}
                  <span className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">
                    WP Admin → Users → Profile → Application Passwords
                  </span>{" "}
                  and generate a new password. Requires WordPress 5.6+.
                </>
              }
            >
              <Input
                type="password"
                value={form.wpAppPassword}
                onChange={set("wpAppPassword")}
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                required
                autoComplete="new-password"
              />
            </Field>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M8 5v3.5M8 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      <button
        data-tour="connect-submit"
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? (
          <>
            <Spinner /> Connecting…
          </>
        ) : (
          "Connect Site"
        )}
      </button>
    </form>
  );
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 transition"
    />
  );
}

function Field({
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
      <label className="block text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
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
