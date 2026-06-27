export interface WPItem {
  id: number;
  title: string;
  slug: string;
  status: "publish" | "draft" | "private" | "pending";
  content: string;
  excerpt: string;
  link: string;
  modified: string;
  type: "page" | "post";
}

export interface SEOConfig {
  title?: string;
  description?: string;
  keywords?: string;
  focusPhrase?: string;
  noIndex?: boolean;
}

export interface WPSiteInfo {
  name: string;
  url: string;
  version: string;
  hasYoast: boolean;
}

interface WPRawPost {
  id: number;
  slug: string;
  status: string;
  link: string;
  modified: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  yoast_head_json?: {
    title?: string;
    description?: string;
    robots?: { index?: string };
  };
  meta?: Record<string, unknown>;
}

interface WPRootResponse {
  name?: string;
  url?: string;
  namespaces?: string[];
  gmt_offset?: number;
}

function authHeader(username: string, appPassword: string) {
  return "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
}

function apiBase(siteUrl: string) {
  return siteUrl.replace(/\/$/, "") + "/wp-json/wp/v2";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

function normalizeItem(raw: WPRawPost, type: "page" | "post"): WPItem {
  return {
    id: raw.id,
    title: stripHtml(raw.title?.rendered ?? ""),
    slug: raw.slug,
    status: (raw.status ?? "draft") as WPItem["status"],
    content: raw.content?.rendered ?? "",
    excerpt: stripHtml(raw.excerpt?.rendered ?? ""),
    link: raw.link,
    modified: raw.modified,
    type,
  };
}

export async function verifyWPSite(
  siteUrl: string,
  username: string,
  appPassword: string
): Promise<WPSiteInfo> {
  const base = siteUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/wp-json`, {
    headers: { Authorization: authHeader(username, appPassword) },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("WordPress credentials rejected. Check your username and Application Password.");
  }
  if (!res.ok) {
    throw new Error(`WordPress site not reachable (${res.status}). Verify the site URL and that the REST API is enabled.`);
  }
  const data = await res.json() as WPRootResponse;

  // Detect Yoast by checking registered namespaces
  const namespaces: string[] = Array.isArray(data.namespaces) ? data.namespaces : [];
  const hasYoast = namespaces.some((ns) => ns.startsWith("yoast"));

  return {
    name: data.name ?? siteUrl,
    url: base,
    version: "",
    hasYoast,
  };
}

export async function listWPContent(
  siteUrl: string,
  username: string,
  appPassword: string,
  type: "pages" | "posts",
  opts: { page?: number; perPage?: number; search?: string; status?: string } = {}
): Promise<{ items: WPItem[]; total: number }> {
  const { page = 1, perPage = 20, search = "", status = "any" } = opts;
  const params = new URLSearchParams({
    per_page: String(perPage),
    page: String(page),
    status,
    _fields: "id,slug,status,link,modified,title,content,excerpt",
  });
  if (search) params.set("search", search);

  const res = await fetch(`${apiBase(siteUrl)}/${type}?${params}`, {
    headers: { Authorization: authHeader(username, appPassword) },
  });
  if (!res.ok) throw new Error(`Failed to list ${type}: ${res.status}`);

  const total = parseInt(res.headers.get("X-WP-Total") ?? "0", 10);
  const raw = await res.json() as WPRawPost[];
  const contentType = type === "pages" ? "page" : "post";
  return { items: raw.map((r) => normalizeItem(r, contentType)), total };
}

export async function getWPContent(
  siteUrl: string,
  username: string,
  appPassword: string,
  type: "pages" | "posts",
  id: number
): Promise<WPItem> {
  const res = await fetch(`${apiBase(siteUrl)}/${type}/${id}`, {
    headers: { Authorization: authHeader(username, appPassword) },
  });
  if (res.status === 404) throw new Error("Content not found");
  if (!res.ok) throw new Error(`Failed to fetch content: ${res.status}`);
  const raw = await res.json() as WPRawPost;
  return normalizeItem(raw, type === "pages" ? "page" : "post");
}

export async function createWPContent(
  siteUrl: string,
  username: string,
  appPassword: string,
  type: "pages" | "posts",
  data: { title: string; content: string; status?: string; excerpt?: string }
): Promise<WPItem> {
  const res = await fetch(`${apiBase(siteUrl)}/${type}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(username, appPassword),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: data.title,
      content: data.content,
      status: data.status ?? "draft",
      excerpt: data.excerpt ?? "",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create ${type.slice(0, -1)}: ${err}`);
  }
  const raw = await res.json() as WPRawPost;
  return normalizeItem(raw, type === "pages" ? "page" : "post");
}

export async function updateWPContent(
  siteUrl: string,
  username: string,
  appPassword: string,
  type: "pages" | "posts",
  id: number,
  data: Partial<{ title: string; content: string; status: string; excerpt: string }>
): Promise<WPItem> {
  const res = await fetch(`${apiBase(siteUrl)}/${type}/${id}`, {
    method: "POST", // WP REST uses POST for updates too (or PUT)
    headers: {
      Authorization: authHeader(username, appPassword),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update: ${err}`);
  }
  const raw = await res.json() as WPRawPost;
  return normalizeItem(raw, type === "pages" ? "page" : "post");
}

