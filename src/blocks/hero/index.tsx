import Image from "next/image";
import { cn } from "@/lib/utils";
import type { HeroProps } from "@/lib/blocks/schemas";

export function HeroBlock({ props }: { props: HeroProps }) {
  const { headline, subheadline, primaryCta, secondaryCta, image, variant = "centered" } = props;

  if (variant === "split") {
    return (
      <section className="w-full py-16 md:py-24">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
              {headline}
            </h1>
            {subheadline && (
              <p className="text-lg md:text-xl text-muted-foreground">{subheadline}</p>
            )}
            {(primaryCta || secondaryCta) && (
              <div className="flex flex-wrap gap-4 mt-2">
                {primaryCta && <CtaButton {...primaryCta} />}
                {secondaryCta && <CtaButton {...secondaryCta} />}
              </div>
            )}
          </div>
          {image && (
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
              <Image src={image.src} alt={image.alt} fill className="object-cover" />
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-16 md:py-24 lg:py-32">
      <div className="container mx-auto px-4 flex flex-col items-center text-center gap-8">
        <div className="flex flex-col gap-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
            {headline}
          </h1>
          {subheadline && (
            <p className="text-lg md:text-xl text-muted-foreground">{subheadline}</p>
          )}
        </div>
        {(primaryCta || secondaryCta) && (
          <div className="flex flex-wrap justify-center gap-4">
            {primaryCta && <CtaButton {...primaryCta} />}
            {secondaryCta && <CtaButton {...secondaryCta} />}
          </div>
        )}
        {image && (
          <div className="relative w-full max-w-4xl aspect-[16/9] rounded-xl overflow-hidden mt-4">
            <Image src={image.src} alt={image.alt} fill className="object-cover" />
          </div>
        )}
      </div>
    </section>
  );
}

function CtaButton({
  label,
  href,
  variant = "primary",
}: {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "secondary" &&
          "border border-border bg-background text-foreground hover:bg-accent",
        variant === "ghost" && "text-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {label}
    </a>
  );
}
