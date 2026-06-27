import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { runAIEdit, type ProviderName, type AIProviderConfig } from "@/lib/ai-providers";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

type WPSite = { wpUrl: string; wpUsername: string; wpAppPassword: string; framework: string };
type RouteCtx = { params: Promise<{ id: string; contentId: string }> };

async function getAIConfig(payload: Awaited<ReturnType<typeof getPayload>>) {
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
  return { provider, model, apiKey };
}

async function generateSEO(cfg: AIProviderConfig, title: string, content: string) {
  const plainText = content.replace(/<[^>]*>/g, "").slice(0, 3000);
  const userMsg =
    `Page title: ${title}\n\nContent:\n${plainText}\n\n` +
    `Return ONLY a JSON object (no markdown fences) with these keys: ` +
    `title (SEO title, max 60 chars), description (meta description, max 160 chars), ` +
    `keywords (comma-separated keywords), focusPhrase (primary focus keyphrase).`;

  const systemMsg =
    "You are an SEO expert. Given page content, generate optimized SEO metadata. " +
    "Return ONLY a valid JSON object with no extra text.";

  let raw = "";
  if (cfg.provider === "anthropic") {
    const client = new Anthropic({ apiKey: cfg.apiKey });
    const msg = await client.messages.create({
      model: cfg.model,
      max_tokens: 512,
      system: systemMsg,
      messages: [{ role: "user", content: userMsg }],
    });
    const block = msg.content[0];
    raw = block.type === "text" ? block.text : "{}";
  } else {
    // For other providers reuse the generic path via a synthetic "file edit"
    const fakeContent = `{"title":"","description":"","keywords":"","focusPhrase":""}`;
    const result = await runAIEdit(cfg, "seo.json", fakeContent, `${systemMsg}\n\n${userMsg}`);
    raw = result.edited;
  }

  raw = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "").trim();
  try {
    return JSON.parse(raw) as { title?: string; description?: string; keywords?: string; focusPhrase?: string };
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const payload = await getPayload({ config });

    const site = await payload.findByID({ collection: "sites", id });
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });
    const s = (site as unknown) as WPSite;
    if (s.framework !== "wordpress") {
      return NextResponse.json({ error: "Not a WordPress site" }, { status: 400 });
    }

    const body = await req.json() as {
      mode?: "content" | "seo";
      content?: string;
      prompt?: string;
      title?: string;
      contentType?: string;
      history?: Array<{ prompt: string; explanation: string }>;
    };
    const { mode = "content", content = "", prompt = "", title = "", contentType = "content", history } = body;

    const { provider, model, apiKey } = await getAIConfig(payload);
    if (!apiKey) {
      const hint = provider === "anthropic" ? " or set ANTHROPIC_API_KEY in .env.local" : "";
      return NextResponse.json(
        { error: `No API key configured for ${provider}. Go to Settings${hint}.` },
        { status: 400 }
      );
    }
    const cfg: AIProviderConfig = { provider, model, apiKey };

    if (mode === "seo") {
      const seo = await generateSEO(cfg, title, content);
      return NextResponse.json({ seo });
    }

    if (!prompt) return NextResponse.json({ error: "prompt is required for content mode" }, { status: 400 });
    const result = await runAIEdit(cfg, `wordpress-${contentType}`, content, prompt, {
      type: "html",
      title,
      contentLabel: `WordPress ${contentType}`,
      route: s.wpUrl,
      history: history ?? [],
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST wp-content/[contentId]/ai-edit]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
