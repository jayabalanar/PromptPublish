import { getSiteById } from "@/lib/sites-store";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { WPContentList } from "./wp-content-list";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ siteId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site) return {};
  return { title: `${site.name} — WordPress — PromptPublish` };
}

export default async function WordPressPage({ params }: Props) {
  const { siteId } = await params;
  const site = getSiteById(siteId);
  if (!site || site.framework !== "wordpress") notFound();

  const isDemo = !site.wpUsername || !site.wpAppPassword;
  return <WPContentList siteId={site.id} siteName={site.name} wpUrl={site.wpUrl ?? ""} isDemo={isDemo} />;
}
