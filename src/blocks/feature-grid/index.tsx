import Image from "next/image";
import { cn } from "@/lib/utils";
import type { FeatureGridProps } from "@/lib/blocks/schemas";

export function FeatureGridBlock({ props }: { props: FeatureGridProps }) {
  const { headline, subheadline, features, columns = "3" } = props;

  const gridCols = {
    "2": "sm:grid-cols-2",
    "3": "sm:grid-cols-2 lg:grid-cols-3",
    "4": "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  return (
    <section className="w-full py-16 md:py-24">
      <div className="container mx-auto px-4">
        {(headline || subheadline) && (
          <div className="text-center mb-12 flex flex-col gap-3 max-w-2xl mx-auto">
            {headline && (
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {headline}
              </h2>
            )}
            {subheadline && <p className="text-lg text-muted-foreground">{subheadline}</p>}
          </div>
        )}
        <div className={cn("grid grid-cols-1 gap-8", gridCols)}>
          {features.map((feature, i) => (
            <div key={i} className="flex flex-col gap-4">
              {feature.image ? (
                <div className="relative h-12 w-12 rounded-lg overflow-hidden">
                  <Image src={feature.image.src} alt={feature.image.alt} fill className="object-cover" />
                </div>
              ) : feature.icon ? (
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                  {feature.icon}
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
