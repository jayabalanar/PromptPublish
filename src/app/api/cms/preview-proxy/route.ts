import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Simple SSRF guard — block private / loopback ranges
function isPrivateURL(url: URL): boolean {
  const host = url.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    /^10\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^192\.168\./.test(host)
  );
}

export async function GET(req: NextRequest) {
  const rawUrl = new URL(req.url).searchParams.get("url");
  if (!rawUrl) return NextResponse.json({ error: "Missing url param" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(rawUrl);
    if (!["http:", "https:"].includes(target.protocol)) throw new Error("bad scheme");
    if (isPrivateURL(target)) throw new Error("private address");
  } catch {
    return NextResponse.json({ error: "Invalid or disallowed URL" }, { status: 400 });
  }

  try {
    const upstream = await fetch(target.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 PromptPublish/preview-proxy",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") ?? "text/html";

    if (!contentType.includes("text/html")) {
      return new NextResponse(upstream.body, {
        status: upstream.status,
        headers: { "Content-Type": contentType },
      });
    }

    let html = await upstream.text();

    // Inject <base> so relative paths resolve against the original origin
    const baseOrigin = `${target.protocol}//${target.host}`;
    const baseTag = `<base href="${target.toString()}">`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head[^>]*>/i, (m) => `${m}${baseTag}`);
    } else {
      html = baseTag + html;
    }

    // Inject a banner at the top so the user knows this is a preview
    const banner = `
<style>
  #pp-preview-banner {
    position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;
    background: oklch(0.55 0.2 264); color: #fff;
    padding: 6px 12px; font: 600 11px/1 system-ui, sans-serif;
    display: flex; align-items: center; justify-content: space-between;
    pointer-events: none;
  }
</style>
<div id="pp-preview-banner">
  <span>PromptPublish Preview</span>
  <span style="font-weight:400;opacity:.7">${target.toString()}</span>
</div>`;

    html = html.replace(/<body[^>]*>/i, (m) => `${m}${banner}`);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Allow embedding in our own iframe
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
        // Don't let this proxy get cached as the real page
        "Cache-Control": "no-store",
        // Pass through cookies from origin would require more work — skip for preview
        "X-Proxy-For": baseOrigin,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: `Preview proxy error: ${msg}` }, { status: 502 });
  }
}
