export type Continent = "africa" | "asia" | "europe" | "north-america" | "south-america" | "oceania";
export type DifficultyLevel = "easy" | "medium" | "hard";

/** [iso2, continent, difficulty, name_en, name_he, capital_en, capital_he, fact_en, fact_he] */
export type CountryRow = [
  iso2: string,
  continent: Continent,
  difficulty: DifficultyLevel,
  nameEn: string,
  nameHe: string,
  capitalEn: string,
  capitalHe: string,
  factEn: string,
  factHe: string,
];