export async function deleteWPContent(
  siteUrl: string,
  username: string,
  appPassword: string,
  type: "pages" | "posts",
  id: number
): Promise<void> {
  const res = await fetch(`${apiBase(siteUrl)}/${type}/${id}?force=true`, {
    method: "DELETE",
    headers: { Authorization: authHeader(username, appPassword) },
  });
  if (!res.ok && res.status !== 410) {
    const err = await res.text();
    throw new Error(`Failed to delete: ${err}`);
  }
}

export async function getWPSEO(
  siteUrl: string,
  username: string,
  appPassword: string,
  type: "pages" | "posts",
  id: number,
  hasYoast: boolean
): Promise<SEOConfig> {
  if (hasYoast) {
    // Request yoast_head_json field
    const res = await fetch(`${apiBase(siteUrl)}/${type}/${id}?_fields=yoast_head_json,meta`, {
      headers: { Authorization: authHeader(username, appPassword) },
    });
    if (!res.ok) throw new Error(`Failed to fetch SEO: ${res.status}`);
    const raw = await res.json() as {
      yoast_head_json?: {
        title?: string;
        description?: string;
        robots?: { index?: string };
      };
      meta?: Record<string, unknown>;
    };
    const yoast = raw.yoast_head_json ?? {};
    const meta = raw.meta ?? {};
    return {
      title: (meta["yoast_wpseo_title"] as string | undefined) ?? yoast.title ?? "",
      description: (meta["yoast_wpseo_metadesc"] as string | undefined) ?? yoast.description ?? "",
      keywords: (meta["yoast_wpseo_metakeywords"] as string | undefined) ?? "",
      focusPhrase: (meta["yoast_wpseo_focuskw"] as string | undefined) ?? "",
      noIndex: yoast.robots?.index === "noindex",
    };
  }

  // Generic meta fallback
  const res = await fetch(`${apiBase(siteUrl)}/${type}/${id}?_fields=meta`, {
    headers: { Authorization: authHeader(username, appPassword) },
  });
  if (!res.ok) throw new Error(`Failed to fetch SEO: ${res.status}`);
  const raw = await res.json() as { meta?: Record<string, unknown> };
  const meta = raw.meta ?? {};
  return {
    title: (meta["_seo_title"] as string | undefined) ?? "",
    description: (meta["_seo_description"] as string | undefined) ?? "",
    keywords: (meta["_seo_keywords"] as string | undefined) ?? "",
    focusPhrase: (meta["_seo_focus_phrase"] as string | undefined) ?? "",
    noIndex: (meta["_seo_no_index"] as boolean | undefined) ?? false,
  };
}

export async function updateWPSEO(
  siteUrl: string,
  username: string,
  appPassword: string,
  type: "pages" | "posts",
  id: number,
  seo: SEOConfig,
  hasYoast: boolean
): Promise<SEOConfig> {
  let meta: Record<string, unknown>;

  if (hasYoast) {
    meta = {
      yoast_wpseo_title: seo.title ?? "",
      yoast_wpseo_metadesc: seo.description ?? "",
      yoast_wpseo_metakeywords: seo.keywords ?? "",
      yoast_wpseo_focuskw: seo.focusPhrase ?? "",
    };
  } else {
    meta = {
      _seo_title: seo.title ?? "",
      _seo_description: seo.description ?? "",
      _seo_keywords: seo.keywords ?? "",
      _seo_focus_phrase: seo.focusPhrase ?? "",
      _seo_no_index: seo.noIndex ?? false,
    };
  }

  const res = await fetch(`${apiBase(siteUrl)}/${type}/${id}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(username, appPassword),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ meta }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update SEO: ${err}`);
  }
  return seo;
}
