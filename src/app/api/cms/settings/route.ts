import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AISettings = {
  provider: string;
  model: string;
  anthropicKey: string;
  geminiKey: string;
  nvidiaKey: string;
  openaiKey: string;
};

let settings: AISettings = {
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  geminiKey: "",
  nvidiaKey: "",
  openaiKey: "",
};

function maskKeys(s: AISettings) {
  return {
    ...s,
    anthropicKey: s.anthropicKey ? "***" : "",
    geminiKey: s.geminiKey ? "***" : "",
    nvidiaKey: s.nvidiaKey ? "***" : "",
    openaiKey: s.openaiKey ? "***" : "",
  };
}

export async function GET() {
  return NextResponse.json(maskKeys(settings));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<AISettings>;
    if (body.provider) settings.provider = body.provider;
    if (body.model) settings.model = body.model;

    for (const key of ["anthropicKey", "geminiKey", "nvidiaKey", "openaiKey"] as const) {
      const val = body[key];
      if (val === undefined) continue;
      if (val === "***") continue; // unchanged
      settings[key] = val;
    }

    return NextResponse.json(maskKeys(settings));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
