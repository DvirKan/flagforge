import { Lock } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { Achievement } from "@/server/progress/queries";
import { AchievementIcon } from "./AchievementIcon";

/** One achievement. Earned ones are warm and coloured; locked ones are quiet with a lock. */
export function AchievementCard({ a, locale, earnedLabel, lockedLabel }: { a: Achievement; locale: Locale; earnedLabel: string | null; lockedLabel: string }) {
  const earned = a.earnedAt !== null;
  return (
    <li
      className={[
        "flex items-start gap-4 rounded-xl p-4",
        earned ? "bg-paper shadow-card" : "border border-dashed border-rule-strong bg-transparent",
      ].join(" ")}
    >
      <span
        className={[
          "grid size-12 shrink-0 place-items-center rounded-full",
          earned ? "bg-[#fbf1d9] text-[#a8730c]" : "bg-parchment-deep text-muted",
        ].join(" ")}
      >
        <AchievementIcon iconKey={a.iconKey} className="size-6" />
      </span>
      <span className="min-w-0">
        <span className={["block font-medium", earned ? "text-ink" : "text-ink-soft"].join(" ")}>{locale === "he" ? a.nameHe : a.nameEn}</span>
        <span className="mt-0.5 block text-sm text-muted">{locale === "he" ? a.descriptionHe : a.descriptionEn}</span>
        <span className={["mt-2 inline-flex items-center gap-1 text-xs", earned ? "text-success" : "text-muted"].join(" ")}>
          {earned ? earnedLabel : (
            <>
              <Lock aria-hidden="true" className="size-3" />
              {lockedLabel}
            </>
          )}
        </span>
      </span>
    </li>
  );
}
