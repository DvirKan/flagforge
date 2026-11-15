import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { supabasePublicEnv } from "@/lib/supabase/env";

/**
 * Refreshes the Supabase session cookie on navigation so Server Components see a valid token.
 * Authorization decisions are NOT made here — every protected page and route re-checks on the server.
 */
export async function middleware(request: NextRequest) {
  // Shared links carry the sharer's language (/daily?lang=he). It applies only to visitors who have not chosen
  // a language yet — link-preview bots and first-time visitors — and never overrides an existing choice.
  const linkLocale = request.nextUrl.searchParams.get("lang");
  const adoptLocale = isLocale(linkLocale) && !request.cookies.has(LOCALE_COOKIE) ? linkLocale : null;
  if (adoptLocale) request.cookies.set(LOCALE_COOKIE, adoptLocale);
  const finish = (res: NextResponse) => {
    if (adoptLocale) res.cookies.set(LOCALE_COOKIE, adoptLocale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return res;
  };

  const env = supabasePublicEnv();
  let response = NextResponse.next({ request });
  if (!env) return finish(response);

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  await supabase.auth.getClaims();
  return finish(response);
}

export const config = {
  matcher: [
    // Skip static assets, images and the opaque flag endpoint (high-volume, no auth needed).
    "/((?!_next/static|_next/image|favicon.ico|api/game/flag|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
