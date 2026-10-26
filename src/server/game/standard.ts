import "server-only";
import { randomUUID } from "node:crypto";
import { gameConfig, type Difficulty } from "@/config/game";
import { cryptoRng, type Rng } from "@/lib/game/rng";
import { accuracyPct, answerPoints, performanceTier } from "@/lib/game/scoring";
import { buildOptions, selectQuestionCountries } from "@/lib/game/selection";
import type { AnswerResult, Country, GameSummary, QuestionView } from "@/lib/game/types";
import { getCountry, revealCountry, selectionContext } from "../countries";
import { seal, unseal } from "../crypto";
import { flagUrlFor } from "./flag-handle";

/**
 * Standard (unranked) game, guest mode.
 *
 * The whole game state travels in an AES-GCM-encrypted token that only the server can read or produce, so the
 * client never holds the answers, cannot forge a score and cannot skip ahead. Being stateless, a token cannot be
 * "spent": a guest could replay an earlier token to re-answer a question. Guest results are never stored, so this
 * only affects the guest's own screen. Authenticated games (Phase 3) keep their state in the database, where
 * each answer is written once.
 */
const PURPOSE = "flagforge:game:v1";
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

interface GameState {
  v: 1;
  sid: string;
  d: Difficulty;
  /** [correct iso2, four option iso2 codes in display order] */
  q: [string, string[]][];
  /** current question index */
  i: number;
  /** answers: [chosen index, correct (1/0), response ms] */
  a: [number, 0 | 1, number][];
  t0: number;
  tq: number;
  exp: number;
}

export type GameError = "session_invalid" | "session_expired" | "conflict";

function must(iso2: string): Country {
  const c = getCountry(iso2);
  if (!c) throw new Error(`Unknown country in game state: ${iso2}`);
  return c;
}

function viewOf(state: GameState, now: number): QuestionView {
  const entry = state.q[state.i];
  if (!entry) throw new Error("No current question");
  const [correct, options] = entry;
  return {
    index: state.i,
    total: state.q.length,
    flagUrl: flagUrlFor(correct, now),
    options: options.map((iso) => ({ name: must(iso).name })),
  };
}

export function startStandardGame(difficulty: Difficulty, opts: { now?: number; rng?: Rng; length?: number } = {}) {
  const now = opts.now ?? Date.now();
  const rng = opts.rng ?? cryptoRng();
  const length = opts.length ?? gameConfig.standardGameLength;
  const picks = selectQuestionCountries(selectionContext, difficulty, length, rng);
  const state: GameState = {
    v: 1,
    sid: randomUUID(),
    d: difficulty,
    q: picks.map((c) => {
      const { options } = buildOptions(selectionContext, c, difficulty, rng);
      return [c.iso2, options.map((o) => o.iso2)];
    }),
    i: 0,
    a: [],
    t0: now,
    tq: now,
    exp: now + SESSION_TTL_MS,
  };
  return { token: seal(state, PURPOSE), question: viewOf(state, now) };
}

export function answerStandardGame(
  token: string,
  choice: number,
  opts: { now?: number } = {},
):
  | { error: GameError }
  | { token: string | null; result: AnswerResult; next: QuestionView | null; summary: GameSummary | null } {
  const now = opts.now ?? Date.now();
  const state = unseal<GameState>(token, PURPOSE);
  if (!state || state.v !== 1 || !Array.isArray(state.q)) return { error: "session_invalid" };
  if (state.exp < now) return { error: "session_expired" };
  if (state.i >= state.q.length) return { error: "conflict" };

  const entry = state.q[state.i];
  if (!entry) return { error: "session_invalid" };
  const [correctIso, options] = entry;
  const correctIndex = options.indexOf(correctIso);
  const ok = choice === correctIndex;
  state.a.push([choice, ok ? 1 : 0, Math.max(0, now - state.tq)]);
  state.i += 1;
  state.tq = now;

  const result: AnswerResult = {
    correct: ok,
    chosenIndex: choice,
    correctIndex,
    country: revealCountry(must(correctIso)),
  };

  if (state.i < state.q.length) {
    return { token: seal(state, PURPOSE), result, next: viewOf(state, now), summary: null };
  }
  return { token: null, result, next: null, summary: summarize(state, now) };
}

function summarize(state: GameState, now: number): GameSummary {
  const correct = state.a.filter(([, ok]) => ok === 1).length;
  const total = state.q.length;
  const accuracy = accuracyPct(correct, total);
  return {
    difficulty: state.d,
    correct,
    total,
    accuracyPct: accuracy,
    elapsedMs: now - state.t0,
    score: state.a.reduce((sum, [, ok, ms]) => sum + answerPoints(ok === 1, ms), 0),
    tier: performanceTier(accuracy),
    review: state.q.map(([iso, options], idx) => {
      const [chosenIdx = -1, ok = 0] = state.a[idx] ?? [];
      const chosenIso = options[chosenIdx] ?? iso;
      return { flagUrl: flagUrlFor(iso, now), correct: ok === 1, country: revealCountry(must(iso)), chosen: must(chosenIso).name };
    }),
  };
}
