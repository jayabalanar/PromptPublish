import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      siteUrl?: string;
      stagingBranch?: string;
      defaultBranch?: string;
    };

    const payload = await getPayload({ config });
    const updated = await payload.update({
      collection: "sites",
      id,
      data: body,
    });

    return NextResponse.json({ ...updated, githubToken: "***" });
  } catch (err) {
    console.error("[PATCH /api/cms/sites/[id]]", err);
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
