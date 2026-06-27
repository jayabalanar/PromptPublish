import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string[] }> };

export async function generateMetadata(_props: Props): Promise<Metadata> {
  return {};
}

export default async function SitePage(_props: Props) {
  notFound();
}
