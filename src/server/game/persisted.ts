import "server-only";
import { gameConfig, type Difficulty } from "@/config/game";
import { cryptoRng, type Rng } from "@/lib/game/rng";
import { accuracyPct, performanceTier } from "@/lib/game/scoring";
import { buildOptions, selectQuestionCountries } from "@/lib/game/selection";
import type { AnswerResult, Country, GameSummary, QuestionView } from "@/lib/game/types";
import { getCountry, revealCountry, selectionContext } from "../countries";
import { seal, unseal } from "../crypto";
import { flagUrlFor } from "./flag-handle";
import { achievementsSinceStart } from "../progress/awards";
import { RpcError, type GameRpc } from "./rpc";
import type { GameError } from "./standard";

/**
 * Standard game for signed-in players, persisted in PostgreSQL.
 * The database is authoritative: it stores the questions, accepts each answer once and in order (row lock),
 * and computes time and score from its own clock. The client token only names the session and the position
 * it is answering, bound to the user — replaying an old token is rejected by the database as a conflict.
 */
const PURPOSE = "flagforge:game-db:v1";

interface DbToken {
  v: 1;
  sid: string;
  pos: number;
  u: string;
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
  difficulty: Difficulty;
  correct_count: number;
  score: number;
  elapsed_ms: number | null;
}

interface ReviewRow {
  position: number;
  country: string;
  options: string[];
  selected_index: number;
  is_correct: boolean;
}

function must(iso2: string): Country {
  const c = getCountry(iso2);
  if (!c) throw new Error(`Unknown country ${iso2}`);
  return c;
}

function view(position: number, total: number, correctIso: string, options: string[]): QuestionView {
  return { index: position - 1, total, flagUrl: flagUrlFor(correctIso), options: options.map((iso) => ({ name: must(iso).name })) };
}

export function isPersistedToken(token: string): boolean {
  return unseal<DbToken>(token, PURPOSE) !== null;
}

export async function startPersistedGame(rpc: GameRpc, userId: string, difficulty: Difficulty, opts: { rng?: Rng; length?: number } = {}) {
  const rng = opts.rng ?? cryptoRng();
  const length = opts.length ?? gameConfig.standardGameLength;
  const picks = selectQuestionCountries(selectionContext, difficulty, length, rng);
  const questions = picks.map((c) => ({ country: c.iso2, options: buildOptions(selectionContext, c, difficulty, rng).options.map((o) => o.iso2) }));
  const sid = await rpc.call<string>("start_standard_game", { p_user_id: userId, p_difficulty: difficulty, p_questions: questions });
  const first = questions[0];
  if (!first) throw new Error("empty game");
  const token: DbToken = { v: 1, sid, pos: 1, u: userId };
  return { token: seal(token, PURPOSE), question: view(1, questions.length, first.country, first.options) };
}

export async function answerPersistedGame(
  rpc: GameRpc,
  userId: string,
  rawToken: string,
  choice: number,
): Promise<{ error: GameError | "rate_limited" } | { token: string | null; result: AnswerResult; next: QuestionView | null; summary: GameSummary | null }> {
  const token = unseal<DbToken>(rawToken, PURPOSE);
  if (!token || token.v !== 1 || token.u !== userId) return { error: "session_invalid" };

  let row: AnswerRow;
  try {
    row = await rpc.call<AnswerRow>("answer_standard_question", { p_user_id: userId, p_session_id: token.sid, p_position: token.pos, p_choice: choice });
  } catch (err) {
    const msg = err instanceof RpcError ? err.message : "";
    if (/conflict/.test(msg)) return { error: "conflict" };
    if (/session_expired/.test(msg)) return { error: "session_expired" };
    if (/session_not_found|invalid_choice/.test(msg)) return { error: "session_invalid" };
    throw err;
  }

  const result: AnswerResult = { correct: row.correct, chosenIndex: choice, correctIndex: row.correct_index, country: revealCountry(must(row.country)) };

  if (!row.completed) {
    const q = await rpc.call<QuestionRow>("standard_game_question", { p_user_id: userId, p_session_id: token.sid, p_position: token.pos + 1 });
    const next: DbToken = { ...token, pos: token.pos + 1 };
    return { token: seal(next, PURPOSE), result, next: view(q.position, q.total, q.country, q.options), summary: null };
  }

  const review = await rpc.call<ReviewRow[]>("standard_game_review", { p_user_id: userId, p_session_id: token.sid });
  const total = review.length;
  const accuracy = accuracyPct(row.correct_count, total);
  const summary: GameSummary = {
    difficulty: row.difficulty,
    correct: row.correct_count,
    total,
    accuracyPct: accuracy,
    elapsedMs: Number(row.elapsed_ms ?? 0),
    score: row.score,
    tier: performanceTier(accuracy),
    persisted: true,
    review: review.map((r) => ({
      flagUrl: flagUrlFor(r.country),
      correct: r.is_correct,
      country: revealCountry(must(r.country)),
      chosen: must(r.options[r.selected_index] ?? r.country).name,
    })),
    newAchievements: await achievementsSinceStart(rpc, userId, token.sid),
  };
  return { token: null, result, next: null, summary };
}
