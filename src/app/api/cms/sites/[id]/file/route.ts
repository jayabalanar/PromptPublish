import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { getFileContent } from "@/lib/github";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const filePath = req.nextUrl.searchParams.get("path");
  const branch = req.nextUrl.searchParams.get("branch");

  if (!filePath) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const payload = await getPayload({ config });
  const site = await payload.findByID({ collection: "sites", id });
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

  const { githubRepo, githubToken, defaultBranch } = (site as unknown) as {
    githubRepo: string;
    githubToken: string;
    defaultBranch: string;
  };

  const content = await getFileContent(
    githubToken,
    githubRepo,
    branch ?? defaultBranch,
    filePath
  );

  return NextResponse.json({ content, path: filePath });
}
