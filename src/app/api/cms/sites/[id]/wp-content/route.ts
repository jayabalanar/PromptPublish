import { NextRequest, NextResponse } from "next/server";
import { getSiteById } from "@/lib/sites-store";
import { listWPContent, createWPContent } from "@/lib/wordpress";
import demoWPContent from "@/data/demo-wp-content.json";

export const dynamic = "force-dynamic";

type DemoContentMap = Record<string, { posts: DemoItem[]; pages: DemoItem[] }>;
type DemoItem = {
  id: number; title: string; slug: string; status: string;
  link: string; modified: string; excerpt: string; content: string;
};

function getWPSite(id: string) {
  const site = getSiteById(id);
  if (!site || site.framework !== "wordpress") return null;
  return site as typeof site & { wpUrl: string; wpUsername: string; wpAppPassword: string };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const site = getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") ?? "posts") as "pages" | "posts";
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const perPage = parseInt(searchParams.get("perPage") ?? "20", 10);
    const search = searchParams.get("search") ?? "";

    // Demo mode: serve static data when no credentials are set
    if (!site.wpUsername || !site.wpAppPassword) {
      const demo = (demoWPContent as DemoContentMap)[id];
      if (demo) {
        let items = demo[type] as DemoItem[];
        if (search) {
          const q = search.toLowerCase();
          items = items.filter((i) => i.title.toLowerCase().includes(q) || i.slug.includes(q));
        }
        const total = items.length;
        const start = (page - 1) * perPage;
        return NextResponse.json({ items: items.slice(start, start + perPage), total });
      }
    }

    const result = await listWPContent(site.wpUrl, site.wpUsername, site.wpAppPassword, type, {
      page, perPage, search, status: searchParams.get("status") ?? "any",
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const site = getWPSite(id);
    if (!site) return NextResponse.json({ error: "WordPress site not found" }, { status: 404 });

    if (!site.wpUsername || !site.wpAppPassword) {
      return NextResponse.json({ error: "Connect your WordPress credentials to create content." }, { status: 400 });
    }

    const body = await req.json() as {
      type?: "pages" | "posts"; title?: string; content?: string; status?: string; excerpt?: string;
    };
    const { type = "posts", title, content, status = "draft", excerpt } = body;
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

    const item = await createWPContent(site.wpUrl, site.wpUsername, site.wpAppPassword, type, {
      title, content: content ?? "", status, excerpt,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
