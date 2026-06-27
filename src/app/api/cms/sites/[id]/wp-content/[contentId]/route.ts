import { NextRequest, NextResponse } from "next/server";
import { getSiteById } from "@/lib/sites-store";
import { getWPContent, updateWPContent, deleteWPContent } from "@/lib/wordpress";
import demoWPContent from "@/data/demo-wp-content.json";

type DemoContentMap = Record<string, { posts: DemoItem[]; pages: DemoItem[] }>;
type DemoItem = {
  id: number; title: string; slug: string; status: string;
  link: string; modified: string; excerpt: string; content: string;
};

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
    const type = (new URL(req.url).searchParams.get("type") ?? "posts") as "pages" | "posts";
    const numId = parseInt(contentId, 10);

    if (!site.wpUsername || !site.wpAppPassword) {
      const demo = (demoWPContent as DemoContentMap)[id];
      const item = demo?.[type]?.find((i: DemoItem) => i.id === numId);
      if (item) return NextResponse.json(item);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const item = await getWPContent(site.wpUrl, site.wpUsername, site.wpAppPassword, type, numId);
    return NextResponse.json(item);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id, contentId } = await params;
    const site = getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });
    const body = await req.json() as { type?: "pages" | "posts"; title?: string; content?: string; status?: string; excerpt?: string };
    const { type = "posts", ...data } = body;
    const item = await updateWPContent(site.wpUrl, site.wpUsername, site.wpAppPassword, type, parseInt(contentId, 10), data);
    return NextResponse.json(item);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteCtx) {
  try {
    const { id, contentId } = await params;
    const site = getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });
    const type = (new URL(req.url).searchParams.get("type") ?? "posts") as "pages" | "posts";
    await deleteWPContent(site.wpUrl, site.wpUsername, site.wpAppPassword, type, parseInt(contentId, 10));
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
