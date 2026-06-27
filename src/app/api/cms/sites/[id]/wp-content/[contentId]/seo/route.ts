import { NextRequest, NextResponse } from "next/server";
import { getSiteById } from "@/lib/sites-store";
import { getWPSEO, updateWPSEO, type SEOConfig } from "@/lib/wordpress";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ id: string; contentId: string }> };

function getWPSite(id: string) {
  const site = getSiteById(id);
  if (!site || site.framework !== "wordpress") return null;
  return site as typeof site & { wpUrl: string; wpUsername: string; wpAppPassword: string };
}

export async function GET(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id, contentId } = await params;
    const site = getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "posts") as "pages" | "posts";
    const hasYoast = searchParams.get("hasYoast") === "true";
    const seo = await getWPSEO(site.wpUrl, site.wpUsername, site.wpAppPassword, type, parseInt(contentId, 10), hasYoast);
    return NextResponse.json({ seo, hasYoast });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id, contentId } = await params;
    const site = getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });
    const body = await req.json() as { type?: "pages" | "posts"; seo: SEOConfig; hasYoast?: boolean };
    const { type = "posts", seo, hasYoast = false } = body;
    const updated = await updateWPSEO(site.wpUrl, site.wpUsername, site.wpAppPassword, type, parseInt(contentId, 10), seo, hasYoast);
    return NextResponse.json({ seo: updated, hasYoast });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id, contentId } = await params;
    const site = getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });
    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "posts") as "pages" | "posts";
    const hasYoast = searchParams.get("hasYoast") === "true";
    const empty: SEOConfig = { title: "", description: "", keywords: "", focusPhrase: "", noIndex: false };
    await updateWPSEO(site.wpUrl, site.wpUsername, site.wpAppPassword, type, parseInt(contentId, 10), empty, hasYoast);
    return NextResponse.json({ reset: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
