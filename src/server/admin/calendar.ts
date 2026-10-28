import type { Difficulty } from "@/config/game";
import { generateDailyChallenge, type DailyQuestionPayload } from "@/lib/daily/generator";
import { shuffle, type Rng } from "@/lib/game/rng";
import { buildOptions, type SelectionContext } from "@/lib/game/selection";
import { addCalendarDays } from "@/lib/time/zoned";
import { RpcError, type GameRpc } from "../game/rpc";

/**
 * Daily-challenge administration. Shared by the admin area (service-role client, after requireAdmin) and the
 * `daily:prepare` script, so it depends only on the RPC port and a country context — no framework imports.
 * Every successful change is written to the append-only audit log.
 *
 * The database stays the gatekeeper: it validates on publish, refuses to change published challenges, and
 * only allows unpublishing future dates nobody has started.
 */

export interface Actor {
  id: string | null;
  source: "admin" | "script";
}

export type ChallengeStatus = "missing" | "draft" | "published";

export interface CalendarDay {
  date: string;
  id: string | null;
  status: ChallengeStatus;
  problems: string[];
  attempts: number;
  countries: string[];
}

export interface ChallengeQuestion {
  position: number;
  difficulty: Difficulty;
  country: string;
  options: string[];
  answered: number;
  correct: number;
}

export interface ChallengeDetail {
  date: string;
  id?: string;
  status: ChallengeStatus;
  published_at?: string | null;
  updated_at?: string;
  problems?: string[];
  attempts?: number;
  completed?: number;
  perfect?: number;
  questions?: ChallengeQuestion[];
}

export interface AdminOverview {
  players: number;
  players_7d: number;
  games_7d: number;
  today: string;
  today_attempts: number;
  today_completed: number;
  first_unpublished: string | null;
}

export interface AuditEntry {
  id: number;
  source: "admin" | "script";
  action: string;
  target: string | null;
  details: Record<string, unknown>;
  created_at: string;
  actor: string | null;
}

export type AdminError =
  | "already_published"
  | "not_published"
  | "not_draft"
  | "missing"
  | "invalid"
  | "already_live"
  | "bad_request";

export type AdminResult = { ok: true } | { ok: false; error: AdminError; problems?: string[] };

/** Flags used within this many days before or after a date are avoided when generating it. */
export const REPEAT_WINDOW_DAYS = 30;

export const getOverview = (rpc: GameRpc) => rpc.call<AdminOverview>("admin_overview", {});
export const getCalendar = (rpc: GameRpc, from: string, to: string) => rpc.call<CalendarDay[]>("admin_calendar", { p_from: from, p_to: to });
export const getChallenge = (rpc: GameRpc, date: string) => rpc.call<ChallengeDetail>("admin_challenge_detail", { p_date: date });
export const getAudit = (rpc: GameRpc, limit = 30) => rpc.call<AuditEntry[]>("admin_audit_recent", { p_limit: limit });

async function log(rpc: GameRpc, actor: Actor, action: string, target: string, details: Record<string, unknown> = {}) {
  await rpc.call("admin_log", { p_actor_id: actor.id, p_source: actor.source, p_action: action, p_target: target, p_details: details });
}

/** Countries used on nearby dates (both directions — future days may already be prepared). */
async function nearbyCountries(rpc: GameRpc, date: string): Promise<Set<string>> {
  const byDate = await rpc.call<Record<string, string[]>>("admin_countries_between", {
    p_from: addCalendarDays(date, -REPEAT_WINDOW_DAYS),
    p_to: addCalendarDays(date, REPEAT_WINDOW_DAYS),
  });
  const used = new Set<string>();
  for (const [d, isos] of Object.entries(byDate ?? {})) if (d !== date) isos.forEach((i) => used.add(i));
  return used;
}

function mapDbError(err: unknown): AdminResult {
  const msg = err instanceof RpcError || err instanceof Error ? err.message : String(err);
  if (/challenge_invalid/.test(msg)) {
    const problems = msg.replace(/^.*challenge_invalid:\s*/, "").split("; ").filter(Boolean);
    return { ok: false, error: "invalid", problems };
  }
  if (/challenge_already_live/.test(msg)) return { ok: false, error: "already_live" };
  if (/challenge_published_immutable/.test(msg)) return { ok: false, error: "already_published" };
  if (/draft_not_found/.test(msg)) return { ok: false, error: "not_draft" };
  throw err;
}

async function saveDraft(rpc: GameRpc, date: string, questions: DailyQuestionPayload[]): Promise<string> {
  return rpc.call<string>("upsert_daily_challenge_draft", { p_date: date, p_questions: questions });
}

/** Creates (or replaces) the draft for a date with a freshly generated challenge. */
export async function generateDraft(rpc: GameRpc, ctx: SelectionContext, rng: Rng, actor: Actor, date: string): Promise<AdminResult> {
  const current = await getChallenge(rpc, date);
  if (current.status === "published") return { ok: false, error: "already_published" };
  const questions = generateDailyChallenge(ctx, rng, { exclude: await nearbyCountries(rpc, date) });
  try {
    await saveDraft(rpc, date, questions);
  } catch (err) {
    return mapDbError(err);
  }
  await log(rpc, actor, current.status === "draft" ? "daily.regenerate" : "daily.generate", date, { countries: questions.map((q) => q.country) });
  return { ok: true };
}

