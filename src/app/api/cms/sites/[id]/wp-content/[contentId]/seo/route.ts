import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { getWPSEO, updateWPSEO, type SEOConfig } from "@/lib/wordpress";

export const dynamic = "force-dynamic";

type WPSite = {
  wpUrl: string; wpUsername: string; wpAppPassword: string;
  framework: string; wpHasYoast?: boolean;
};
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

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "posts") as "pages" | "posts";
    const hasYoast = searchParams.get("hasYoast") === "true" || !!site.wpHasYoast;

    const seo = await getWPSEO(
      site.wpUrl, site.wpUsername, site.wpAppPassword,
      type, parseInt(contentId, 10), hasYoast
    );
    return NextResponse.json({ seo, hasYoast });
  } catch (err) {
    console.error("[GET wp-content/[contentId]/seo]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id, contentId } = await params;
    const site = await getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });

    const body = await req.json() as { type?: "pages" | "posts"; seo: SEOConfig; hasYoast?: boolean };
    const { type = "posts", seo, hasYoast = !!site.wpHasYoast } = body;

    const updated = await updateWPSEO(
      site.wpUrl, site.wpUsername, site.wpAppPassword,
      type, parseInt(contentId, 10), seo, hasYoast
    );
    return NextResponse.json({ seo: updated, hasYoast });
  } catch (err) {
    console.error("[PATCH wp-content/[contentId]/seo]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id, contentId } = await params;
    const site = await getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "posts") as "pages" | "posts";
    const hasYoast = searchParams.get("hasYoast") === "true" || !!site.wpHasYoast;

    const empty: SEOConfig = { title: "", description: "", keywords: "", focusPhrase: "", noIndex: false };
    await updateWPSEO(
      site.wpUrl, site.wpUsername, site.wpAppPassword,
      type, parseInt(contentId, 10), empty, hasYoast
    );
    return NextResponse.json({ reset: true });
  } catch (err) {
    console.error("[DELETE wp-content/[contentId]/seo]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
