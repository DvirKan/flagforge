import { resolveFlagHandle } from "@/server/game/flag-handle";
import flags from "@/server/data/flags.json";

export const runtime = "nodejs";

const flagMap = flags as Record<string, string>;

/**
 * GET /api/game/flag/:handle — serves a sanitized flag SVG for an opaque, encrypted handle.
 * The SVG has had every identifying id/class removed during import, and is served with a restrictive CSP so
 * that even a malicious SVG could not execute script if opened directly.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  if (handle.length > 512) return new Response(null, { status: 404 });
  const iso = resolveFlagHandle(handle);
  const svg = iso ? flagMap[iso] : undefined;
  if (!svg) return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=21600, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
