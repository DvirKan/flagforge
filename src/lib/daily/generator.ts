import { gameConfig, type Difficulty } from "@/config/game";
import { shuffle, type Rng } from "@/lib/game/rng";
import { buildOptions, type SelectionContext } from "@/lib/game/selection";

export interface DailyQuestionPayload {
  country: string;
  difficulty: Difficulty;
  options: string[];
}

/** Display order inside a challenge: from easiest to hardest. */
const ORDER: Difficulty[] = ["easy", "medium", "hard"];

/**
 * Generates one daily challenge: the configured composition (default 2 easy, 2 medium, 1 hard), ordered
 * easy → hard, with 4 plausible, unambiguous options per question. Countries in `exclude` (e.g. used on
 * recent days) are avoided while enough alternatives remain.
 */
export function generateDailyChallenge(
  ctx: SelectionContext,
  rng: Rng,
  opts: { exclude?: ReadonlySet<string>; composition?: Record<Difficulty, number> } = {},
): DailyQuestionPayload[] {
  const composition = opts.composition ?? gameConfig.daily.composition;
  const total = ORDER.reduce((n, d) => n + composition[d], 0);
  if (total !== gameConfig.daily.length) throw new Error(`Composition must total ${gameConfig.daily.length} questions, got ${total}`);
  const exclude = opts.exclude ?? new Set<string>();
  const questions: DailyQuestionPayload[] = [];
  for (const difficulty of ORDER) {
    const need = composition[difficulty];
    const pool = ctx.countries.filter((c) => c.difficulty === difficulty);
    const fresh = pool.filter((c) => !exclude.has(c.iso2));
    const source = fresh.length >= need ? fresh : pool;
    for (const country of shuffle(source, rng).slice(0, need)) {
      const { options } = buildOptions(ctx, country, difficulty, rng);
      questions.push({ country: country.iso2, difficulty, options: options.map((o) => o.iso2) });
    }
  }
  return questions;
}
