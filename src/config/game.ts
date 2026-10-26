/** Game rules that must stay configurable. Server code reads these; never trust client-sent copies. */
export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}

export const gameConfig = {
  standardGameLength: 10,
  optionsPerQuestion: 4,
  daily: {
    timezone: "Asia/Jerusalem",
    length: 5,
    /** Default composition of a published daily challenge. Must sum to `length`. */
    composition: { easy: 2, medium: 2, hard: 1 } satisfies Record<Difficulty, number>,
  },
} as const;
