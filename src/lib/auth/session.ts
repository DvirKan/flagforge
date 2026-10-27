import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { isAdminClientConfigured, createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n/config";

export interface Viewer {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  preferredLanguage: Locale;
  createdAt: string;
}

/**
 * The signed-in user for this request, or null. Identity comes from a verified JWT (getClaims verifies the
 * signature); the profile row is read through RLS, so only the user's own row is visible.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, preferred_language, created_at")
    .eq("id", sub)
    .maybeSingle();
  if (!profile) return null;
  return {
    id: sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    username: profile.username,
    displayName: profile.display_name,
    preferredLanguage: profile.preferred_language === "he" ? "he" : "en",
    createdAt: profile.created_at,
  };
});

/**
 * Authoritative identity for mutations: asks the Auth server (getUser), so a revoked or deleted user cannot
 * act with a still-unexpired token.
 */
export async function getVerifiedUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function requireViewer(nextPath: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return viewer;
}

/** Admin gate: database-backed role check. Non-admins get a 404 (the area's existence is not revealed). */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer("/admin");
  if (!isAdminClientConfigured()) notFound();
  const { data, error } = await createSupabaseAdminClient().rpc("is_admin", { p_user_id: viewer.id });
  if (error || data !== true) notFound();
  return viewer;
}
