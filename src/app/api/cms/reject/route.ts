import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";

export async function POST(req: NextRequest) {
  const body = await req.json() as { pageId?: string };
  const { pageId } = body;

  if (!pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  const payload = await getPayload({ config });

  const existing = await payload.findByID({ collection: "pages", id: pageId });
  if (!existing) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  await payload.update({
    collection: "pages",
    id: pageId,
    data: { status: "draft" },
  });

  return NextResponse.json({ ok: true });
}
