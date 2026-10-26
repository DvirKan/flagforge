import { describe, expect, it } from "vitest";
import { DIFFICULTIES } from "@/config/game";
import { seededRng, shuffle, weightedSample } from "@/lib/game/rng";
import { buildOptions, buildRelation, chooseDistractors, selectQuestionCountries } from "@/lib/game/selection";
import { selectionContext as ctx } from "@/server/countries";

describe("question selection", () => {
  it.each(DIFFICULTIES)("picks 10 distinct %s countries of that difficulty", (difficulty) => {
    for (let seed = 1; seed <= 50; seed++) {
      const picks = selectQuestionCountries(ctx, difficulty, 10, seededRng(seed));
      expect(picks).toHaveLength(10);
      expect(new Set(picks.map((c) => c.iso2)).size).toBe(10);
      expect(picks.every((c) => c.difficulty === difficulty)).toBe(true);
    }
  });

  it("refuses to build a game longer than the pool", () => {
    expect(() => selectQuestionCountries(ctx, "easy", 1000, seededRng(1))).toThrow();
  });
});

describe("answer options", () => {
  it("always has four distinct valid options with exactly one correct answer (every country, many seeds)", () => {
    const known = new Set(ctx.countries.map((c) => c.iso2));
    for (const country of ctx.countries) {
      for (let seed = 1; seed <= 15; seed++) {
        const { options, correctIndex } = buildOptions(ctx, country, country.difficulty, seededRng(seed * 7919 + country.iso2.charCodeAt(0)));
        expect(options).toHaveLength(4);
        expect(new Set(options.map((o) => o.iso2)).size).toBe(4);
        expect(options.filter((o) => o.iso2 === country.iso2)).toHaveLength(1);
        expect(options[correctIndex]?.iso2).toBe(country.iso2);
        expect(options.every((o) => known.has(o.iso2))).toBe(true);
        // distinct display names in both languages
        expect(new Set(options.map((o) => o.name.en)).size).toBe(4);
        expect(new Set(options.map((o) => o.name.he)).size).toBe(4);
      }
    }
  });

  it("never puts indistinguishable flags in the same question", () => {
    const chad = ctx.countries.find((c) => c.iso2 === "TD");
    const indonesia = ctx.countries.find((c) => c.iso2 === "ID");
    expect(chad && indonesia).toBeTruthy();
    for (let seed = 1; seed <= 500; seed++) {
      for (const c of [chad, indonesia]) {
        if (!c) continue;
        const codes = chooseDistractors(ctx, c, "hard", seededRng(seed)).map((d) => d.iso2);
        if (c.iso2 === "TD") expect(codes).not.toContain("RO");
        if (c.iso2 === "ID") expect(codes).not.toContain("MC");
      }
    }
    // and never as a pair of distractors either
    const mali = ctx.countries.find((c) => c.iso2 === "ML");
    for (let seed = 1; seed <= 500 && mali; seed++) {
      const codes = chooseDistractors(ctx, mali, "hard", seededRng(seed)).map((d) => d.iso2);
      expect(codes.includes("TD") && codes.includes("RO")).toBe(false);
    }
  });

  it("prefers plausible distractors (lookalikes / same continent) on hard", () => {
    const romania = ctx.countries.find((c) => c.iso2 === "RO");
    if (!romania) throw new Error("fixture");
    let plausible = 0;
    let total = 0;
    for (let seed = 1; seed <= 300; seed++) {
      for (const d of chooseDistractors(ctx, romania, "hard", seededRng(seed))) {
        total++;
        if (ctx.lookalikes.get("RO")?.has(d.iso2) || d.continent === romania.continent) plausible++;
      }
    }
    expect(plausible / total).toBeGreaterThan(0.6);
  });
});

describe("rng helpers", () => {
  it("shuffle is a permutation", () => {
    const out = shuffle([1, 2, 3, 4, 5, 6], seededRng(3));
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("weightedSample never returns zero-weight items or duplicates", () => {
    const picks = weightedSample(["a", "b", "c", "d"], (x) => (x === "b" ? 0 : 1), 3, seededRng(9));
    expect(picks).not.toContain("b");
    expect(new Set(picks).size).toBe(3);
  });

  it("buildRelation is symmetric and irreflexive", () => {
    const rel = buildRelation([["A", "B", "C"]]);
    expect(rel.get("A")?.has("B")).toBe(true);
    expect(rel.get("B")?.has("A")).toBe(true);
    expect(rel.get("A")?.has("A")).toBe(false);
  });
});
