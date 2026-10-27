import { describe, expect, it } from "vitest";
import { generateDailyChallenge } from "@/lib/daily/generator";
import { seededRng } from "@/lib/game/rng";
import { selectionContext as ctx } from "@/server/countries";

describe("daily challenge generator", () => {
  it("produces 5 distinct questions: 2 easy, 2 medium, 1 hard, in that order", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const q = generateDailyChallenge(ctx, seededRng(seed));
      expect(q.map((x) => x.difficulty)).toEqual(["easy", "easy", "medium", "medium", "hard"]);
      expect(new Set(q.map((x) => x.country)).size).toBe(5);
      for (const item of q) {
        expect(item.options).toHaveLength(4);
        expect(new Set(item.options).size).toBe(4);
        expect(item.options.filter((o) => o === item.country)).toHaveLength(1);
        expect(ctx.countries.find((c) => c.iso2 === item.country)?.difficulty).toBe(item.difficulty);
      }
    }
  });

  it("avoids excluded countries while alternatives exist", () => {
    const exclude = new Set(ctx.countries.filter((c) => c.difficulty === "easy").slice(0, 30).map((c) => c.iso2));
    for (let seed = 1; seed <= 100; seed++) {
      const q = generateDailyChallenge(ctx, seededRng(seed), { exclude });
      for (const item of q) expect(exclude.has(item.country)).toBe(false);
    }
  });

  it("rejects a composition that does not total 5", () => {
    expect(() => generateDailyChallenge(ctx, seededRng(1), { composition: { easy: 3, medium: 2, hard: 1 } })).toThrow();
  });
});
