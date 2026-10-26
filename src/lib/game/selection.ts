import type { Difficulty } from "@/config/game";
import { shuffle, weightedSample, type Rng } from "./rng";
import type { Country } from "./types";

export interface SelectionContext {
  countries: readonly Country[];
  /** iso2 → set of easily-confused iso2 codes */
  lookalikes: ReadonlyMap<string, ReadonlySet<string>>;
  /** iso2 → set of codes that must never share a question with it */
  indistinguishable: ReadonlyMap<string, ReadonlySet<string>>;
}

export function buildRelation(groups: readonly (readonly string[])[]): Map<string, Set<string>> {
  const rel = new Map<string, Set<string>>();
  for (const group of groups) {
    for (const a of group) {
      for (const b of group) {
        if (a === b) continue;
        if (!rel.has(a)) rel.set(a, new Set());
        rel.get(a)?.add(b);
      }
    }
  }
  return rel;
}

/** Picks `count` distinct countries of the given difficulty for a standard game. */
export function selectQuestionCountries(ctx: SelectionContext, difficulty: Difficulty, count: number, rng: Rng): Country[] {
  const pool = ctx.countries.filter((c) => c.difficulty === difficulty);
  if (pool.length < count) throw new Error(`Not enough '${difficulty}' countries (${pool.length}) for ${count} questions`);
  return shuffle(pool, rng).slice(0, count);
}

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
const LOOKALIKE_WEIGHT: Record<Difficulty, number> = { easy: 2, medium: 6, hard: 10 };

/**
 * Chooses three plausible, unambiguous distractors for `correct`.
 * Weighting favours easily-confused flags (more strongly at higher difficulty), then the same continent,
 * then a similar difficulty. Indistinguishable flags are excluded so every question has exactly one right answer.
 */
export function chooseDistractors(ctx: SelectionContext, correct: Country, difficulty: Difficulty, rng: Rng): Country[] {
  const look = ctx.lookalikes.get(correct.iso2);
  const banned = ctx.indistinguishable.get(correct.iso2);
  const candidates = ctx.countries.filter((c) => c.iso2 !== correct.iso2 && !banned?.has(c.iso2));
  const weight = (c: Country) => {
    let w = c.continent === correct.continent ? 6 : 1;
    if (Math.abs(DIFFICULTY_RANK[c.difficulty] - DIFFICULTY_RANK[correct.difficulty]) <= 1) w *= 1.5;
    if (look?.has(c.iso2)) w += LOOKALIKE_WEIGHT[difficulty];
    return w;
  };
  const picked: Country[] = [];
  // Sample one at a time so distractors are also never indistinguishable from each other.
  while (picked.length < 3) {
    const remaining = candidates.filter(
      (c) => !picked.includes(c) && !picked.some((p) => ctx.indistinguishable.get(p.iso2)?.has(c.iso2)),
    );
    const [next] = weightedSample(remaining, weight, 1, rng);
    if (!next) throw new Error(`Could not find enough distractors for ${correct.iso2}`);
    picked.push(next);
  }
  return picked;
}

/** Returns the four options in display order and the index of the correct one. */
export function buildOptions(ctx: SelectionContext, correct: Country, difficulty: Difficulty, rng: Rng): { options: Country[]; correctIndex: number } {
  const options = shuffle([correct, ...chooseDistractors(ctx, correct, difficulty, rng)], rng);
  return { options, correctIndex: options.indexOf(correct) };
}
