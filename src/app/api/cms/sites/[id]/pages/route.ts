import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { getRepoTree, extractPages, detectFramework } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await getPayload({ config });

    const site = await payload.findByID({ collection: "sites", id });
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const { githubRepo, githubToken, defaultBranch } = (site as unknown) as {
      githubRepo: string;
      githubToken: string;
      defaultBranch: string;
    };

    const [tree, framework] = await Promise.all([
      getRepoTree(githubToken, githubRepo, defaultBranch),
      detectFramework(githubToken, githubRepo, defaultBranch),
    ]);
    const pages = extractPages(tree, framework);

    return NextResponse.json({ pages, framework, branch: defaultBranch });
  } catch (err) {
    console.error("[GET /api/cms/sites/[id]/pages]", err);
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
