import { getSiteById } from "@/lib/sites-store";
import { notFound } from "next/navigation";
import { getWPContent } from "@/lib/wordpress";
import type { Metadata } from "next";
import { WPEditor } from "./wp-editor";
import demoWPContent from "@/data/demo-wp-content.json";

type DemoMap = Record<string, { posts: DemoItem[]; pages: DemoItem[] }>;
type DemoItem = {
  id: number; title: string; slug: string; status: string;
  link: string; modified: string; excerpt: string; content: string;
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ siteId: string; contentType: string; contentId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site) return {};
  return { title: `Edit — ${site.name} — PromptPublish` };
}

export default async function WPEditorPage({ params }: Props) {
  const { siteId, contentType, contentId } = await params;
  if (contentType !== "posts" && contentType !== "pages") notFound();

  const site = getSiteById(siteId);
  if (!site || site.framework !== "wordpress") notFound();

  let initialItem;
  let fetchError = "";
  const numId = parseInt(contentId, 10);

  if (!site.wpUsername || !site.wpAppPassword) {
    const demo = (demoWPContent as DemoMap)[siteId];
    initialItem = demo?.[contentType as "pages" | "posts"]?.find((i: DemoItem) => i.id === numId);
  } else {
    try {
      initialItem = await getWPContent(
        site.wpUrl ?? "",
        site.wpUsername ?? "",
        site.wpAppPassword ?? "",
        contentType as "pages" | "posts",
        numId
      );
    } catch (err) {
      fetchError = err instanceof Error ? err.message : "Failed to load content";
    }
  }

  if (!initialItem && !fetchError) notFound();

  return (
    <WPEditor
      siteId={site.id}
      siteName={site.name}
      contentType={contentType as "pages" | "posts"}
      contentId={parseInt(contentId, 10)}
      initialItem={initialItem ?? null}
      fetchError={fetchError}
      isDemo={!site.wpUsername || !site.wpAppPassword}
    />
  );
}
