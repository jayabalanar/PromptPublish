"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FAQProps } from "@/lib/blocks/schemas";

export function FAQBlock({ props }: { props: FAQProps }) {
  const { headline, items } = props;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="w-full py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        {headline && (
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-10 text-center">
            {headline}
          </h2>
        )}
        <div className="divide-y divide-border">
          {items.map((item, i) => (
            <div key={i} className="py-5">
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                aria-expanded={openIndex === i}
              >
                <span className="text-base font-medium text-foreground">{item.question}</span>
                <span
                  className={cn(
                    "flex-shrink-0 h-5 w-5 rounded-full border border-border flex items-center justify-center transition-transform",
                    openIndex === i && "rotate-45"
                  )}
                  aria-hidden
                >
                  +
                </span>
              </button>
              {openIndex === i && (
                <p className="mt-4 text-muted-foreground leading-relaxed">{item.answer}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
