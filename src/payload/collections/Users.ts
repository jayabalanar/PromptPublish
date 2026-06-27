import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  fields: [
    {
      name: "role",
      type: "select",
      options: ["marketer", "reviewer", "admin", "developer"],
      defaultValue: "marketer",
      required: true,
    },
    { name: "name", type: "text" },
  ],
};
