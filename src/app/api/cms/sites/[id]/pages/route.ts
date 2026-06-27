import { NextRequest, NextResponse } from "next/server";
import { getSiteById } from "@/lib/sites-store";
import { getRepoTree, extractPages, detectFramework } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const site = getSiteById(id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const { githubRepo, githubToken, defaultBranch = "main" } = site;

    const [tree, framework] = await Promise.all([
      getRepoTree(githubToken!, githubRepo!, defaultBranch),
      detectFramework(githubToken!, githubRepo!, defaultBranch),
    ]);
    const pages = extractPages(tree, framework);
    return NextResponse.json({ pages, framework, branch: defaultBranch });
  } catch (err) {
    console.error("[GET /api/cms/sites/[id]/pages]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
