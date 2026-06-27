import { cn } from "@/lib/utils";
import type { CTAProps } from "@/lib/blocks/schemas";

export function CTABlock({ props }: { props: CTAProps }) {
  const { headline, body, primaryCta, secondaryCta, variant = "default" } = props;

  return (
    <section
      className={cn(
        "w-full py-16 md:py-24",
        variant === "dark" && "bg-foreground text-background",
        variant === "brand" && "bg-primary text-primary-foreground",
        variant === "default" && "bg-accent"
      )}
    >
      <div className="container mx-auto px-4 flex flex-col items-center text-center gap-6 max-w-3xl">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{headline}</h2>
        {body && <p className="text-lg opacity-80">{body}</p>}
        <div className="flex flex-wrap justify-center gap-4 mt-2">
          <a
            href={primaryCta.href}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
              variant === "dark" && "bg-background text-foreground hover:bg-background/90",
              variant === "brand" && "bg-background text-primary hover:bg-background/90"
            )}
          >
            {primaryCta.label}
          </a>
          {secondaryCta && (
            <a
              href={secondaryCta.href}
              className={cn(
                "inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                variant === "default" && "border-border text-foreground hover:bg-background",
                variant === "dark" && "border-background/20 text-background hover:bg-background/10",
                variant === "brand" &&
                  "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
              )}
            >
              {secondaryCta.label}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
