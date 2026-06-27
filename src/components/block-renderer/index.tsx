import type { Block } from "@/lib/blocks/types";
import { HeroBlock } from "@/blocks/hero";
import { CTABlock } from "@/blocks/cta";
import { FeatureGridBlock } from "@/blocks/feature-grid";
import { TextBlock } from "@/blocks/text-block";
import { ImageBlock } from "@/blocks/image-block";
import { QuoteBlock } from "@/blocks/quote";
import { FAQBlock } from "@/blocks/faq";
import { BlogBodyBlock } from "@/blocks/blog-body";
import { FormEmbedBlock } from "@/blocks/form-embed";

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block) => (
        <BlockSwitch key={block.id} block={block} />
      ))}
    </>
  );
}

function BlockSwitch({ block }: { block: Block }) {
  switch (block.type) {
    case "hero":
      return <HeroBlock props={block.props} />;
    case "cta":
      return <CTABlock props={block.props} />;
    case "feature-grid":
      return <FeatureGridBlock props={block.props} />;
    case "text":
      return <TextBlock props={block.props} />;
    case "image":
      return <ImageBlock props={block.props} />;
    case "quote":
      return <QuoteBlock props={block.props} />;
    case "faq":
      return <FAQBlock props={block.props} />;
    case "blog-body":
      return <BlogBodyBlock props={block.props} />;
    case "form-embed":
      return <FormEmbedBlock props={block.props} />;
    default:
      return null;
  }
}
