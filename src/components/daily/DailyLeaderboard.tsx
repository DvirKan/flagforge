import { Crown } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { formatDuration } from "@/lib/time/format";
import type { LeaderboardRow } from "@/server/daily/queries";

/** Daily standings table. Perfect runs are listed first by the database; the top perfect run is the champion. */
export async function DailyLeaderboard({ rows, highlight, emptyText }: { rows: LeaderboardRow[]; highlight?: string | null; emptyText?: string }) {
  const { t } = await getI18n();
  if (rows.length === 0) {
    return <p className="border-y border-rule py-8 text-ink-soft">{emptyText ?? t("daily.noEntries")}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink">
            <th scope="col" className="eyebrow w-10 py-2 text-start font-normal">{t("daily.colRank")}</th>
            <th scope="col" className="eyebrow py-2 text-start font-normal">{t("daily.colPlayer")}</th>
            <th scope="col" className="eyebrow py-2 text-start font-normal">{t("daily.colCorrect")}</th>
            <th scope="col" className="eyebrow py-2 text-end font-normal">{t("daily.colTime")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const champion = r.rank === 1 && r.perfect;
            const mine = highlight && r.username === highlight;
            return (
              <tr key={r.rank} className={["border-b border-rule", mine ? "bg-paper" : ""].join(" ")}>
                <td className="py-3 font-mono tabular">{r.rank}</td>
                <td className="py-3">
                  <span className="inline-flex items-center gap-2">
                    {champion ? <Crown className="size-4 text-rust" aria-label={t("daily.champion")} /> : null}
                    <span className={champion ? "font-semibold" : ""}>{r.displayName ?? r.username}</span>
                    <span className="text-xs text-muted" dir="ltr">@{r.username}</span>
                    {mine ? <span className="eyebrow !text-rust-ink">· {t("daily.you")}</span> : null}
                  </span>
                </td>
                <td className="py-3 font-mono tabular" dir="ltr">
                  {r.correct}/5
                </td>
                <td className="py-3 text-end font-mono tabular" dir="ltr">
                  {formatDuration(r.elapsedMs, { tenths: true })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
