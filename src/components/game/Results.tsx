"use client";

import { Check, X } from "lucide-react";
import Link from "next/link";
import { forwardRef } from "react";
import { NewAchievements } from "@/components/achievements/NewAchievements";
import type { GameSummary, PerformanceTier } from "@/lib/game/types";
import { useI18n } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { formatDuration } from "@/lib/time/format";

const TIER_KEY: Record<PerformanceTier, MessageKey> = {
  cartographer: "game.tierCartographer",
  navigator: "game.tierNavigator",
  explorer: "game.tierExplorer",
  apprentice: "game.tierApprentice",
};

export const Results = forwardRef<HTMLHeadingElement, { summary: GameSummary; onPlayAgain: () => void }>(function Results(
  { summary, onPlayAgain },
  headingRef,
) {
  const { locale, t } = useI18n();
  const stats = [
    { label: t("game.accuracy"), value: `${summary.accuracyPct}%` },
    { label: t("game.elapsed"), value: formatDuration(summary.elapsedMs, { tenths: true }) },
    { label: t("game.score"), value: summary.score.toLocaleString(locale === "he" ? "he-IL" : "en-GB") },
  ];

  return (
    <section aria-labelledby="results-title" className="pt-8 md:pt-12">
      <p className="eyebrow text-rust-ink">{t("game.resultsEyebrow")}</p>
      <h2 id="results-title" ref={headingRef} tabIndex={-1} className="display mt-3 text-5xl outline-none md:text-7xl">
        {t("game.correctOf", { correct: summary.correct, total: summary.total })}
      </h2>
      <p className="mt-3 text-lg text-ink-soft">{t(TIER_KEY[summary.tier])}</p>

      <dl className="mt-8 grid grid-cols-3 border-y border-ink">
        {stats.map((s, i) => (
          <div key={s.label} className={["py-4", i > 0 ? "border-s border-rule ps-4" : ""].join(" ")}>
            <dt className="eyebrow">{s.label}</dt>
            <dd className="mt-1 font-mono text-2xl tabular md:text-4xl" dir="ltr">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">{t("game.scoreNote")}</p>

      <NewAchievements items={summary.newAchievements} />

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={onPlayAgain} className="btn btn-primary">
          {t("game.playAgain")}
        </button>
        <Link href="/play" className="btn btn-ghost">
          {t("game.changeDifficulty")}
        </Link>
      </div>

      {summary.persisted ? (
        <div className="mt-8 border-s-2 border-success bg-paper/60 px-4 py-3 text-sm">
          <p>
            {t("game.savedResult")}{" "}
            <Link href="/profile" className="link-underline">
              {t("nav.profile")}
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-8 border-s-2 border-rust bg-paper/60 px-4 py-3 text-sm">
          <p>{t("game.guestResult")}</p>
          <p className="mt-1 text-ink-soft">{t("home.progressGuest")}</p>
        </div>
      )}

      <h2 className="display mt-12 text-2xl">{t("game.review")}</h2>
      <ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {summary.review.map((r, i) => (
          <li key={i}>
            <div className="relative aspect-[4/3] border border-ink/30 bg-paper">
              {/* eslint-disable-next-line @next/next/no-img-element -- opaque same-origin SVG */}
              <img src={r.flagUrl} alt={t("game.flagAltRevealed", { country: r.country.name[locale] })} className="absolute inset-0 size-full object-contain p-1.5" loading="lazy" />
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-sm font-medium">
              {r.correct ? (
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label={t("game.correct")} />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-danger" aria-label={t("game.incorrect")} />
              )}
              <span>{r.country.name[locale]}</span>
            </p>
            {!r.correct ? <p className="ms-5.5 text-xs text-muted">{t("game.youAnswered", { answer: r.chosen[locale] })}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
});
