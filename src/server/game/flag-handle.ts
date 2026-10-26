import "server-only";
import { seal, unseal } from "../crypto";

const PURPOSE = "flagforge:flag:v1";
const TTL_MS = 6 * 60 * 60 * 1000;

/**
 * Opaque, single-purpose flag URL. A fresh random IV is used on every call, so the same country produces a
 * different URL each time — a URL cannot be memorised or looked up to learn the answer.
 */
export function flagUrlFor(iso2: string, now = Date.now()): string {
  return `/api/game/flag/${seal({ c: iso2, e: now + TTL_MS }, PURPOSE)}`;
}

export function resolveFlagHandle(handle: string, now = Date.now()): string | null {
  const payload = unseal<{ c?: unknown; e?: unknown }>(handle, PURPOSE);
  if (!payload || typeof payload.c !== "string" || typeof payload.e !== "number") return null;
  if (payload.e < now) return null;
  return payload.c;
}
