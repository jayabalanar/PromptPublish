import { notFound } from "next/navigation";
import { getPayload } from "payload";
import config from "@/payload/payload.config";
import type { Metadata } from "next";
import { BlockRenderer } from "@/components/block-renderer";
import { BlockSchema, type Block } from "@/lib/blocks/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string[] }> };

async function getPage(slug: string) {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "pages",
    where: {
      "metadata.slug": { equals: slug },
      status: { equals: "published" },
    },
    limit: 1,
  });
  return result.docs[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const slugStr = slug.join("/");
  const page = await getPage(slugStr);
  if (!page) return {};
  const m = page.metadata as Record<string, string | boolean | undefined>;
  return {
    title: m.title as string,
    description: m.description as string | undefined,
    robots: m.noIndex ? "noindex" : (m.robots as string | undefined),
    openGraph: {
      title: (m.ogTitle as string | undefined) ?? (m.title as string),
      description: (m.ogDescription as string | undefined) ?? (m.description as string | undefined),
      images: m.ogImage ? [{ url: m.ogImage as string }] : undefined,
    },
    alternates: { canonical: m.canonicalUrl as string | undefined },
  };
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params;
  const slugStr = slug.join("/");
  const page = await getPage(slugStr);
  if (!page) notFound();

  const rawBlocks = page.blocks as unknown[];
  const blocks: Block[] = (rawBlocks ?? [])
    .map((b) => BlockSchema.safeParse(b))
    .filter((r): r is { success: true; data: Block } => r.success)
    .map((r) => r.data);

  return <BlockRenderer blocks={blocks} />;
}
