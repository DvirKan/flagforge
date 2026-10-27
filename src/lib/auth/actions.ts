"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { createSupabaseAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors, forgotSchema, loginSchema, registerSchema, resetSchema, safeNextPath } from "@/lib/validation/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { authErrorKey } from "./errors";
import type { FormState } from "./form-state";

const fail = (message: MessageKey, values?: Record<string, string>): FormState => ({ status: "error", message, values });
const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

async function limited(bucket: string, limit: number): Promise<boolean> {
  const h = await headers();
  return !rateLimit(`${bucket}:${clientKey(h)}`, limit, 10 * 60_000).ok;
}

async function syncLocaleCookie(locale: string | null | undefined) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

// ── register ────────────────────────────────────────────────────────────────
export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { username: str(fd, "username"), email: str(fd, "email") };
  const parsed = registerSchema.safeParse({ ...values, password: str(fd, "password") });
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) as FormState["fields"], values };
  if (await limited("register", 10)) return fail("authErrors.rateLimited", values);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("auth.notConfigured", values);

  const { data: available, error: availabilityError } = await supabase.rpc("username_available", { p_username: parsed.data.username });
  if (availabilityError) return fail("authErrors.generic", values);
  if (!available) return { status: "error", fields: { username: "authErrors.usernameTaken" }, values };

  const locale = await getLocale();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent("/profile?welcome=1")}`,
      data: { username: parsed.data.username, preferred_language: locale },
    },
  });
  // An already-registered email does not produce an error (Supabase returns an obfuscated user), so the
  // response never reveals whether an address has an account.
  if (error && error.code !== "user_already_exists") return fail(authErrorKey(error), values);
  return { status: "success", values: { email: parsed.data.email } };
}

// ── login ───────────────────────────────────────────────────────────────────
export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const parsed = loginSchema.safeParse({ email: values.email, password: str(fd, "password") });
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) as FormState["fields"], values };
  if (await limited("login", 20)) return fail("authErrors.rateLimited", values);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("auth.notConfigured", values);
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return fail(authErrorKey(error), values);

  const { data: profile } = await supabase.from("profiles").select("preferred_language").eq("id", data.user.id).maybeSingle();
  await syncLocaleCookie(profile?.preferred_language);
  redirect(safeNextPath(str(fd, "next")));
}

export async function resendConfirmationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: str(fd, "email") });
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) as FormState["fields"] };
  if (await limited("resend", 5)) return fail("authErrors.rateLimited");
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("auth.notConfigured");
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent("/profile?welcome=1")}` },
  });
  if (error && authErrorKey(error) === "authErrors.rateLimited") return fail("authErrors.rateLimited");
  return { status: "success", message: "auth.resent" };
}

// ── logout ──────────────────────────────────────────────────────────────────
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}

// ── password recovery ───────────────────────────────────────────────────────
export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const values = { email: str(fd, "email") };
  const parsed = forgotSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) as FormState["fields"], values };
  if (await limited("forgot", 5)) return fail("authErrors.rateLimited", values);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("auth.notConfigured", values);
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/confirm?next=${encodeURIComponent("/reset-password")}`,
  });
  // Same response whether or not the address exists; only rate limiting is surfaced.
  if (error && authErrorKey(error) === "authErrors.rateLimited") return fail("authErrors.rateLimited", values);
  return { status: "success", values: { email: parsed.data.email } };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({ password: str(fd, "password") });
  if (!parsed.success) return { status: "error", fields: fieldErrors(parsed.error) as FormState["fields"] };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("auth.notConfigured");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return fail("authErrors.sessionMissing");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(authErrorKey(error));
  redirect("/profile?password=updated");
}

// ── account deletion ────────────────────────────────────────────────────────
export async function deleteAccountAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return fail("auth.notConfigured");
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect("/login?next=/settings");
  if (!isAdminClientConfigured()) return fail("settings.deleteUnavailable");
  const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
  if (!profile || str(fd, "confirm").trim().toLowerCase() !== profile.username) {
    return { status: "error", fields: { confirm: "authErrors.confirmMismatch" } };
  }
  // Deleting the auth user cascades to profiles and all game data (ON DELETE CASCADE).
  const { error } = await createSupabaseAdminClient().auth.admin.deleteUser(user.id);
  if (error) return fail("authErrors.generic");
  await supabase.auth.signOut({ scope: "local" });
  redirect("/?account=deleted");
}
