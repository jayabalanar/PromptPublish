import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { WPNewForm } from "./wp-new-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ siteId: string; contentType: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { contentType } = await params;
  return { title: `New ${contentType === "pages" ? "Page" : "Post"} — PromptPublish` };
}

export default async function WPNewPage({ params }: Props) {
  const { siteId, contentType } = await params;
  if (contentType !== "posts" && contentType !== "pages") notFound();

  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id: siteId });
  if (!site) notFound();

  const s = (site as unknown) as { id: string | number; name: string; framework: string };
  if (s.framework !== "wordpress") notFound();

  return (
    <WPNewForm
      siteId={String(s.id)}
      siteName={s.name}
      contentType={contentType as "pages" | "posts"}
    />
  );
}
