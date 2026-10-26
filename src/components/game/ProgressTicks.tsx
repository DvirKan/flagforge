"use client";

import { useI18n } from "@/lib/i18n/client";

/** Scale-bar style progress: one tick per question, filled as answered (green/rust), current one outlined. */
export function ProgressTicks({ total, results, current }: { total: number; results: boolean[]; current: number }) {
  const { t } = useI18n();
  return (
    <div>
      <div
        role="progressbar"
        aria-label={t("game.progress")}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={results.length}
        className="flex gap-1"
      >
        {Array.from({ length: total }, (_, i) => {
          const r = results[i];
          const cls =
            r === true
              ? "bg-success border-success"
              : r === false
                ? "bg-rust border-rust"
                : i === current
                  ? "border-ink bg-transparent"
                  : "border-rule-strong bg-transparent";
          return <span key={i} className={`h-2 flex-1 border ${cls}`} />;
        })}
      </div>
    </div>
  );
}
