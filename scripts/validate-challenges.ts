/**
 * Reports the state of upcoming daily challenges and any validation problems.
 *
 *   npm run daily:validate               # today + next 13 days
 *   npm run daily:validate -- --days=30
 *
 * Exits non-zero if any date in the range is missing, unpublished or invalid (useful in CI or a cron check).
 */
import { addCalendarDays, calendarDateIn } from "../src/lib/time/zoned";
import { argValue, scriptAdminClient } from "./lib/admin-client";

async function main() {
  const days = Math.min(Math.max(Number(argValue("days", "14")) || 14, 1), 120);
  const from = argValue("from", calendarDateIn(new Date(), "Asia/Jerusalem"));
  const to = addCalendarDays(from, days - 1);
  const { data, error } = await scriptAdminClient().rpc("daily_challenge_overview", { p_from: from, p_to: to });
  if (error) throw new Error(error.message);
  let bad = 0;
  for (const r of data as { challenge_date: string; status: string; problems: string[]; attempts: number }[]) {
    const ok = r.status === "published" && r.problems.length === 0;
    if (!ok) bad++;
    const detail = r.problems.length ? ` — ${r.problems.join("; ")}` : "";
    console.log(`${ok ? "✓" : "✗"} ${r.challenge_date}  ${r.status.padEnd(9)} attempts: ${r.attempts}${detail}`);
  }
  console.log(bad ? `\n${bad} date(s) need attention. Run: npm run daily:prepare` : "\nAll dates are published and valid.");
  if (bad) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
