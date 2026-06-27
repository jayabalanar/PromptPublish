import { NextRequest, NextResponse } from "next/server";
import { getSiteById } from "@/lib/sites-store";
import { runAIEdit, type AIProviderConfig } from "@/lib/ai-providers";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string; contentId: string }> };

function getAIConfig(): AIProviderConfig & { apiKey: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  return { provider: "anthropic", model: "claude-sonnet-4-6", apiKey };
}

async function generateSEO(cfg: AIProviderConfig & { apiKey: string }, title: string, content: string) {
  const plainText = content.replace(/<[^>]*>/g, "").slice(0, 3000);
  const userMsg =
    `Page title: ${title}\n\nContent:\n${plainText}\n\n` +
    `Return ONLY a JSON object (no markdown fences) with these keys: ` +
    `title (SEO title, max 60 chars), description (meta description, max 160 chars), ` +
    `keywords (comma-separated keywords), focusPhrase (primary focus keyphrase).`;
  const systemMsg =
    "You are an SEO expert. Given page content, generate optimized SEO metadata. " +
    "Return ONLY a valid JSON object with no extra text.";

  const client = new Anthropic({ apiKey: cfg.apiKey });
  const msg = await client.messages.create({
    model: cfg.model,
    max_tokens: 512,
    system: systemMsg,
    messages: [{ role: "user", content: userMsg }],
  });
  const block = msg.content[0];
  let raw = block.type === "text" ? block.text : "{}";
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
    const site = getSiteById(id);
    if (!site || site.framework !== "wordpress") {
      return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });
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

    const cfg = getAIConfig();
    if (!cfg.apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set." }, { status: 400 });
    }

    if (mode === "seo") {
      const seo = await generateSEO(cfg, title, content);
      return NextResponse.json({ seo });
    }

    if (!prompt) return NextResponse.json({ error: "prompt is required for content mode" }, { status: 400 });

    const result = await runAIEdit(cfg, `wordpress-${contentType}`, content, prompt, {
      type: "html",
      title,
      contentLabel: `WordPress ${contentType}`,
      route: site.wpUrl,
      history: history ?? [],
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST wp-content/[contentId]/ai-edit]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
