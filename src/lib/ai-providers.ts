import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createPatch } from "diff";

export type ProviderName = "anthropic" | "gemini" | "nvidia" | "openai";

export interface AIProviderConfig {
  provider: ProviderName;
  model: string;
  apiKey: string;
}

export interface EditResult {
  original: string;
  edited: string;
  diff: string;
  explanation: string;
  provider: ProviderName;
  model: string;
}

export interface EditContext {
  /** 'code' for JSX/TSX/JS/CSS files; 'html' for WordPress content */
  type: "code" | "html";
  /** Page route e.g. /about, /blog/my-post */
  route?: string;
  /** Human-readable page/post title */
  title?: string;
  /** Content type label e.g. "WordPress page", "Next.js page" */
  contentLabel?: string;
  /** Previous edits — gives the AI the same "memory" as a conversation */
  history?: Array<{ prompt: string; explanation: string }>;
}

// ── System prompts ────────────────────────────────────────────────────────────

const CODE_SYSTEM = `\
You are a surgical code editor. Your only job is to make exactly one precise change to the file.

STRICT RULES (violation breaks the app):
1. Return the COMPLETE file — every single line, including unchanged parts
2. Make ONLY the change the user explicitly describes — nothing else
3. Do NOT reformat, rename variables, add imports, or restructure anything not mentioned
4. Do NOT wrap output in markdown code fences (\`\`\`) or add any explanation before the file
5. Last line of your output must be: // EDIT: <one sentence describing what changed>`;

const HTML_SYSTEM = `\
You are a surgical HTML content editor. Your only job is to make exactly one precise change to the page content.

STRICT RULES (violation corrupts the page):
1. Return the COMPLETE HTML content — every tag, attribute, and piece of text
2. Make ONLY the change the user explicitly describes — nothing else
3. Do NOT reformat HTML, change CSS classes, add attributes, or restructure tags
4. Do NOT add any explanation text before or after the HTML
5. Do NOT wrap output in markdown code fences
6. Last line of your output must be: <!-- EDIT: <one sentence describing what changed> -->`;

// ── User message builders ─────────────────────────────────────────────────────

function buildUserMessage(content: string, prompt: string, ctx?: EditContext, identifier?: string): string {
  const lines: string[] = [];

  if (ctx?.type === "html") {
    if (ctx.contentLabel) lines.push(`Content type: ${ctx.contentLabel}`);
    if (ctx.title)        lines.push(`Title: "${ctx.title}"`);
    if (ctx.route)        lines.push(`URL: ${ctx.route}`);
  } else {
    if (identifier)    lines.push(`File: ${identifier}`);
    if (ctx?.route)    lines.push(`Page route: ${ctx.route}`);
    if (ctx?.title)    lines.push(`Page title: "${ctx.title}"`);
  }

  if (ctx?.history && ctx.history.length > 0) {
    lines.push("");
    lines.push("Edit history (most recent last):");
    ctx.history.slice(-5).forEach((h, i) =>
      lines.push(`  ${i + 1}. Prompt: "${h.prompt}" → Result: ${h.explanation}`)
    );
  }

  lines.push("");
  if (ctx?.type === "html") {
    lines.push("CURRENT CONTENT:");
    lines.push(content);
  } else {
    lines.push("CURRENT FILE CONTENT:");
    lines.push("```");
    lines.push(content);
    lines.push("```");
  }

  lines.push("");
  lines.push(`CHANGE TO MAKE: ${prompt}`);

  return lines.join("\n");
}

// ── Provider call functions ───────────────────────────────────────────────────

