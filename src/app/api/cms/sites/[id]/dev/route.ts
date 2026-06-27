import { NextRequest, NextResponse } from "next/server";
import { getSiteById } from "@/lib/sites-store";
import { launchSite, stopSite, getState } from "@/lib/site-runner";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return NextResponse.json(getState(id));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json() as { action: "start" | "stop" };

    if (body.action === "stop") {
      stopSite(id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "start") {
      const state = getState(id);
      if (state.status === "running" || state.status === "starting" || state.status === "cloning" || state.status === "installing") {
        return NextResponse.json({ ok: true, message: "Already in progress" });
      }

      const site = getSiteById(id);
      if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

      launchSite(id, site.githubRepo ?? "", site.githubToken ?? "", site.defaultBranch ?? "main");
      return NextResponse.json({ ok: true, status: "cloning" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("[/api/cms/sites/[id]/dev]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
