import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { ensureBranchExists, commitFile } from "@/lib/github";
import { patchLocalFile } from "@/lib/site-runner";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      filePath?: string;
      content?: string;
      commitMessage?: string;
      targetBranch?: "staging" | "production";
    };
    const { filePath, content, commitMessage, targetBranch = "staging" } = body;

    if (!filePath || !content) {
      return NextResponse.json({ error: "filePath and content are required" }, { status: 400 });
    }

    const payload = await getPayload({ config });
    const site = await payload.findByID({ collection: "sites", id });
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const { githubRepo, githubToken, defaultBranch, stagingBranch } = (site as unknown) as {
      githubRepo: string;
      githubToken: string;
      defaultBranch: string;
      stagingBranch: string;
    };

    const branch = targetBranch === "production" ? defaultBranch : stagingBranch;

    if (targetBranch === "staging") {
      await ensureBranchExists(githubToken, githubRepo, defaultBranch, stagingBranch);
    }

    // Patch the local clone so the running dev server hot-reloads immediately
    patchLocalFile(id, filePath, content);

    const message = commitMessage ?? `chore: AI edit — ${filePath}`;
    const result = await commitFile(githubToken, githubRepo, branch, filePath, content, message);

    return NextResponse.json({
      commitSha: result.commitSha,
      url: result.url,
      branch,
      targetBranch,
    });
  } catch (err) {
    console.error("[POST /api/cms/sites/[id]/stage]", err);
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
