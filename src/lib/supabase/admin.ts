import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "./env";

/**
 * Privileged client (secret / service_role key) — bypasses RLS. Server-only: this module imports
 * "server-only", so bundling it into client code fails the build. Use it only for operations that the
 * database restricts to service_role (authoritative game writes, account deletion, admin tooling).
 */
let cached: SupabaseClient | null = null;

export function createSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;
  const env = supabasePublicEnv();
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !secret) throw new Error("Supabase admin client is not configured (SUPABASE_SECRET_KEY missing)");
  if (process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("A Supabase secret key must never be exposed through a NEXT_PUBLIC_ variable");
  }
  cached = createClient(env.url, secret, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return cached;
}

export function isAdminClientConfigured(): boolean {
  return Boolean(supabasePublicEnv() && (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY));
}
