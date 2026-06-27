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
  if (existing.status !== "staged") {
    return NextResponse.json(
      { error: `Page is not staged (current status: ${existing.status})` },
      { status: 400 }
    );
  }

  await payload.update({
    collection: "pages",
    id: pageId,
    data: {
      status: "published",
      publishedAt: new Date().toISOString(),
    },
  });

  return NextResponse.json({ ok: true });
}