/**
 * Replaces one question of a draft. `iso` picks the country (it must have the question's difficulty and not
 * already be in the challenge); null picks one at random, avoiding nearby dates. Options are rebuilt by the
 * same distractor logic the game uses.
 */
export async function replaceQuestion(
  rpc: GameRpc,
  ctx: SelectionContext,
  rng: Rng,
  actor: Actor,
  date: string,
  position: number,
  iso: string | null,
): Promise<AdminResult> {
  const current = await getChallenge(rpc, date);
  if (current.status === "missing") return { ok: false, error: "missing" };
  if (current.status === "published") return { ok: false, error: "already_published" };
  const questions = current.questions ?? [];
  const target = questions.find((q) => q.position === position);
  if (!target) return { ok: false, error: "bad_request" };

  const inChallenge = new Set(questions.filter((q) => q.position !== position).map((q) => q.country));
  const pool = ctx.countries.filter((c) => c.difficulty === target.difficulty && !inChallenge.has(c.iso2));
  let country = iso ? pool.find((c) => c.iso2 === iso) : undefined;
  if (iso && !country) return { ok: false, error: "bad_request" };
  if (!country) {
    const recent = await nearbyCountries(rpc, date);
    const fresh = pool.filter((c) => !recent.has(c.iso2) && c.iso2 !== target.country);
    country = shuffle(fresh.length > 0 ? fresh : pool, rng)[0];
  }
  if (!country) return { ok: false, error: "bad_request" };

  const { options } = buildOptions(ctx, country, target.difficulty, rng);
  const payload: DailyQuestionPayload[] = questions.map((q) =>
    q.position === position
      ? { country: country.iso2, difficulty: q.difficulty, options: options.map((o) => o.iso2) }
      : { country: q.country, difficulty: q.difficulty, options: q.options },
  );
  try {
    await saveDraft(rpc, date, payload);
  } catch (err) {
    return mapDbError(err);
  }
  await log(rpc, actor, "daily.replace_question", date, { position, from: target.country, to: country.iso2, chosen: Boolean(iso) });
  return { ok: true };
}

export async function publish(rpc: GameRpc, actor: Actor, date: string): Promise<AdminResult> {
  const current = await getChallenge(rpc, date);
  if (current.status === "missing" || !current.id) return { ok: false, error: "missing" };
  if (current.status === "published") return { ok: false, error: "already_published" };
  try {
    await rpc.call("publish_daily_challenge", { p_challenge_id: current.id });
  } catch (err) {
    return mapDbError(err);
  }
  await log(rpc, actor, "daily.publish", date, { countries: (current.questions ?? []).map((q) => q.country) });
  return { ok: true };
}

export async function unpublish(rpc: GameRpc, actor: Actor, date: string): Promise<AdminResult> {
  const current = await getChallenge(rpc, date);
  if (current.status !== "published" || !current.id) return { ok: false, error: "not_published" };
  try {
    await rpc.call("unpublish_daily_challenge", { p_challenge_id: current.id });
  } catch (err) {
    return mapDbError(err);
  }
  await log(rpc, actor, "daily.unpublish", date);
  return { ok: true };
}

export async function deleteDraft(rpc: GameRpc, actor: Actor, date: string): Promise<AdminResult> {
  const current = await getChallenge(rpc, date);
  if (current.status !== "draft" || !current.id) return { ok: false, error: "not_draft" };
  try {
    await rpc.call("admin_delete_draft", { p_challenge_id: current.id });
  } catch (err) {
    return mapDbError(err);
  }
  await log(rpc, actor, "daily.delete_draft", date);
  return { ok: true };
}

export interface FillReport {
  published: string[];
  skipped: string[];
  failed: { date: string; reason: string }[];
}

/**
 * Makes sure every date in [from, from + days) has a published challenge. Published dates are left alone;
 * valid drafts are published as they are (an admin may have curated them); missing or invalid ones are
 * generated first. Dry runs generate nothing and report what would happen.
 */
export async function fillAhead(
  rpc: GameRpc,
  ctx: SelectionContext,
  rng: Rng,
  actor: Actor,
  from: string,
  days: number,
  opts: { dryRun?: boolean } = {},
): Promise<FillReport> {
  const count = Math.min(Math.max(Math.trunc(days) || 1, 1), 120);
  const calendar = await getCalendar(rpc, from, addCalendarDays(from, count - 1));
  const report: FillReport = { published: [], skipped: [], failed: [] };
  for (const day of calendar) {
    if (day.status === "published") {
      report.skipped.push(day.date);
      continue;
    }
    if (opts.dryRun) {
      report.published.push(day.date);
      continue;
    }
    if (day.status === "missing" || day.problems.length > 0) {
      const generated = await generateDraft(rpc, ctx, rng, actor, day.date);
      if (!generated.ok) {
        report.failed.push({ date: day.date, reason: generated.error });
        continue;
      }
    }
    const published = await publish(rpc, actor, day.date);
    if (published.ok) report.published.push(day.date);
    else report.failed.push({ date: day.date, reason: [published.error, ...(published.problems ?? [])].join(": ") });
  }
  if (!opts.dryRun) await log(rpc, actor, "daily.fill_ahead", from, { days: count, published: report.published.length, failed: report.failed.length });
  return report;
}
