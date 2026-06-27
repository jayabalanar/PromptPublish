import Image from "next/image";
import { cn } from "@/lib/utils";
import type { QuoteProps } from "@/lib/blocks/schemas";

export function QuoteBlock({ props }: { props: QuoteProps }) {
  const { quote, author, authorTitle, avatar, variant = "default" } = props;

  if (variant === "large") {
    return (
      <section className="w-full py-16 md:py-24 bg-accent">
        <div className="container mx-auto px-4 max-w-3xl text-center flex flex-col gap-6">
          <blockquote className="text-2xl md:text-3xl font-semibold text-foreground leading-relaxed">
            &ldquo;{quote}&rdquo;
          </blockquote>
          {(author || avatar) && <Attribution author={author} authorTitle={authorTitle} avatar={avatar} centered />}
        </div>
      </section>
    );
  }

  if (variant === "inline") {
    return (
      <div className="my-8 pl-6 border-l-4 border-primary">
        <blockquote className="text-lg text-muted-foreground italic">&ldquo;{quote}&rdquo;</blockquote>
        {author && (
          <p className="mt-2 text-sm font-medium text-foreground">
            — {author}
            {authorTitle && <span className="text-muted-foreground font-normal">, {authorTitle}</span>}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="w-full py-12 md:py-16">
      <div className="container mx-auto px-4 max-w-2xl flex flex-col gap-4">
        <blockquote className="text-xl font-medium text-foreground leading-relaxed">
          &ldquo;{quote}&rdquo;
        </blockquote>
        {(author || avatar) && <Attribution author={author} authorTitle={authorTitle} avatar={avatar} />}
      </div>
    </section>
  );
}

function Attribution({
  author,
  authorTitle,
  avatar,
  centered,
}: {
  author?: string;
  authorTitle?: string;
  avatar?: { src: string; alt: string };
  centered?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", centered && "justify-center")}>
      {avatar && (
        <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
          <Image src={avatar.src} alt={avatar.alt} fill className="object-cover" />
        </div>
      )}
      {author && (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{author}</span>
          {authorTitle && <span className="text-sm text-muted-foreground">{authorTitle}</span>}
        </div>
      )}
    </div>
  );
}
