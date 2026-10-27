import "server-only";
import type { AnswerResult, CountryReveal, Localized, QuestionView } from "@/lib/game/types";
import { getCountry, revealCountry } from "../countries";
import { seal, unseal } from "../crypto";
import { flagUrlFor } from "../game/flag-handle";
import { RpcError, type GameRpc } from "../game/rpc";

/**
 * Daily challenge, server side. The database owns the attempt (one per user, server timestamps, answers written
 * once and in order). The token held by the browser only names the attempt and the position being answered,
 * bound to the user; a stale or replayed token is rejected by the database.
 */
const PURPOSE = "flagforge:daily:v1";

interface DailyToken {
  v: 1;
  aid: string;
  pos: number;
  u: string;
}

export interface DailyReviewItem {
  flagUrl: string;
  correct: boolean;
  country: CountryReveal;
  chosen: Localized;
}

export interface DailyResult {
  correct: number;
  total: number;
  elapsedMs: number;
  perfect: boolean;
  review: DailyReviewItem[];
}

export type DailyStart =
  | { kind: "playing"; token: string; question: QuestionView; startedAt: string; serverNow: string; resumed: boolean; answered: number }
  | { kind: "completed"; result: DailyResult };

export type DailyError = "no_challenge" | "conflict" | "session_invalid";

interface StartRow {
  attempt_id: string;
  status: "active" | "completed";
  resumed: boolean;
  started_at: string;
  next_position: number | null;
  answered: number;
  correct_count: number;
  elapsed_ms: number | null;
}

interface QuestionRow {
  position: number;
  total: number;
  country: string;
  options: string[];
}

interface AnswerRow {
  correct: boolean;
  correct_index: number;
  country: string;
  completed: boolean;
  correct_count: number;
  elapsed_ms: number | null;
}

interface ReviewRow {
  position: number;
  country: string;
  selected: string;
  is_correct: boolean;
}

function name(iso: string): Localized {
  const c = getCountry(iso);
  if (!c) throw new Error(`Unknown country ${iso}`);
  return c.name;
}

function reveal(iso: string): CountryReveal {
  const c = getCountry(iso);
  if (!c) throw new Error(`Unknown country ${iso}`);
  return revealCountry(c);
}

async function questionView(rpc: GameRpc, userId: string, attemptId: string, position: number): Promise<QuestionView> {
  const q = await rpc.call<QuestionRow>("daily_question_internal", { p_user_id: userId, p_attempt_id: attemptId, p_position: position });
  return { index: q.position - 1, total: q.total, flagUrl: flagUrlFor(q.country), options: q.options.map((iso) => ({ name: name(iso) })) };
}

async function result(rpc: GameRpc, userId: string, attemptId: string, correct: number, elapsedMs: number): Promise<DailyResult> {
  const rows = await rpc.call<ReviewRow[]>("daily_attempt_review", { p_user_id: userId, p_attempt_id: attemptId });
  return {
    correct,
    total: 5,
    elapsedMs,
    perfect: correct === 5,
    review: rows.map((r) => ({ flagUrl: flagUrlFor(r.country), correct: r.is_correct, country: reveal(r.country), chosen: name(r.selected) })),
  };
}

export function isDailyToken(token: string): boolean {
  return unseal<DailyToken>(token, PURPOSE) !== null;
}

export async function startDaily(rpc: GameRpc, userId: string): Promise<DailyStart | { error: DailyError }> {
  let row: StartRow;
  try {
    row = await rpc.call<StartRow>("start_daily_attempt", { p_user_id: userId });
  } catch (err) {
    if (err instanceof RpcError && /no_challenge_today/.test(err.message)) return { error: "no_challenge" };
    throw err;
  }
  if (row.status === "completed" || row.next_position === null) {
    return { kind: "completed", result: await result(rpc, userId, row.attempt_id, row.correct_count, Number(row.elapsed_ms ?? 0)) };
  }
  const token: DailyToken = { v: 1, aid: row.attempt_id, pos: row.next_position, u: userId };
  return {
    kind: "playing",
    token: seal(token, PURPOSE),
    question: await questionView(rpc, userId, row.attempt_id, row.next_position),
    startedAt: row.started_at,
    serverNow: new Date().toISOString(),
    resumed: row.resumed,
    answered: row.answered,
  };
}

export async function answerDaily(
  rpc: GameRpc,
  userId: string,
  rawToken: string,
  choice: number,
): Promise<{ error: DailyError } | { token: string | null; result: AnswerResult; next: QuestionView | null; final: DailyResult | null }> {
  const token = unseal<DailyToken>(rawToken, PURPOSE);
  if (!token || token.v !== 1 || token.u !== userId) return { error: "session_invalid" };
  let row: AnswerRow;
  try {
    row = await rpc.call<AnswerRow>("answer_daily_question", { p_user_id: userId, p_attempt_id: token.aid, p_position: token.pos, p_choice: choice });
  } catch (err) {
    const msg = err instanceof RpcError ? err.message : "";
    if (/conflict/.test(msg)) return { error: "conflict" };
    if (/attempt_not_found|invalid_choice/.test(msg)) return { error: "session_invalid" };
    throw err;
  }
  const answer: AnswerResult = { correct: row.correct, chosenIndex: choice, correctIndex: row.correct_index, country: reveal(row.country) };
  if (!row.completed) {
    const next: DailyToken = { ...token, pos: token.pos + 1 };
    return { token: seal(next, PURPOSE), result: answer, next: await questionView(rpc, userId, token.aid, next.pos), final: null };
  }
  return { token: null, result: answer, next: null, final: await result(rpc, userId, token.aid, row.correct_count, Number(row.elapsed_ms ?? 0)) };
}
