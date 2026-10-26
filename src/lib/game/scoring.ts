import type { PerformanceTier } from "./types";

/** Points for a correct answer, before the speed bonus. */
export const BASE_POINTS = 100;
/** Maximum speed bonus, earned for an instant answer and decaying linearly to zero at BONUS_WINDOW_MS. */
export const MAX_SPEED_BONUS = 50;
export const BONUS_WINDOW_MS = 15_000;

/** Score for one answer: 0 if wrong, otherwise 100 + up to 50 for speed (server-measured response time). */
export function answerPoints(correct: boolean, responseMs: number): number {
  if (!correct) return 0;
  const t = Math.min(Math.max(responseMs, 0), BONUS_WINDOW_MS);
  return BASE_POINTS + Math.round(MAX_SPEED_BONUS * (1 - t / BONUS_WINDOW_MS));
}

/** Accuracy as a whole-number percentage (0 when there are no questions). */
export function accuracyPct(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((correct / total) * 100);
}

export function performanceTier(accuracy: number): PerformanceTier {
  if (accuracy >= 100) return "cartographer";
  if (accuracy >= 80) return "navigator";
  if (accuracy >= 50) return "explorer";
  return "apprentice";
}

export function isPerfect(correct: number, total: number): boolean {
  return total > 0 && correct === total;
}
