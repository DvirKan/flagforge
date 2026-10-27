"use client";

import Link from "next/link";
import type { EarnedAchievement } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n/client";
import { AchievementIcon } from "./AchievementIcon";

/** Celebration strip on a results screen for achievements this game just unlocked. */
export function NewAchievements({ items }: { items: EarnedAchievement[] | undefined }) {
  const { locale, t } = useI18n();
  if (!items || items.length === 0) return null;
  return (
    <section role="status" aria-label={t("achievements.newlyEarned")} className="mt-8 rounded-2xl bg-[#fbf1d9] p-5">
      <p className="text-sm font-medium text-[#8a5d08]">{t("achievements.newlyEarned")}</p>
      <ul className="mt-3 flex flex-wrap gap-3">
        {items.map((a) => (
          <li key={a.code} className="flex items-center gap-3 rounded-full bg-paper py-1.5 pe-4 ps-1.5 shadow-card">
            <span className="grid size-9 place-items-center rounded-full bg-[#f3dfae] text-[#a8730c]">
              <AchievementIcon iconKey={a.iconKey} className="size-5" />
            </span>
            <span className="font-medium">{a.name[locale]}</span>
          </li>
        ))}
      </ul>
      <Link href="/achievements" className="mt-3 inline-block text-sm link-underline">
        {t("profile.viewAchievements")}
      </Link>
    </section>
  );
}
