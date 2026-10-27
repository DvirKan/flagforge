import { Crown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { getI18n } from "@/lib/i18n/server";
import { formatDuration } from "@/lib/time/format";
import type { PeriodRow } from "@/server/progress/queries";

/** Weekly / monthly standings: perfect daily challenges first, then combined time of those perfect runs. */
export async function PeriodLeaderboard({ rows, highlight, emptyText }: { rows: PeriodRow[]; highlight?: string | null; emptyText: string }) {
  const { t } = await getI18n();
  if (rows.length === 0) {
    return <p className="rounded-xl bg-paper px-5 py-8 text-center text-ink-soft">{emptyText}</p>;
  }
  return (
    <div className="overflow-hidden rounded-xl bg-paper shadow-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-muted">
            <th scope="col" className="w-12 px-4 py-3 text-start font-medium">{t("daily.colRank")}</th>
            <th scope="col" className="py-3 text-start font-medium">{t("daily.colPlayer")}</th>
            <th scope="col" className="w-24 py-3 text-center font-medium">{t("leaderboards.colPerfect")}</th>
            <th scope="col" className="w-28 px-4 py-3 text-end font-medium">{t("leaderboards.colTotal")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const champion = r.rank === 1;
            const mine = Boolean(highlight && r.username === highlight);
            const name = r.displayName ?? r.username;
            return (
              <tr key={r.rank} className={["border-b border-rule last:border-b-0", champion ? "bg-[#fbf1d9]" : mine ? "bg-[#f4efe4]" : ""].join(" ")}>
                <td className="px-4 py-3 align-middle">
                  {champion ? <Crown className="size-5 text-[#c48a12]" aria-label={t("daily.champion")} /> : <span className="font-mono text-muted tabular">{r.rank}</span>}
                </td>
                <td className="py-3 align-middle">
                  <span className="flex items-center gap-3">
                    <Avatar name={name} seed={r.username} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">
                        {name}
                        {mine ? <span className="ms-2 rounded-full bg-rust-ink px-2 py-0.5 text-[0.6875rem] font-medium text-paper">{t("daily.you")}</span> : null}
                      </span>
                      {r.displayName ? <span className="block truncate text-xs text-muted" dir="auto">@{r.username}</span> : null}
                    </span>
                  </span>
                </td>
                <td className="py-3 text-center align-middle">
                  <span className="inline-block rounded-full bg-success-wash px-2.5 py-0.5 font-mono text-xs text-success tabular" title={`${t("leaderboards.colPlayed")}: ${r.daysPlayed}`}>
                    {r.perfectCount}
                  </span>
                </td>
                <td className="px-4 py-3 text-end align-middle">
                  <span dir="ltr" className="inline-block font-mono tabular">
                    {formatDuration(r.totalMs, { tenths: true })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
