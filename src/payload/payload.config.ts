import { buildConfig } from "payload";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { Pages } from "./collections/Pages";
import { Media } from "./collections/Media";
import { Users } from "./collections/Users";
import { Sites } from "./collections/Sites";
import { AISettings } from "./globals/AISettings";
import path from "path";
import { fileURLToPath } from "url";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Pages, Sites, Media, Users],
  globals: [AISettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? "change-me-in-production",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL ?? `file:${path.resolve(dirname, "../../payload.db")}`,
    },
  }),
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000",
  cors: [process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000"],
});
