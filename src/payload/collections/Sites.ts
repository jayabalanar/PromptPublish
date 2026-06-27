import type { CollectionConfig } from "payload";

const isWordPress = (_data: unknown, siblingData: Record<string, unknown>) =>
  siblingData?.framework === "wordpress";

const isGitHub = (_data: unknown, siblingData: Record<string, unknown>) =>
  siblingData?.framework !== "wordpress";

export const Sites: CollectionConfig = {
  slug: "sites",
  admin: {
    defaultColumns: ["name", "githubRepo", "framework", "updatedAt"],
  },
  access: {
    read: () => true,
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "framework",
      type: "select",
      options: ["nextjs", "react", "wordpress"],
      defaultValue: "nextjs",
      required: true,
    },
    // GitHub fields
    {
      name: "githubRepo",
      type: "text",
      admin: {
        description: "owner/repo format, e.g. vercel/next.js",
        condition: isGitHub,
      },
    },
    {
      name: "defaultBranch",
      type: "text",
      defaultValue: "main",
      admin: { condition: isGitHub },
    },
    {
      name: "stagingBranch",
      type: "text",
      defaultValue: "staging",
      admin: { condition: isGitHub },
    },
    {
      name: "githubToken",
      type: "text",
      admin: {
        description: "GitHub Personal Access Token with repo scope",
        condition: isGitHub,
      },
    },
    {
      name: "siteUrl",
      type: "text",
      admin: {
        description: "Live site URL (e.g. https://acme.com) — used for in-app preview",
        condition: isGitHub,
      },
    },
    {
      name: "vercelProjectId",
      type: "text",
      admin: {
        description: "Optional — used to generate Vercel preview URLs",
        condition: isGitHub,
      },
    },
    // WordPress fields
    {
      name: "wpUrl",
      type: "text",
      admin: {
        description: "WordPress site URL (e.g. https://mysite.com)",
        condition: isWordPress,
      },
    },
    {
      name: "wpUsername",
      type: "text",
      admin: {
        description: "WordPress username",
        condition: isWordPress,
      },
    },
    {
      name: "wpAppPassword",
      type: "text",
      admin: {
        description: "WordPress Application Password (Users > Profile > Application Passwords)",
        condition: isWordPress,
      },
    },
  ],
};
