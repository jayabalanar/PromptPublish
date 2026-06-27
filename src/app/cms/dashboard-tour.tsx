"use client";
import { TourButton } from "@/components/tour";

const STEPS = [
  {
    target: "sites-heading",
    title: "Your Connected Sites",
    body: "Every GitHub repo or WordPress site you connect appears here. Click any card to browse and edit its pages.",
    side: "bottom" as const,
  },
  {
    target: "site-card",
    title: "Site Card",
    body: "Shows the site name, repo slug, and branches. The icon indicates the framework — Next.js, React, or WordPress.",
    side: "bottom" as const,
  },
  {
    target: "connect-btn",
    title: "Connect a Site",
    body: "Click here to add a GitHub repository (with staging/production branches) or a WordPress site via Application Password.",
    side: "bottom" as const,
  },
];

export function DashboardTourButton() {
  return <TourButton steps={STEPS} />;
}
