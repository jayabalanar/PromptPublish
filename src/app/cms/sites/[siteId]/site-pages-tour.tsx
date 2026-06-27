"use client";
import { TourButton } from "@/components/tour";

const STEPS = [
  {
    target: "site-pages-header",
    title: "Site Pages",
    body: "This shows every Next.js page detected in your GitHub repository. The app reads your file tree and identifies routes from the App Router or Pages Router structure.",
    side: "bottom" as const,
  },
  {
    target: "site-framework-badge",
    title: "Framework",
    body: "The detected framework for this repo (e.g. nextjs-app, nextjs-pages, react). This determines how pages are found and how the AI edits files.",
    side: "bottom" as const,
  },
  {
    target: "site-pages-list",
    title: "Page List",
    body: "Each row shows the URL route, the component label, and the source file path. Click any row to open the AI editor for that file.",
    side: "top" as const,
  },
];

export function SitePagesTourButton() {
  return <TourButton steps={STEPS} />;
}
