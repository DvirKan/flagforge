import type { Metadata } from "next";
import { brand } from "@/config/brand";
import type { Locale } from "@/lib/i18n/config";

/**
 * Link previews (Open Graph / X cards) for WhatsApp, Telegram, Facebook, X… Next replaces — not merges — a
 * parent's openGraph object, so pages that customise the preview build the whole object with this helper.
 * The image is public/og.png (npm run data:og).
 */
export function socialPreview(opts: { title: string; description: string; imageAlt: string; locale: Locale; path?: string }): Pick<Metadata, "openGraph" | "twitter"> {
  const image = { url: "/og.png", width: 1200, height: 630, alt: opts.imageAlt };
  return {
    openGraph: {
      type: "website",
      siteName: brand.name,
      title: opts.title,
      description: opts.description,
      url: opts.path ?? "/",
      locale: opts.locale === "he" ? "he_IL" : "en_US",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: opts.title, description: opts.description, images: [image] },
  };
}
