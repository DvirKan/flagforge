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

/**
 * Prints a script failure with its underlying cause. Node's fetch reports network problems only as
 * "fetch failed"; the real reason (DNS, refused connection, TLS…) is in `cause`.
 */
export function reportFailure(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  const cause = err instanceof Error ? (err.cause as { code?: string; message?: string } | undefined) : undefined;
  console.error(cause ? `${message}: ${cause.code ?? ""} ${cause.message ?? ""}`.trim() : message);
  if (cause?.code === "ENOTFOUND" || /fetch failed/.test(message)) {
    console.error("Supabase could not be reached. If the free project was paused for inactivity, restore it in the dashboard.");
  }
  process.exit(1);
}
