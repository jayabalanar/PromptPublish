import type { CollectionConfig } from "payload";

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    defaultColumns: ["status", "updatedAt"],
  },
  versions: {
    maxPerDoc: 50,
    drafts: true,
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "metadata",
      type: "group",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "slug", type: "text", required: true, unique: true },
        { name: "description", type: "textarea" },
        { name: "canonicalUrl", type: "text" },
        {
          name: "robots",
          type: "select",
          options: ["index,follow", "noindex,follow", "index,nofollow", "noindex,nofollow"],
          defaultValue: "index,follow",
        },
        { name: "ogTitle", type: "text" },
        { name: "ogDescription", type: "textarea" },
        { name: "ogImage", type: "text" },
        {
          name: "twitterCard",
          type: "select",
          options: ["summary", "summary_large_image"],
          defaultValue: "summary_large_image",
        },
        { name: "noIndex", type: "checkbox", defaultValue: false },
      ],
    },
    {
      name: "blocks",
      type: "json",
      required: true,
      defaultValue: [],
      admin: {
        description: "Block JSON managed by the MCP server — do not edit manually.",
      },
    },
    {
      name: "status",
      type: "select",
      options: ["draft", "staged", "published"],
      defaultValue: "draft",
      required: true,
    },
    {
      name: "publishedAt",
      type: "date",
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc }) => {
        // Auto-redirect: if slug changed on a published page, store the old slug for 301
        if (
          originalDoc?.status === "published" &&
          originalDoc?.metadata?.slug &&
          data?.metadata?.slug &&
          originalDoc.metadata.slug !== data.metadata.slug
        ) {
          if (!data._redirectFrom) {
            data._redirectFrom = originalDoc.metadata.slug;
          }
        }
        return data;
      },
    ],
  },
};
