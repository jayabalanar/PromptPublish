import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ImageBlockProps } from "@/lib/blocks/schemas";

export function ImageBlock({ props }: { props: ImageBlockProps }) {
  const { image, caption, width = "contained", aspectRatio = "auto" } = props;

  const aspectClass = {
    auto: "",
    "16/9": "aspect-video",
    "4/3": "aspect-[4/3]",
    "1/1": "aspect-square",
    "3/2": "aspect-[3/2]",
  }[aspectRatio];

  return (
    <section className="w-full py-8 md:py-12">
      <div className={cn("mx-auto px-4", width === "contained" ? "container max-w-4xl" : "")}>
        <figure className="flex flex-col gap-3">
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-xl",
              aspectRatio === "auto" ? "aspect-video" : aspectClass
            )}
          >
            <Image src={image.src} alt={image.alt} fill className="object-cover" />
          </div>
          {caption && (
            <figcaption className="text-sm text-muted-foreground text-center">{caption}</figcaption>
          )}
        </figure>
      </div>
    </section>
  );
}
