import { z } from "zod";
import {
  HeroBlockSchema,
  CTABlockSchema,
  FeatureGridBlockSchema,
  TextBlockSchema,
  ImageBlockSchema,
  QuoteBlockSchema,
  FAQBlockSchema,
  BlogBodyBlockSchema,
  FormEmbedBlockSchema,
} from "./schemas";

export const BlockSchema = z.discriminatedUnion("type", [
  HeroBlockSchema,
  CTABlockSchema,
  FeatureGridBlockSchema,
  TextBlockSchema,
  ImageBlockSchema,
  QuoteBlockSchema,
  FAQBlockSchema,
  BlogBodyBlockSchema,
  FormEmbedBlockSchema,
]);

export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block["type"];

export const BLOCK_TYPES = [
  "hero",
  "cta",
  "feature-grid",
  "text",
  "image",
  "quote",
  "faq",
  "blog-body",
  "form-embed",
] as const satisfies BlockType[];

export const PageMetadataSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  canonicalUrl: z.string().optional(),
  robots: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  twitterCard: z.enum(["summary", "summary_large_image"]).optional(),
  noIndex: z.boolean().optional(),
});

export type PageMetadata = z.infer<typeof PageMetadataSchema>;

export const PageSchema = z.object({
  id: z.string(),
  metadata: PageMetadataSchema,
  blocks: z.array(BlockSchema),
  status: z.enum(["draft", "staged", "published"]),
  publishedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Page = z.infer<typeof PageSchema>;
