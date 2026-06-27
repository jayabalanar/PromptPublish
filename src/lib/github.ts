const GITHUB_API = "https://api.github.com";

export interface GitHubFile {
  path: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
}

export interface PageFile {
  path: string;
  label: string;
  route: string;
}

export interface RepoInfo {
  defaultBranch: string;
  fullName: string;
  isPrivate: boolean;
}

async function ghFetch(token: string, endpoint: string) {
  const res = await fetch(`${GITHUB_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub ${res.status}: ${text}`);
  }
  return res.json();
}

/** Verify the token works and return the repo's real default branch. */
export async function getRepoInfo(token: string, repo: string): Promise<RepoInfo> {
  const data = await ghFetch(token, `/repos/${repo}`);
  return {
    defaultBranch: data.default_branch as string,
    fullName: data.full_name as string,
    isPrivate: data.private as boolean,
  };
}

/** Fetch the full recursive file tree for a branch. */
export async function getRepoTree(
  token: string,
  repo: string,
  branch: string
): Promise<GitHubFile[]> {
  // Use the branch name directly as the tree ref — avoids the git/ref endpoint
  // that returns an identical 404 for both "repo not found" and "branch not found".
  const treeData = await ghFetch(
    token,
    `/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  return treeData.tree as GitHubFile[];
}

export async function detectFramework(
  token: string,
  repo: string,
  branch: string
): Promise<"nextjs-app" | "nextjs-pages" | "react" | "unknown"> {
  try {
    const tree = await getRepoTree(token, repo, branch);
    const paths = new Set(tree.map((f) => f.path));

    if (
      paths.has("app/page.tsx") ||
      paths.has("app/page.jsx") ||
      paths.has("src/app/page.tsx") ||
      paths.has("src/app/page.jsx")
    ) return "nextjs-app";

    if (
      paths.has("pages/index.tsx") ||
      paths.has("pages/index.jsx") ||
      paths.has("src/pages/index.tsx")
    ) return "nextjs-pages";

    if (
      paths.has("next.config.js") ||
      paths.has("next.config.ts") ||
      paths.has("next.config.mjs") ||
      paths.has("next.config.cjs")
    ) {
      const hasApp = tree.some((f) => f.path.match(/^(src\/)?app\//));
      return hasApp ? "nextjs-app" : "nextjs-pages";
    }

    return "react";
  } catch {
    return "unknown";
  }
}

export function extractPages(tree: GitHubFile[], framework: string): PageFile[] {
  const pages: PageFile[] = [];

  if (framework === "nextjs-app") {
    const appRoot = tree.some((f) => f.path.startsWith("src/app/")) ? "src/app" : "app";

    for (const file of tree) {
      if (file.type !== "blob") continue;
      if (!file.path.startsWith(appRoot + "/")) continue;
      if (!file.path.match(/\/page\.(tsx?|jsx?)$/)) continue;

      const relative = file.path.slice(appRoot.length + 1);
      const dir = relative.replace(/\/page\.(tsx?|jsx?)$/, "");
      const isRoot = !dir.includes("/") && dir.match(/^page\.(tsx?|jsx?)$/);
      const route = isRoot ? "/" : `/${dir}`;

      pages.push({
        path: file.path,
        label: route === "/" ? "Home" : route.replace(/^\//, "").replace(/\//g, " / "),
        route,
      });
    }
  } else if (framework === "nextjs-pages") {
    const pagesRoot = tree.some((f) => f.path.startsWith("src/pages/")) ? "src/pages" : "pages";

    for (const file of tree) {
      if (file.type !== "blob") continue;
      if (!file.path.startsWith(pagesRoot + "/")) continue;
      if (!file.path.match(/\.(tsx?|jsx?)$/)) continue;

      const relative = file.path.slice(pagesRoot.length + 1);
      if (relative.startsWith("api/") || relative.startsWith("_")) continue;

      const withoutExt = relative.replace(/\.(tsx?|jsx?)$/, "");
      const route = withoutExt === "index" ? "/" : `/${withoutExt}`;

      pages.push({
        path: file.path,
        label: route === "/" ? "Home" : route.replace(/^\//, "").replace(/\//g, " / "),
        route,
      });
    }
  }

  return pages.sort((a, b) => a.route.localeCompare(b.route));
}

export async function getFileContent(
  token: string,
  repo: string,
  branch: string,
  filePath: string
): Promise<string> {
  const data = await ghFetch(token, `/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`);
  return Buffer.from(data.content as string, "base64").toString("utf-8");
}

export async function commitFile(
  token: string,
  repo: string,
  branch: string,
  filePath: string,
  content: string,
  message: string
): Promise<{ commitSha: string; url: string }> {
  let currentSha: string | undefined;
  try {
    const existing = await ghFetch(token, `/repos/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`);
    currentSha = existing.sha as string;
  } catch {
    // New file
  }

  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString("base64"),
    branch,
  };
  if (currentSha) body.sha = currentSha;

  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${filePath}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub commit ${res.status}: ${text}`);
  }

  const result = await res.json();
  return {
    commitSha: (result.commit as { sha: string }).sha,
    url: (result.content as { html_url: string }).html_url,
  };
}

export async function ensureBranchExists(
  token: string,
  repo: string,
  baseBranch: string,
  newBranch: string
): Promise<void> {
  try {
    await ghFetch(token, `/repos/${repo}/git/ref/heads/${newBranch}`);
    return; // already exists
  } catch {
    // create it
  }

  const base = await ghFetch(token, `/repos/${repo}/git/ref/heads/${baseBranch}`);
  const sha = (base.object as { sha: string }).sha;

  await fetch(`${GITHUB_API}/repos/${repo}/git/refs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha }),
  });
}
