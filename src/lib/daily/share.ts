import { formatDuration } from "@/lib/time/format";
import { parseCalendarDate } from "@/lib/time/zoned";

/**
 * The text a player shares after the daily challenge — Wordle-style result plus a challenge to the reader, so the
 * message invites people in rather than just reporting a score. It never names a country or shows a flag, so
 * sharing cannot spoil today's challenge for anyone.
 *
 *   FLAGFORGE · האתגר היומי 15.11
 *   🟩🟩🟥🟩🟩 4/5 · 0:14.2
 *   נראה אותך עושה יותר טוב 👇
 *   https://…/daily
 */
export interface ShareCopy {
  /** e.g. "Daily" / "האתגר היומי" */
  label: string;
  /** hook when the run was perfect (the challenge is speed) */
  dareFaster: string;
  /** hook otherwise (the challenge is the score) */
  dareBetter: string;
}

export function dailyShareText(opts: { date: string; results: boolean[]; elapsedMs: number; url: string; copy: ShareCopy }): string {
  const { day, month } = parseCalendarDate(opts.date);
  const squares = opts.results.map((ok) => (ok ? "🟩" : "🟥")).join("");
  const correct = opts.results.filter(Boolean).length;
  const perfect = correct === opts.results.length;
  return [
    `FLAGFORGE · ${opts.copy.label} ${day}.${month}`,
    `${squares} ${correct}/${opts.results.length} · ${formatDuration(opts.elapsedMs, { tenths: true })}${perfect ? " 🏆" : ""}`,
    `${perfect ? opts.copy.dareFaster : opts.copy.dareBetter} 👇`,
    opts.url,
  ].join("\n");
}
