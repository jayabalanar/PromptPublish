import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";
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
      /** Current editor content — preferred over re-fetching from GitHub */
      currentContent?: string;
      /** Page route for context e.g. /about */
      pageRoute?: string;
      /** Previous edits for this file — gives AI memory across requests */
      history?: Array<{ prompt: string; explanation: string }>;
    };
    const { filePath, prompt, branch, currentContent, pageRoute, history } = body;

    if (!filePath || !prompt) {
      return NextResponse.json({ error: "filePath and prompt are required" }, { status: 400 });
    }

    const payload = await getPayload({ config });

    const site = await payload.findByID({ collection: "sites", id });
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const { githubRepo, githubToken, defaultBranch } = (site as unknown) as {
      githubRepo: string;
      githubToken: string;
      defaultBranch: string;
    };

    const aiSettings = await payload.findGlobal({ slug: "ai-settings" }) as unknown as {
      provider?: ProviderName;
      model?: string;
      anthropicKey?: string;
      geminiKey?: string;
      nvidiaKey?: string;
      openaiKey?: string;
    };

    const provider: ProviderName = aiSettings.provider ?? "anthropic";
    const model = aiSettings.model ?? "claude-sonnet-4-6";
    const keyMap: Record<ProviderName, string | undefined> = {
      anthropic: aiSettings.anthropicKey || process.env.ANTHROPIC_API_KEY,
      gemini: aiSettings.geminiKey,
      nvidia: aiSettings.nvidiaKey,
      openai: aiSettings.openaiKey,
    };
    const apiKey = keyMap[provider];

    if (!apiKey) {
      const envHint = provider === "anthropic" ? " or set ANTHROPIC_API_KEY in .env.local" : "";
      return NextResponse.json(
        { error: `No API key configured for ${provider}. Go to Settings to add one${envHint}.` },
        { status: 400 }
      );
    }

    // Use the editor's current content if provided; only fall back to GitHub fetch
    // when the editor hasn't sent its state (e.g. fresh load with no edits yet).
    const content = currentContent ?? await getFileContent(
      githubToken, githubRepo, branch ?? defaultBranch, filePath
    );

    const ctx: EditContext = {
      type: "code",
      route: pageRoute,
      history: history ?? [],
    };

    const result = await runAIEdit({ provider, model, apiKey }, filePath, content, prompt, ctx);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/cms/sites/[id]/edit]", err);
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
