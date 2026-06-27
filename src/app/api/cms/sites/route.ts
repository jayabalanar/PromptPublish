import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@/payload/payload.config";
import { getRepoInfo, detectFramework } from "@/lib/github";
import { verifyWPSite } from "@/lib/wordpress";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getPayload({ config });
    const result = await payload.find({ collection: "sites", limit: 100 });
    const docs = result.docs.map((s) => ({
      ...s,
      githubToken: s.githubToken ? "***" : undefined,
      wpAppPassword: (s as unknown as { wpAppPassword?: string }).wpAppPassword ? "***" : undefined,
    }));
    return NextResponse.json(docs);
  } catch (err) {
    console.error("[GET /api/cms/sites]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      name?: string;
      framework?: string;
      // GitHub fields
      githubRepo?: string;
      githubToken?: string;
      defaultBranch?: string;
      stagingBranch?: string;
      vercelProjectId?: string;
      siteUrl?: string;
      // WordPress fields
      wpUrl?: string;
      wpUsername?: string;
      wpAppPassword?: string;
    };

    const { name } = body;
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // --- WordPress path ---
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
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 422 });
      }

      const payload = await getPayload({ config });
      const site = await payload.create({
        collection: "sites",
        data: {
          name,
          framework: "wordpress",
          wpUrl: wpInfo.url,
          wpUsername,
          wpAppPassword,
          // GitHub fields left empty for WP sites
          githubRepo: "",
          githubToken: "",
          defaultBranch: "main",
          stagingBranch: "staging",
        },
      });

      return NextResponse.json(
        { ...(site as unknown as Record<string, unknown>), wpAppPassword: "***" },
        { status: 201 }
      );
    }

    // --- GitHub path ---
    const { githubToken, stagingBranch = "staging", vercelProjectId, siteUrl } = body;
    const githubRepo = (body.githubRepo ?? "")
      .trim()
      .replace(/^https?:\/\/(www\.)?github\.com\//, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");

    if (!githubRepo || !githubToken) {
      return NextResponse.json(
        { error: "name, githubRepo, and githubToken are required" },
        { status: 400 }
      );
    }

    let repoInfo: Awaited<ReturnType<typeof getRepoInfo>>;
    try {
      repoInfo = await getRepoInfo(githubToken, githubRepo);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("403")) {
        return NextResponse.json(
          { error: "GitHub token was rejected. Make sure it has the 'repo' (or 'Contents: read') scope and hasn't expired." },
          { status: 422 }
        );
      }
      if (msg.includes("404")) {
        return NextResponse.json(
          { error: `Repository "${githubRepo}" not found. Double-check the owner/repo spelling and that the token has access to this repo.` },
          { status: 422 }
        );
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

    const payload = await getPayload({ config });
    const site = await payload.create({
      collection: "sites",
      data: {
        name,
        githubRepo,
        githubToken,
        defaultBranch,
        stagingBranch,
        framework: framework as "nextjs" | "react" | "wordpress",
        vercelProjectId,
        siteUrl: siteUrl ?? "",
      },
    });

    return NextResponse.json({ ...site, githubToken: "***" }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/cms/sites]", err);
    const msg = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
