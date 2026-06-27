"use client";

import { useEffect, useRef } from "react";
import type { FormEmbedProps } from "@/lib/blocks/schemas";

export function FormEmbedBlock({ props }: { props: FormEmbedProps }) {
  const { formId, provider, embedUrl, headline, subheadline } = props;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (provider === "hubspot" && containerRef.current) {
      const script = document.createElement("script");
      script.src = "//js.hsforms.net/forms/embed/v2.js";
      script.onload = () => {
        if (window.hbspt) {
          window.hbspt.forms.create({
            target: containerRef.current,
            formId,
          });
        }
      };
      document.head.appendChild(script);
    }
  }, [provider, formId]);

  return (
    <section className="w-full py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-2xl">
        {(headline || subheadline) && (
          <div className="text-center mb-10 flex flex-col gap-3">
            {headline && (
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {headline}
              </h2>
            )}
            {subheadline && <p className="text-lg text-muted-foreground">{subheadline}</p>}
          </div>
        )}
        {provider === "typeform" && embedUrl && (
          <iframe
            src={embedUrl}
            width="100%"
            height="500"
            frameBorder="0"
            title="Form"
            className="rounded-xl"
          />
        )}
        {provider === "tally" && embedUrl && (
          <iframe
            src={embedUrl}
            width="100%"
            height="500"
            frameBorder="0"
            title="Form"
            className="rounded-xl"
          />
        )}
        {provider === "custom" && embedUrl && (
          <iframe
            src={embedUrl}
            width="100%"
            height="500"
            frameBorder="0"
            title="Form"
            className="rounded-xl"
          />
        )}
        {provider === "hubspot" && <div ref={containerRef} />}
      </div>
    </section>
  );
}

declare global {
  interface Window {
    hbspt?: {
      forms: { create: (opts: { target: HTMLDivElement | null; formId: string }) => void };
    };
  }
}
