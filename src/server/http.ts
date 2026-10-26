import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { clientKey, rateLimit } from "./rate-limit";

export type ApiErrorCode = "invalid_request" | "payload_too_large" | "rate_limited" | "session_invalid" | "session_expired" | "conflict" | "internal";

export function apiError(code: ApiErrorCode, status: number, extraHeaders?: Record<string, string>) {
  return NextResponse.json({ error: code }, { status, headers: { "Cache-Control": "no-store", ...extraHeaders } });
}

export function apiOk<T>(body: T) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

const MAX_BODY_BYTES = 8 * 1024;

/**
 * Reads, size-limits and validates a JSON body. Returns either parsed data or a ready error response.
 */
export async function parseJson<S extends z.ZodType>(req: Request, schema: S): Promise<{ data: z.infer<S> } | { error: NextResponse }> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return { error: apiError("payload_too_large", 413) };
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { error: apiError("invalid_request", 400) };
  }
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return { error: apiError("payload_too_large", 413) };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { error: apiError("invalid_request", 400) };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) return { error: apiError("invalid_request", 400) };
  return { data: parsed.data };
}

export function limitOrError(req: Request, bucket: string, limit: number, windowMs: number): NextResponse | null {
  const result = rateLimit(`${bucket}:${clientKey(req.headers)}`, limit, windowMs);
  return result.ok ? null : apiError("rate_limited", 429, { "Retry-After": String(result.retryAfterSec) });
}
