import { NextRequest, NextResponse } from "next/server";
import { getSiteById } from "@/lib/sites-store";
import { getFileContent } from "@/lib/github";
import { runAIEdit, type ProviderName, type EditContext } from "@/lib/ai-providers";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      filePath?: string;
      prompt?: string;
      branch?: string;
      currentContent?: string;
      pageRoute?: string;
      history?: Array<{ prompt: string; explanation: string }>;
    };
    const { filePath, prompt, branch, currentContent, pageRoute, history } = body;

    if (!filePath || !prompt) {
      return NextResponse.json({ error: "filePath and prompt are required" }, { status: 400 });
    }

    const site = getSiteById(id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const { githubRepo, githubToken, defaultBranch } = site;

    const provider: ProviderName = "anthropic";
    const model = "claude-sonnet-4-6";
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 400 });
    }

    const content = currentContent ?? await getFileContent(
      githubToken!, githubRepo!, branch ?? defaultBranch ?? "main", filePath
    );

    const ctx: EditContext = { type: "code", route: pageRoute, history: history ?? [] };
    const result = await runAIEdit({ provider, model, apiKey }, filePath, content, prompt, ctx);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/cms/sites/[id]/edit]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
