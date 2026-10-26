import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { LOCALE_COOKIE, isLocale, negotiateLocale, type Locale } from "./config";
import { getMessages } from "./dictionaries";
import { createTranslator } from "./translate";

/**
 * Resolves the request locale: explicit cookie (set by the switcher; for signed-in users it mirrors
 * profiles.preferred_language) → Accept-Language → default.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const headerStore = await headers();
  return negotiateLocale(headerStore.get("accept-language"));
});

export const getI18n = cache(async () => {
  const locale = await getLocale();
  const messages = getMessages(locale);
  return { locale, messages, t: createTranslator(messages) };
});
