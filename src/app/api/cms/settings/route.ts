import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";

export const dynamic = "force-dynamic";

const KEY_FIELDS = ["anthropicKey", "geminiKey", "nvidiaKey", "openaiKey"] as const;

function maskKeys(doc: Record<string, unknown>) {
  const masked = { ...doc };
  for (const key of KEY_FIELDS) {
    if (masked[key]) masked[key] = "***";
  }
  return masked;
}

export async function GET() {
  try {
    const payload = await getPayload({ config });
    const settings = await payload.findGlobal({ slug: "ai-settings" });
    return NextResponse.json(maskKeys(settings as unknown as Record<string, unknown>));
  } catch (err) {
    console.error("[GET /api/cms/settings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      provider?: string;
      model?: string;
      anthropicKey?: string;
      geminiKey?: string;
      nvidiaKey?: string;
      openaiKey?: string;
    };

    const payload = await getPayload({ config });

    // Fetch existing to keep masked/unchanged keys
    const existing = await payload.findGlobal({ slug: "ai-settings" }) as unknown as Record<string, unknown>;

    const data: Record<string, unknown> = {};
    if (body.provider) data.provider = body.provider;
    if (body.model) data.model = body.model;

    // Only update a key if a real value was submitted (not "***" or empty)
    for (const key of KEY_FIELDS) {
      const val = body[key];
      if (val && val !== "***") {
        data[key] = val;
      } else if (!val) {
        // Empty string means "clear this key"
        data[key] = "";
      } else {
        // "***" means unchanged — keep existing
        data[key] = existing[key] ?? "";
      }
    }

    const updated = await payload.updateGlobal({ slug: "ai-settings", data });
    return NextResponse.json(maskKeys(updated as unknown as Record<string, unknown>));
  } catch (err) {
    console.error("[POST /api/cms/settings]", err);
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
