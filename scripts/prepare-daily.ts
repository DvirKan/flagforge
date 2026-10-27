/**
 * Prepares and publishes daily challenges in advance.
 *
 *   npm run daily:prepare                 # today + next 13 days (14 total)
 *   npm run daily:prepare -- --days=30
 *   npm run daily:prepare -- --from=2026-11-01 --days=7
 *   npm run daily:prepare -- --dry-run    # generate and print, write nothing
 *
 * Already-published dates are never touched (published challenges are immutable). For each missing or draft
 * date a challenge is generated (2 easy, 2 medium, 1 hard; flags used in the previous 30 days are avoided),
 * stored as a draft, validated by the database and published. Validation failures are reported and the date
 * is left unpublished.
 */
import { indistinguishablePairs, lookalikeGroups, countryRows } from "../data/countries";
import { generateDailyChallenge } from "../src/lib/daily/generator";
import { cryptoRng } from "../src/lib/game/rng";
import { buildRelation, type SelectionContext } from "../src/lib/game/selection";
import type { Country } from "../src/lib/game/types";
import { addCalendarDays, calendarDateIn } from "../src/lib/time/zoned";
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
  const to = addCalendarDays(from, days - 1);
  const db = scriptAdminClient();

  const { data: overview, error } = await db.rpc("daily_challenge_overview", { p_from: from, p_to: to });
  if (error) throw new Error(`overview failed: ${error.message}`);
  const { data: recent, error: recentError } = await db.rpc("daily_countries_since", { p_from: addCalendarDays(from, -30) });
  if (recentError) throw new Error(`recent countries failed: ${recentError.message}`);

  const usedByDate = new Map<string, string[]>();
  for (const r of recent as { challenge_date: string; iso_code: string }[]) {
    usedByDate.set(r.challenge_date, [...(usedByDate.get(r.challenge_date) ?? []), r.iso_code]);
  }
  const rng = cryptoRng();
  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of overview as { challenge_date: string; status: string }[]) {
    const date = row.challenge_date;
    if (row.status === "published") {
      skipped++;
      console.log(`  ${date}  published already — unchanged`);
      continue;
    }
    // Avoid flags used within the 30 days before this date (including ones generated in this run).
    const exclude = new Set<string>();
    for (const [d, codes] of usedByDate) if (d >= addCalendarDays(date, -30) && d < date) codes.forEach((c) => exclude.add(c));
    const questions = generateDailyChallenge(ctx, rng, { exclude });
    usedByDate.set(date, questions.map((q) => q.country));
    const summary = questions.map((q) => `${q.country}(${q.difficulty[0]})`).join(" ");
    if (dryRun) {
      console.log(`  ${date}  would publish: ${summary}`);
      continue;
    }
    const { data: id, error: draftError } = await db.rpc("upsert_daily_challenge_draft", { p_date: date, p_questions: questions });
    if (draftError) {
      failed++;
      console.error(`✗ ${date}  draft failed: ${draftError.message}`);
      continue;
    }
    const { error: publishError } = await db.rpc("publish_daily_challenge", { p_challenge_id: id });
    if (publishError) {
      failed++;
      console.error(`✗ ${date}  not published: ${publishError.message}`);
      continue;
    }
    published++;
    console.log(`✓ ${date}  published: ${summary}`);
  }
  console.log(`\n${published} published, ${skipped} already published, ${failed} failed (${from} → ${to}).`);
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
