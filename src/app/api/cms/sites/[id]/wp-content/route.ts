import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { listWPContent, createWPContent } from "@/lib/wordpress";

export const dynamic = "force-dynamic";

type WPSite = { wpUrl: string; wpUsername: string; wpAppPassword: string; framework: string };

async function getWPSite(id: string) {
  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id });
  if (!site) return null;
  const s = (site as unknown) as WPSite;
  if (s.framework !== "wordpress") return null;
  return s;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const site = await getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "posts") as "pages" | "posts";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const perPage = parseInt(searchParams.get("perPage") ?? "20", 10);
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "any";

    const result = await listWPContent(site.wpUrl, site.wpUsername, site.wpAppPassword, type, {
      page, perPage, search, status,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/cms/sites/[id]/wp-content]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const site = await getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });

    const body = await req.json() as {
      type?: "pages" | "posts";
      title?: string;
      content?: string;
      status?: string;
      excerpt?: string;
    };

    const { type = "posts", title, content, status = "draft", excerpt } = body;
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const item = await createWPContent(site.wpUrl, site.wpUsername, site.wpAppPassword, type, {
      title, content: content ?? "", status, excerpt,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("[POST /api/cms/sites/[id]/wp-content]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
