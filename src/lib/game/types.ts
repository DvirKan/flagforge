import type { Difficulty } from "@/config/game";

export type Continent = "africa" | "asia" | "europe" | "north-america" | "south-america" | "oceania";

export interface Localized {
  en: string;
  he: string;
}

export interface Country {
  iso2: string;
  continent: Continent;
  difficulty: Difficulty;
  name: Localized;
  capital: Localized;
  fact: Localized;
}

/** What the client sees for a question before answering. Contains no information that identifies the answer. */
export interface QuestionView {
  index: number; // 0-based
  total: number;
  flagUrl: string; // opaque, encrypted handle
  options: { name: Localized }[]; // always 4, in display order
}

/** Revealed after an answer is submitted. */
export interface CountryReveal {
  iso2: string;
  continent: Continent;
  name: Localized;
  capital: Localized;
  fact: Localized;
}

export type PerformanceTier = "cartographer" | "navigator" | "explorer" | "apprentice";

export interface GameSummary {
  difficulty: Difficulty;
  correct: number;
  total: number;
  accuracyPct: number;
  elapsedMs: number;
  score: number;
  tier: PerformanceTier;
  /** true when the result was saved to the player's profile (signed-in games) */
  persisted: boolean;
  review: { flagUrl: string; correct: boolean; country: CountryReveal; chosen: Localized }[];
  /** achievements awarded by this game (signed-in games only) */
  newAchievements?: EarnedAchievement[];
}

export interface EarnedAchievement {
  code: string;
  name: Localized;
  iconKey: string | null;
}

export interface AnswerResult {
  correct: boolean;
  chosenIndex: number;
  correctIndex: number;
  country: CountryReveal;
}
