/**
 * Supabase configuration. Supports the current key names (publishable/secret) and the legacy ones
 * (anon/service_role). When the public values are missing the app runs in guest-only mode.
 */
export function supabasePublicEnv(): { url: string; publishableKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !publishableKey) return null;
  if (!/^https?:\/\/[^\s/]+/.test(url)) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL");
  return { url: url.replace(/\/+$/, ""), publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return supabasePublicEnv() !== null;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
