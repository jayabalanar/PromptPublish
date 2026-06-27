import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { notFound } from "next/navigation";
import { getWPContent } from "@/lib/wordpress";
import type { Metadata } from "next";
import { WPEditor } from "./wp-editor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ siteId: string; contentType: string; contentId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId } = await params;
  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id: siteId });
  if (!site) return {};
  return { title: `Edit — ${((site as unknown) as { name: string }).name} — PromptPublish` };
}

export default async function WPEditorPage({ params }: Props) {
  const { siteId, contentType, contentId } = await params;

  if (contentType !== "posts" && contentType !== "pages") notFound();

  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id: siteId });
  if (!site) notFound();

  const s = (site as unknown) as {
    id: string | number;
    name: string;
    framework: string;
    wpUrl?: string;
    wpUsername?: string;
    wpAppPassword?: string;
  };
  if (s.framework !== "wordpress") notFound();

  let initialItem;
  let fetchError = "";
  try {
    initialItem = await getWPContent(
      s.wpUrl ?? "",
      s.wpUsername ?? "",
      s.wpAppPassword ?? "",
      contentType as "pages" | "posts",
      parseInt(contentId, 10)
    );
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load content";
  }

  if (!initialItem && !fetchError) notFound();

  return (
    <WPEditor
      siteId={String(s.id)}
      siteName={s.name}
      contentType={contentType as "pages" | "posts"}
      contentId={parseInt(contentId, 10)}
      initialItem={initialItem ?? null}
      fetchError={fetchError}
    />
  );
}
