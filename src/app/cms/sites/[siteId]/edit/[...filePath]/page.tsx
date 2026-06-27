import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { notFound } from "next/navigation";
import { getFileContent } from "@/lib/github";
import type { Metadata } from "next";
import { AIEditor } from "./ai-editor";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ siteId: string; filePath: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { filePath } = await params;
  const name = filePath.at(-2) ?? filePath.at(-1) ?? "Edit";
  return { title: `${decodeURIComponent(name)} — PromptPublish` };
}

export default async function EditPage({ params, searchParams }: Props) {
  const { siteId, filePath: filePathParts } = await params;
  const sp = await searchParams;
  const filePath = filePathParts.map(decodeURIComponent).join("/");
  const pageRoute = typeof sp.route === "string" ? sp.route : "/";

  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id: siteId });
  if (!site) notFound();

  const { name, githubRepo, githubToken, defaultBranch, stagingBranch, siteUrl } = (site as unknown) as {
    name: string;
    githubRepo: string;
    githubToken: string;
    defaultBranch: string;
    stagingBranch: string;
    siteUrl?: string;
  };

  let initialContent = "";
  let fetchError = "";

  try {
    initialContent = await getFileContent(githubToken, githubRepo, defaultBranch, filePath);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Failed to load file";
  }

  return fetchError ? (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive max-w-md text-center">
        <p className="font-medium mb-1">Could not load file</p>
        <p className="text-xs text-destructive/70">{fetchError}</p>
      </div>
    </div>
  ) : (
    <AIEditor
      siteId={String(siteId)}
      siteName={name}
      filePath={filePath}
      initialContent={initialContent}
      stagingBranch={stagingBranch}
      githubRepo={githubRepo}
      defaultBranch={defaultBranch}
      siteId_num={siteId}
      siteUrl={siteUrl ?? ""}
      pageRoute={pageRoute}
    />
  );
}
