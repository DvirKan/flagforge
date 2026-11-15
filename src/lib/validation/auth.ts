import { z } from "zod";

/**
 * Shared validation for auth and account forms. Error messages are i18n keys (resolved in the UI), so the
 * same schemas validate on the server and produce translated messages.
 */
export const emailSchema = z.string().trim().toLowerCase().max(254, "authErrors.invalidEmail").email("authErrors.invalidEmail");
export const passwordSchema = z.string().min(8, "authErrors.passwordTooShort").max(72, "authErrors.passwordTooLong");
// English letters (any case), Hebrew letters (א–ת incl. final forms), digits, underscore. Mirrors public.is_valid_username().
export const USERNAME_PATTERN = /^[A-Za-z0-9_\u05D0-\u05EA]{3,20}$/;
export const usernameSchema = z
  .string()
  .trim()
  .regex(USERNAME_PATTERN, "authErrors.usernameInvalid")
  .refine((v) => !RESERVED_USERNAMES.has(v.toLowerCase()), "authErrors.usernameTaken");

// Mirrors public.is_valid_username() in the database.
export const RESERVED_USERNAMES = new Set(["admin", "administrator", "root", "system", "support", "flagforge", "moderator", "null", "undefined"]);

export const registerSchema = z.object({ username: usernameSchema, email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "authErrors.invalidCredentials").max(72, "authErrors.invalidCredentials") });
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ password: passwordSchema });
export const profileSettingsSchema = z.object({
  username: usernameSchema,
  // Invisible direction/zero-width characters are stripped: they can make a name in the Hall of Fame display
  // misleadingly (e.g. reversed text). React already escapes everything, so this is about spoofing, not XSS.
  displayName: z
    .string()
    .transform((v) => v.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "").trim())
    .pipe(z.string().max(40, "authErrors.generic"))
    .transform((v) => (v === "" ? null : v)),
});

/** Field → first error key, for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!out[field]) out[field] = issue.message;
  }
  return out;
}

/** Only same-origin relative paths are allowed as post-login redirects (prevents open redirects). */
/**
 * Same-site path to continue to after sign-in / an email link, or the fallback. Blocks open redirects:
 * protocol-relative and backslash forms, and any control character or whitespace — browsers silently drop
 * tabs/newlines while parsing URLs, so "/\t/evil.com" would otherwise become "//evil.com". As a final check the
 * path is resolved against a dummy origin and must stay on it.
 */
export function safeNextPath(next: unknown, fallback = "/profile"): string {
  if (typeof next !== "string" || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\u0000-\u0020\u007f]/.test(next)) return fallback;
  try {
    const base = "https://same-origin.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
