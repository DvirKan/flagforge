import { createClient } from "@supabase/supabase-js";

/** Admin client for maintenance scripts — reads .env.local; requires the server-only secret key. */
export function scriptAdminClient() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // variables may come from the shell
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set (in .env.local).");
    process.exit(1);
  }
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function argValue(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}
