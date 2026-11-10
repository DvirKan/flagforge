import { formatDuration } from "@/lib/time/format";
import { parseCalendarDate } from "@/lib/time/zoned";

/**
 * The text a player shares after the daily challenge — Wordle-style: which answers were right, the time and a
 * link. It never names a country or shows a flag, so sharing cannot spoil today's challenge for anyone.
 */
export function dailyShareText(opts: { date: string; results: boolean[]; elapsedMs: number; url: string; label: string }): string {
  const { day, month } = parseCalendarDate(opts.date);
  const squares = opts.results.map((ok) => (ok ? "🟩" : "🟥")).join("");
  const correct = opts.results.filter(Boolean).length;
  const perfect = correct === opts.results.length;
  return [
    `FLAGFORGE · ${opts.label} ${day}.${month}`,
    `${squares}${perfect ? " 🏆" : ""}`,
    `${correct}/${opts.results.length} · ${formatDuration(opts.elapsedMs, { tenths: true })}`,
    opts.url,
  ].join("\n");
}
