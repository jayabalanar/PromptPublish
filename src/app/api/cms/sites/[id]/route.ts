import { NextRequest, NextResponse } from "next/server";
import { getSiteById, updateSite, deleteSite, redact } from "@/lib/sites-store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const site = getSiteById(id);
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  return NextResponse.json(redact(site));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      siteUrl?: string;
      stagingBranch?: string;
      defaultBranch?: string;
    };
    const updated = updateSite(id, body);
    if (!updated) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    return NextResponse.json(redact(updated));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteSite(id);
  if (!ok) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
