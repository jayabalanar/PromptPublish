import { NextRequest, NextResponse } from "next/server";
import { getSiteById } from "@/lib/sites-store";
import { ensureBranchExists, commitFile } from "@/lib/github";

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

    const site = getSiteById(id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const { githubRepo, githubToken, defaultBranch = "main", stagingBranch = "staging" } = site;
    const branch = targetBranch === "production" ? defaultBranch : stagingBranch;

    if (targetBranch === "staging") {
      await ensureBranchExists(githubToken!, githubRepo!, defaultBranch, stagingBranch);
    }

    const message = commitMessage ?? `chore: AI edit — ${filePath}`;
    const result = await commitFile(githubToken!, githubRepo!, branch, filePath, content, message);

    return NextResponse.json({ commitSha: result.commitSha, url: result.url, branch, targetBranch });
  } catch (err) {
    console.error("[POST /api/cms/sites/[id]/stage]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
