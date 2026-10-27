import { z } from "zod";

/**
 * Shared validation for auth and account forms. Error messages are i18n keys (resolved in the UI), so the
 * same schemas validate on the server and produce translated messages.
 */
export const emailSchema = z.string().trim().toLowerCase().max(254, "authErrors.invalidEmail").email("authErrors.invalidEmail");
export const passwordSchema = z.string().min(8, "authErrors.passwordTooShort").max(72, "authErrors.passwordTooLong");
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "authErrors.usernameInvalid")
  .refine((v) => !RESERVED_USERNAMES.has(v), "authErrors.usernameTaken");

// Mirrors public.is_valid_username() in the database.
export const RESERVED_USERNAMES = new Set(["admin", "administrator", "root", "system", "support", "flagforge", "moderator", "null", "undefined"]);

export const registerSchema = z.object({ username: usernameSchema, email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "authErrors.invalidCredentials").max(72, "authErrors.invalidCredentials") });
export const forgotSchema = z.object({ email: emailSchema });
export const resetSchema = z.object({ password: passwordSchema });
export const profileSettingsSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().max(40, "authErrors.generic").transform((v) => (v === "" ? null : v)),
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
export function safeNextPath(next: unknown, fallback = "/profile"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return fallback;
  return next;
}
