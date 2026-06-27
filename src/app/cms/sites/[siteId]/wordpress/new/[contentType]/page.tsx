import { getSiteById } from "@/lib/sites-store";
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

  const site = getSiteById(siteId);
  if (!site || site.framework !== "wordpress") notFound();

  return (
    <WPNewForm
      siteId={site.id}
      siteName={site.name}
      contentType={contentType as "pages" | "posts"}
    />
  );
}
