import { NextRequest, NextResponse } from "next/server";
import { getAllSites, createSite, redact } from "@/lib/sites-store";
import { getRepoInfo, detectFramework } from "@/lib/github";
import { verifyWPSite } from "@/lib/wordpress";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAllSites().map(redact));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name?: string;
      framework?: string;
      githubRepo?: string;
      githubToken?: string;
      defaultBranch?: string;
      stagingBranch?: string;
      vercelProjectId?: string;
      siteUrl?: string;
      wpUrl?: string;
      wpUsername?: string;
      wpAppPassword?: string;
    };

    const { name } = body;
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    // WordPress path
    if (body.framework === "wordpress") {
      const { wpUrl, wpUsername, wpAppPassword } = body;
      if (!wpUrl || !wpUsername || !wpAppPassword) {
        return NextResponse.json(
          { error: "wpUrl, wpUsername, and wpAppPassword are required for WordPress sites" },
          { status: 400 }
        );
      }
      let wpInfo: Awaited<ReturnType<typeof verifyWPSite>>;
      try {
        wpInfo = await verifyWPSite(wpUrl, wpUsername, wpAppPassword);
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 422 });
      }
      const site = createSite({
        name,
        framework: "wordpress",
        wpUrl: wpInfo.url,
        wpUsername,
        wpAppPassword,
        githubRepo: "",
        githubToken: "",
        defaultBranch: "main",
        stagingBranch: "staging",
      });
      return NextResponse.json(redact(site), { status: 201 });
    }

    // GitHub path
    const { githubToken, stagingBranch = "staging", vercelProjectId, siteUrl } = body;
    const githubRepo = (body.githubRepo ?? "")
      .trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");

    if (!githubRepo || !githubToken) {
      return NextResponse.json({ error: "name, githubRepo, and githubToken are required" }, { status: 400 });
    }

    let repoInfo: Awaited<ReturnType<typeof getRepoInfo>>;
    try {
      repoInfo = await getRepoInfo(githubToken, githubRepo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("403")) {
        return NextResponse.json({ error: "GitHub token was rejected. Make sure it has repo scope." }, { status: 422 });
      }
      if (msg.includes("404")) {
        return NextResponse.json({ error: `Repository "${githubRepo}" not found.` }, { status: 422 });
      }
      return NextResponse.json({ error: `GitHub error: ${msg}` }, { status: 422 });
    }

    const defaultBranch = (body.defaultBranch && body.defaultBranch !== "main")
      ? body.defaultBranch
      : repoInfo.defaultBranch;

    let framework = body.framework;
    if (!framework) {
      const detected = await detectFramework(githubToken, githubRepo, defaultBranch);
      framework = detected.startsWith("nextjs") ? "nextjs" : detected === "react" ? "react" : "nextjs";
    }

    const site = createSite({
      name,
      framework: framework as "nextjs" | "react" | "wordpress",
      githubRepo,
      githubToken,
      defaultBranch,
      stagingBranch,
      vercelProjectId,
      siteUrl: siteUrl ?? "",
    });

    return NextResponse.json(redact(site), { status: 201 });
  } catch (err) {
    console.error("[POST /api/cms/sites]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
