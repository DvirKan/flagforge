import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * Authenticated encryption (AES-256-GCM) for opaque client-held tokens.
 * Encryption (not just signing) matters: a signed token is readable by anyone who base64-decodes it, and the
 * game token holds the correct answers.
 *
 * Key: derived with HKDF-SHA256 from GAME_SESSION_SECRET (server-only, ≥ 32 chars). In development a random
 * per-process key is used if the variable is missing; in production its absence is a startup error.
 */
let cachedKey: Buffer | null = null;

function key(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.GAME_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production" && process.env.FLAGFORGE_ALLOW_EPHEMERAL_SECRET !== "1") {
      throw new Error("GAME_SESSION_SECRET must be set (≥ 32 characters) in production");
    }
    console.warn("[flagforge] GAME_SESSION_SECRET missing — using an ephemeral development key");
    cachedKey = randomBytes(32);
    return cachedKey;
  }
  cachedKey = Buffer.from(hkdfSync("sha256", secret, "flagforge", "token-encryption-v1", 32));
  return cachedKey;
}

export function seal(payload: unknown, purpose: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  cipher.setAAD(Buffer.from(purpose));
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, body, cipher.getAuthTag()]).toString("base64url");
}

/** Returns null for any tampered, truncated, foreign-purpose or malformed token. Never throws. */
export function unseal<T>(token: string, purpose: string): T | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 12 + 16 + 2) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const body = raw.subarray(12, raw.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(tag);
    const json = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
