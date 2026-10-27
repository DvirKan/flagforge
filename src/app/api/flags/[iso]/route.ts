import flags from "@/server/data/flags.json";

export const runtime = "nodejs";

const flagMap = flags as Record<string, string>;

/**
 * GET /api/flags/:iso — public flag artwork by ISO code, for places where the country is already known
 * (home illustration, results, profile, map). Quiz questions never use this route; they use opaque handles.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ iso: string }> }) {
  const { iso } = await params;
  const code = iso.toUpperCase();
  const svg = /^[A-Z]{2}$/.test(code) ? flagMap[code] : undefined;
  if (!svg) return new Response(null, { status: 404 });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
