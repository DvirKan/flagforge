"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { setLocaleAction } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";

/**
 * Toggles between the two supported locales. Uses router.refresh(), which re-renders server
 * components while preserving client state — an in-progress game is not reset.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const target: Locale = locale === "he" ? "en" : "he";

  return (
    <button
      type="button"
      lang={target}
      className={className}
      disabled={pending}
      aria-label={t("a11y.switchTo", { language: LOCALE_LABELS[target] })}
      onClick={() =>
        startTransition(async () => {
          const result = await setLocaleAction(target);
          if (result.ok) router.refresh();
        })
      }
    >
      <span aria-hidden="true" className="font-mono text-[0.6875rem] tracking-[0.12em] uppercase">
        {target === "he" ? "עב" : "EN"}
      </span>
    </button>
  );
}
