import { describe, expect, it } from "vitest";
import { accuracyPct, answerPoints, BASE_POINTS, isPerfect, MAX_SPEED_BONUS, performanceTier } from "@/lib/game/scoring";

describe("scoring", () => {
  it("awards nothing for a wrong answer, however fast", () => {
    expect(answerPoints(false, 0)).toBe(0);
  });
  it("awards base + full bonus for an instant answer, base only after the window", () => {
    expect(answerPoints(true, 0)).toBe(BASE_POINTS + MAX_SPEED_BONUS);
    expect(answerPoints(true, 15_000)).toBe(BASE_POINTS);
    expect(answerPoints(true, 120_000)).toBe(BASE_POINTS);
    expect(answerPoints(true, 7_500)).toBe(BASE_POINTS + 25);
  });
  it("clamps negative durations", () => {
    expect(answerPoints(true, -500)).toBe(BASE_POINTS + MAX_SPEED_BONUS);
  });
  it("computes accuracy", () => {
    expect(accuracyPct(7, 10)).toBe(70);
    expect(accuracyPct(2, 3)).toBe(67);
    expect(accuracyPct(0, 0)).toBe(0);
  });
  it("detects perfect results", () => {
    expect(isPerfect(5, 5)).toBe(true);
    expect(isPerfect(4, 5)).toBe(false);
    expect(isPerfect(0, 0)).toBe(false);
  });
  it("maps tiers", () => {
    expect(performanceTier(100)).toBe("cartographer");
    expect(performanceTier(80)).toBe("navigator");
    expect(performanceTier(79)).toBe("explorer");
    expect(performanceTier(50)).toBe("explorer");
    expect(performanceTier(49)).toBe("apprentice");
  });
});
