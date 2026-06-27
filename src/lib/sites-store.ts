import seedData from "@/data/sites.json";

export interface Site {
  id: string;
  name: string;
  framework: "nextjs" | "react" | "wordpress";
  // GitHub
  githubRepo?: string;
  githubToken?: string;
  defaultBranch?: string;
  stagingBranch?: string;
  siteUrl?: string;
  vercelProjectId?: string;
  // WordPress
  wpUrl?: string;
  wpUsername?: string;
  wpAppPassword?: string;
  updatedAt: string;
}

// Module-level map — survives across requests within the same Lambda instance.
// Initialised once from the bundled JSON seed; new sites added via POST live here
// until the function is cold-started again (acceptable for a demo / no-DB setup).
const store = new Map<string, Site>(
  (seedData as Site[]).map((s) => [s.id, s])
);

let counter = store.size;

function nextId(): string {
  return `site-${Date.now()}-${++counter}`;
}

export function getAllSites(): Site[] {
  return [...store.values()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getSiteById(id: string): Site | undefined {
  return store.get(id);
}

export function createSite(data: Omit<Site, "id" | "updatedAt">): Site {
  const site: Site = { ...data, id: nextId(), updatedAt: new Date().toISOString() };
  store.set(site.id, site);
  return site;
}

export function updateSite(id: string, patch: Partial<Site>): Site | undefined {
  const existing = store.get(id);
  if (!existing) return undefined;
  const updated: Site = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  store.set(id, updated);
  return updated;
}

export function deleteSite(id: string): boolean {
  return store.delete(id);
}

/** Returns the site with credentials redacted for safe API responses */
export function redact(site: Site): Site {
  return {
    ...site,
    githubToken: site.githubToken ? "***" : undefined,
    wpAppPassword: site.wpAppPassword ? "***" : undefined,
  };
}
