"use client";

import { Check, X } from "lucide-react";
import { forwardRef } from "react";
import { useI18n } from "@/lib/i18n/client";
import { formatDuration } from "@/lib/time/format";
import type { DailyResult } from "@/server/daily/service";

export const DailyResultView = forwardRef<HTMLHeadingElement, { result: DailyResult }>(function DailyResultView({ result }, ref) {
  const { locale, t } = useI18n();
  return (
    <section aria-labelledby="daily-result" className="rounded-2xl bg-paper p-5 shadow-card md:p-8">
      <p className="eyebrow text-rust-ink">{t("daily.resultTitle")}</p>
      <h2 id="daily-result" ref={ref} tabIndex={-1} className="display mt-2 text-4xl outline-none md:text-5xl">
        {result.perfect ? t("daily.perfect") : t("daily.resultLine", { correct: result.correct })}
      </h2>
      <p className="mt-3 font-mono text-3xl tabular" dir="ltr">
        {formatDuration(result.elapsedMs, { tenths: true })}
      </p>
      <p className="mt-2 text-xs text-muted">{t("daily.clockNote")}</p>
      <h3 className="display mt-8 text-xl">{t("daily.reviewTitle")}</h3>
      <ol className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-5">
        {result.review.map((r, i) => (
          <li key={i}>
            <div className="relative aspect-[4/3] border border-ink/30 bg-parchment">
              {/* eslint-disable-next-line @next/next/no-img-element -- opaque same-origin SVG */}
              <img src={r.flagUrl} alt={t("game.flagAltRevealed", { country: r.country.name[locale] })} className="absolute inset-0 size-full object-contain p-1" />
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-sm font-medium">
              {r.correct ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label={t("game.correct")} /> : <X className="mt-0.5 size-4 shrink-0 text-danger" aria-label={t("game.incorrect")} />}
              <span>{r.country.name[locale]}</span>
            </p>
            {!r.correct ? <p className="ms-5.5 text-xs text-muted">{t("game.youAnswered", { answer: r.chosen[locale] })}</p> : null}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-ink-soft">{t("daily.comeBack")}</p>
    </section>
  );
});