async function callAnthropic(
  cfg: AIProviderConfig, identifier: string, content: string, prompt: string, ctx?: EditContext
): Promise<string> {
  const client = new Anthropic({ apiKey: cfg.apiKey });
  const system = ctx?.type === "html" ? HTML_SYSTEM : CODE_SYSTEM;
  const msg = await client.messages.create({
    model: cfg.model,
    max_tokens: 8096,
    system,
    messages: [{ role: "user", content: buildUserMessage(content, prompt, ctx, identifier) }],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text : content;
}

async function callGemini(
  cfg: AIProviderConfig, identifier: string, content: string, prompt: string, ctx?: EditContext
): Promise<string> {
  const system = ctx?.type === "html" ? HTML_SYSTEM : CODE_SYSTEM;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: buildUserMessage(content, prompt, ctx, identifier) }] }],
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API ${res.status}: ${text}`);
  }
  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? content;
}

async function callOpenAICompatible(
  cfg: AIProviderConfig,
  baseURL: string | undefined,
  identifier: string,
  content: string,
  prompt: string,
  ctx?: EditContext
): Promise<string> {
  const isNvidia = !!baseURL?.includes("nvidia");
  const client = new OpenAI({ apiKey: cfg.apiKey, ...(baseURL ? { baseURL } : {}) });
  const system = ctx?.type === "html" ? HTML_SYSTEM : CODE_SYSTEM;
  try {
    const msg = await client.chat.completions.create({
      model: cfg.model,
      max_tokens: isNvidia ? 4096 : 8096,
      messages: [
        { role: "system", content: system },
        { role: "user", content: buildUserMessage(content, prompt, ctx, identifier) },
      ],
    });
    return msg.choices[0]?.message?.content ?? content;
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    const label = isNvidia ? "NVIDIA" : "OpenAI";
    if (raw.includes("404")) throw new Error(`${label} model "${cfg.model}" not found. Check the model ID — NVIDIA free-tier models: meta/llama-3.1-8b-instruct, nvidia/llama-3.1-nemotron-nano-8b-v1, mistralai/mistral-7b-instruct-v0.3`);
    if (raw.includes("401") || raw.includes("403") || raw.includes("unauthorized") || raw.includes("Unauthorized")) throw new Error(`${label} API key rejected. Check your key in Settings.`);
    throw new Error(`${label} API error: ${raw}`);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function runAIEdit(
  cfg: AIProviderConfig,
  /** File path for code files, or a descriptive identifier for HTML content */
  identifier: string,
  content: string,
  prompt: string,
  /** Optional context — page route, title, edit history, content type */
  ctx?: EditContext
): Promise<EditResult> {
  let raw: string;

  switch (cfg.provider) {
    case "anthropic":
      raw = await callAnthropic(cfg, identifier, content, prompt, ctx);
      break;
    case "gemini":
      raw = await callGemini(cfg, identifier, content, prompt, ctx);
      break;
    case "nvidia":
      raw = await callOpenAICompatible(cfg, "https://integrate.api.nvidia.com/v1", identifier, content, prompt, ctx);
      break;
    case "openai":
      raw = await callOpenAICompatible(cfg, undefined, identifier, content, prompt, ctx);
      break;
    default:
      throw new Error(`Unknown provider: ${cfg.provider}`);
  }

  // Strip markdown fences if the model ignored the instruction
  let edited = raw
    .replace(/^```[\w]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();

  // Extract the trailing EDIT comment (format differs by content type)
  let explanation = "Changes applied";
  if (ctx?.type === "html") {
    const m = edited.match(/<!--\s*EDIT:\s*(.+?)\s*-->\s*$/);
    if (m) { explanation = m[1]; edited = edited.replace(/\n?<!--\s*EDIT:.*?-->\s*$/, "").trimEnd(); }
  } else {
    const m = edited.match(/\/\/\s*EDIT:\s*(.+)$/m);
    if (m) { explanation = m[1].trim(); edited = edited.replace(/\n?\/\/\s*EDIT:.*$/, "").trimEnd(); }
  }

  const diff = createPatch(identifier, content, edited, "", "");
  return { original: content, edited, diff, explanation, provider: cfg.provider, model: cfg.model };
}

// Well-known model presets per provider
export const MODEL_PRESETS: Record<ProviderName, Array<{ id: string; label: string; note?: string }>> = {
  anthropic: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", note: "Recommended" },
    { id: "claude-opus-4-8", label: "Claude Opus 4.8", note: "Most capable" },
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", note: "Fastest" },
  ],
  gemini: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", note: "Recommended" },
    { id: "gemini-2.0-flash-thinking-exp", label: "Gemini 2.0 Flash Thinking", note: "Reasoning" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", note: "Capable" },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  nvidia: [
    { id: "meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B", note: "Recommended · free" },
    { id: "nvidia/llama-3.1-nemotron-nano-8b-v1", label: "Nemotron Nano 8B", note: "NVIDIA · free" },
    { id: "mistralai/mistral-7b-instruct-v0.3", label: "Mistral 7B", note: "free" },
    { id: "meta/llama-3.2-3b-instruct", label: "Llama 3.2 3B", note: "Fastest · free" },
  ],
  openai: [
    { id: "gpt-4o", label: "GPT-4o", note: "Recommended" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", note: "Fast + cheap" },
    { id: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { id: "o1-mini", label: "o1 Mini", note: "Reasoning" },
  ],
};

export const PROVIDER_LABELS: Record<ProviderName, string> = {
  anthropic: "Anthropic",
  gemini: "Gemini",
  nvidia: "NVIDIA",
  openai: "OpenAI",
};

export const KEY_FIELD: Record<ProviderName, string> = {
  anthropic: "anthropicKey",
  gemini: "geminiKey",
  nvidia: "nvidiaKey",
  openai: "openaiKey",
};
