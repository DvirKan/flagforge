/**
 * Prepares and publishes daily challenges in advance.
 *
 *   npm run daily:prepare                 # today + next 13 days (14 total)
 *   npm run daily:prepare -- --days=30
 *   npm run daily:prepare -- --from=2026-11-01 --days=7
 *   npm run daily:prepare -- --dry-run    # generate and print, write nothing
 *
 * Uses the same service as the admin area (src/server/admin/calendar.ts → fillAhead): published dates are never
 * touched; valid drafts are published as they are; missing or invalid dates get a generated challenge
 * (2 easy, 2 medium, 1 hard; flags used within 30 days either side are avoided), validated by the database
 * and published. Each run is recorded in the admin audit log with source "script".
 */
import { indistinguishablePairs, lookalikeGroups, countryRows } from "../data/countries";
import { cryptoRng } from "../src/lib/game/rng";
import { buildRelation, type SelectionContext } from "../src/lib/game/selection";
import type { Country } from "../src/lib/game/types";
import { addCalendarDays, calendarDateIn } from "../src/lib/time/zoned";
import { fillAhead } from "../src/server/admin/calendar";
import { supabaseRpc } from "../src/server/game/rpc";
import { argValue, scriptAdminClient } from "./lib/admin-client";

const ctx: SelectionContext = {
  countries: countryRows.map(([iso2, continent, difficulty, en, he, capEn, capHe, factEn, factHe]) => ({
    iso2,
    continent,
    difficulty,
    name: { en, he },
    capital: { en: capEn, he: capHe },
    fact: { en: factEn, he: factHe },
  })) as Country[],
  lookalikes: buildRelation(lookalikeGroups),
  indistinguishable: buildRelation(indistinguishablePairs),
};

async function main() {
  const days = Math.min(Math.max(Number(argValue("days", "14")) || 14, 1), 120);
  const from = argValue("from", calendarDateIn(new Date(), "Asia/Jerusalem"));
  const dryRun = process.argv.includes("--dry-run");
  const rpc = supabaseRpc(scriptAdminClient());

  const report = await fillAhead(rpc, ctx, cryptoRng(), { id: null, source: "script" }, from, days, { dryRun });
  for (const d of report.skipped) console.log(`  ${d}  published already — unchanged`);
  for (const d of report.published) console.log(`${dryRun ? "  " : "✓ "}${d}  ${dryRun ? "would be generated and published" : "published"}`);
  for (const f of report.failed) console.error(`✗ ${f.date}  ${f.reason}`);
  console.log(`\n${report.published.length} ${dryRun ? "to publish" : "published"}, ${report.skipped.length} already published, ${report.failed.length} failed (${from} → ${addCalendarDays(from, days - 1)}).`);
  if (report.failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
