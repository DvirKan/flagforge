export const LOCALES = ["en", "he"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "ff_locale";

export const LOCALE_LABELS: Record<Locale, string> = { en: "English", he: "עברית" };
/** BCP 47 tags used for Intl formatting. */
export const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", he: "he-IL" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): "rtl" | "ltr" {
  return locale === "he" ? "rtl" : "ltr";
}

/** Picks the best supported locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return { base: tag.toLowerCase().split("-")[0] ?? "", quality: Number.isFinite(quality) ? quality : 0 };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);
  for (const { base } of ranked) {
    if (base === "iw") return "he"; // legacy Hebrew tag
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
