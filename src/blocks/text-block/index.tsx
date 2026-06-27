import { cn } from "@/lib/utils";
import type { TextBlockProps } from "@/lib/blocks/schemas";

export function TextBlock({ props }: { props: TextBlockProps }) {
  const { content, width = "prose" } = props;

  return (
    <section className="w-full py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div
          className={cn(
            "mx-auto prose prose-neutral dark:prose-invert",
            width === "prose" && "max-w-prose",
            width === "wide" && "max-w-4xl",
            width === "full" && "max-w-none"
          )}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </section>
  );
}
