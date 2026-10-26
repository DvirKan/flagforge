import type { Difficulty } from "@/config/game";
import type { AnswerResult, GameSummary, QuestionView } from "@/lib/game/types";

export type ApiFailure = "expired" | "rate_limited" | "network" | "invalid";

export interface StartResponse {
  token: string;
  question: QuestionView;
}

export interface AnswerResponse {
  token: string | null;
  result: AnswerResult;
  next: QuestionView | null;
  summary: GameSummary | null;
}

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<{ ok: true; data: T } | { ok: false; failure: ApiFailure }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
      cache: "no-store",
    });
    if (res.ok) return { ok: true, data: (await res.json()) as T };
    if (res.status === 410) return { ok: false, failure: "expired" };
    if (res.status === 429) return { ok: false, failure: "rate_limited" };
    return { ok: false, failure: "invalid" };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { ok: false, failure: "network" };
  }
}

export const startGame = (difficulty: Difficulty, signal?: AbortSignal) => post<StartResponse>("/api/game/start", { difficulty }, signal);
export const submitAnswer = (token: string, choice: number) => post<AnswerResponse>("/api/game/answer", { token, choice });
