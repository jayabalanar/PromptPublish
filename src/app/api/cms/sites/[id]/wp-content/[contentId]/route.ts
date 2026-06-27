import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { getWPContent, updateWPContent, deleteWPContent } from "@/lib/wordpress";

export const dynamic = "force-dynamic";

type WPSite = { wpUrl: string; wpUsername: string; wpAppPassword: string; framework: string };
type RouteCtx = { params: Promise<{ id: string; contentId: string }> };

async function getWPSite(id: string) {
  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id });
  if (!site) return null;
  const s = (site as unknown) as WPSite;
  if (s.framework !== "wordpress") return null;
  return s;
}

export async function GET(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id, contentId } = await params;
    const site = await getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });

    const type = (new URL(req.url).searchParams.get("type") ?? "posts") as "pages" | "posts";
    const item = await getWPContent(site.wpUrl, site.wpUsername, site.wpAppPassword, type, parseInt(contentId, 10));
    return NextResponse.json(item);
  } catch (err) {
    console.error("[GET wp-content/[contentId]]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id, contentId } = await params;
    const site = await getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });

    const body = await req.json() as {
      type?: "pages" | "posts";
      title?: string;
      content?: string;
      status?: string;
      excerpt?: string;
    };
    const { type = "posts", ...data } = body;
    const item = await updateWPContent(site.wpUrl, site.wpUsername, site.wpAppPassword, type, parseInt(contentId, 10), data);
    return NextResponse.json(item);
  } catch (err) {
    console.error("[PATCH wp-content/[contentId]]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id, contentId } = await params;
    const site = await getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });

    const type = (new URL(req.url).searchParams.get("type") ?? "posts") as "pages" | "posts";
    await deleteWPContent(site.wpUrl, site.wpUsername, site.wpAppPassword, type, parseInt(contentId, 10));
    return NextResponse.json({ deleted: true });
  } catch (err) {
    console.error("[DELETE wp-content/[contentId]]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
