import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation/auth";

const OTP_TYPES = new Set<EmailOtpType>(["signup", "email", "recovery", "invite", "magiclink", "email_change"]);

/**
 * GET /auth/confirm — target of email links (verification and password recovery).
 * Supports both link styles:
 *   ?token_hash=…&type=…  (recommended template; works on any device)
 *   ?code=…               (default PKCE link; must be opened in the browser that requested it)
 * On success the session cookie is set and the user is sent to a validated same-origin `next` path.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNextPath(url.searchParams.get("next"), "/profile");
  const failTo = new URL("/login?error=link_invalid", url.origin);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(failTo);

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  let ok = false;
  if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  const target = ok ? (type === "recovery" ? "/reset-password" : next) : null;
  return NextResponse.redirect(target ? new URL(target, url.origin) : failTo);
}
