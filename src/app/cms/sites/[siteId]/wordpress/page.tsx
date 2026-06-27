import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { WPContentList } from "./wp-content-list";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ siteId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId } = await params;
  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id: siteId });
  if (!site) return {};
  return { title: `${((site as unknown) as { name: string }).name} — WordPress — PromptPublish` };
}

export default async function WordPressPage({ params }: Props) {
  const { siteId } = await params;
  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id: siteId });
  if (!site) notFound();

  const s = (site as unknown) as {
    id: string | number;
    name: string;
    framework: string;
    wpUrl?: string;
  };

  if (s.framework !== "wordpress") notFound();

  return <WPContentList siteId={String(s.id)} siteName={s.name} wpUrl={s.wpUrl ?? ""} />;
}
