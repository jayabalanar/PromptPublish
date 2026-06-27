import { z } from "zod";

const ImageSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});

const CtaLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  variant: z.enum(["primary", "secondary", "ghost"]).default("primary"),
});

// ── Hero ────────────────────────────────────────────────────────────────────

export const HeroPropsSchema = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  primaryCta: CtaLinkSchema.optional(),
  secondaryCta: CtaLinkSchema.optional(),
  image: ImageSchema.optional(),
  variant: z.enum(["centered", "split"]).default("centered"),
});

export const HeroBlockSchema = z.object({
  id: z.string(),
  type: z.literal("hero"),
  props: HeroPropsSchema,
});

export type HeroProps = z.infer<typeof HeroPropsSchema>;

// ── CTA ─────────────────────────────────────────────────────────────────────

export const CTAPropsSchema = z.object({
  headline: z.string(),
  body: z.string().optional(),
  primaryCta: CtaLinkSchema,
  secondaryCta: CtaLinkSchema.optional(),
  variant: z.enum(["default", "dark", "brand"]).default("default"),
});

export const CTABlockSchema = z.object({
  id: z.string(),
  type: z.literal("cta"),
  props: CTAPropsSchema,
});

export type CTAProps = z.infer<typeof CTAPropsSchema>;

// ── Feature Grid ─────────────────────────────────────────────────────────────

const FeatureItemSchema = z.object({
  icon: z.string().optional(),
  image: ImageSchema.optional(),
  title: z.string(),
  description: z.string(),
});

export const FeatureGridPropsSchema = z.object({
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  features: z.array(FeatureItemSchema).min(1).max(12),
  columns: z.enum(["2", "3", "4"]).default("3"),
});

export const FeatureGridBlockSchema = z.object({
  id: z.string(),
  type: z.literal("feature-grid"),
  props: FeatureGridPropsSchema,
});

export type FeatureGridProps = z.infer<typeof FeatureGridPropsSchema>;

// ── Text Block ───────────────────────────────────────────────────────────────

export const TextBlockPropsSchema = z.object({
  content: z.string(),
  width: z.enum(["prose", "wide", "full"]).default("prose"),
});

export const TextBlockSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  props: TextBlockPropsSchema,
});

export type TextBlockProps = z.infer<typeof TextBlockPropsSchema>;

// ── Image Block ──────────────────────────────────────────────────────────────

export const ImageBlockPropsSchema = z.object({
  image: ImageSchema,
  caption: z.string().optional(),
  width: z.enum(["contained", "full"]).default("contained"),
  aspectRatio: z.enum(["auto", "16/9", "4/3", "1/1", "3/2"]).default("auto"),
});

export const ImageBlockSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  props: ImageBlockPropsSchema,
});

export type ImageBlockProps = z.infer<typeof ImageBlockPropsSchema>;

// ── Quote ────────────────────────────────────────────────────────────────────

export const QuotePropsSchema = z.object({
  quote: z.string(),
  author: z.string().optional(),
  authorTitle: z.string().optional(),
  avatar: ImageSchema.optional(),
  variant: z.enum(["default", "large", "inline"]).default("default"),
});

export const QuoteBlockSchema = z.object({
  id: z.string(),
  type: z.literal("quote"),
  props: QuotePropsSchema,
});

export type QuoteProps = z.infer<typeof QuotePropsSchema>;

// ── FAQ ──────────────────────────────────────────────────────────────────────

const FAQItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const FAQPropsSchema = z.object({
  headline: z.string().optional(),
  items: z.array(FAQItemSchema).min(1),
});

export const FAQBlockSchema = z.object({
  id: z.string(),
  type: z.literal("faq"),
  props: FAQPropsSchema,
});

export type FAQProps = z.infer<typeof FAQPropsSchema>;

// ── Blog Body ────────────────────────────────────────────────────────────────

export const BlogBodyPropsSchema = z.object({
  content: z.string(),
  showTableOfContents: z.boolean().default(false),
});

export const BlogBodyBlockSchema = z.object({
  id: z.string(),
  type: z.literal("blog-body"),
  props: BlogBodyPropsSchema,
});

export type BlogBodyProps = z.infer<typeof BlogBodyPropsSchema>;

// ── Form Embed ───────────────────────────────────────────────────────────────

export const FormEmbedPropsSchema = z.object({
  formId: z.string(),
  provider: z.enum(["hubspot", "typeform", "tally", "custom"]),
  embedUrl: z.string().optional(),
  headline: z.string().optional(),
  subheadline: z.string().optional(),
});

export const FormEmbedBlockSchema = z.object({
  id: z.string(),
  type: z.literal("form-embed"),
  props: FormEmbedPropsSchema,
});

export type FormEmbedProps = z.infer<typeof FormEmbedPropsSchema>;
