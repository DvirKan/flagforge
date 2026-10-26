import type { CountryRow } from "../../data/countries/types";

const CONTINENTS = new Set(["africa", "asia", "europe", "north-america", "south-america", "oceania"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

export interface DatasetReport {
  errors: string[];
  counts: { total: number; easy: number; medium: number; hard: number };
}

const norm = (s: string) => s.normalize("NFC").trim().toLocaleLowerCase();

export function validateDataset(
  rows: CountryRow[],
  opts: {
    unMembers: Set<string>;
    flagExists: (iso2: string) => boolean;
    lookalikeGroups: string[][];
    indistinguishablePairs: [string, string][];
    minPerDifficulty: number;
  },
): DatasetReport {
  const errors: string[] = [];
  const seenIso = new Set<string>();
  const seenEn = new Map<string, string>();
  const seenHe = new Map<string, string>();
  const counts = { total: rows.length, easy: 0, medium: 0, hard: 0 };

  rows.forEach((row, index) => {
    const [iso, continent, difficulty, nameEn, nameHe, capitalEn, capitalHe, factEn, factHe] = row;
    const where = `row ${index + 1} (${iso})`;
    if (!/^[A-Z]{2}$/.test(iso)) errors.push(`${where}: iso2 must be two uppercase letters`);
    if (seenIso.has(iso)) errors.push(`${where}: duplicate iso2`);
    seenIso.add(iso);
    if (!opts.unMembers.has(iso)) errors.push(`${where}: not a UN member state`);
    if (!CONTINENTS.has(continent)) errors.push(`${where}: invalid continent '${continent}'`);
    if (!DIFFICULTIES.has(difficulty)) errors.push(`${where}: invalid difficulty '${difficulty}'`);
    else counts[difficulty] += 1;
    for (const [label, value] of [
      ["name_en", nameEn],
      ["name_he", nameHe],
      ["capital_en", capitalEn],
      ["capital_he", capitalHe],
      ["fact_en", factEn],
      ["fact_he", factHe],
    ] as const) {
      if (!value || !value.trim()) errors.push(`${where}: empty ${label}`);
    }
    if (/[A-Za-z]{3,}/.test(nameHe.replace(/AK-47|Ecuador|\.tv/g, ""))) errors.push(`${where}: name_he contains Latin text`);
    if (!/[֐-׿]/.test(nameHe)) errors.push(`${where}: name_he has no Hebrew characters`);
    if (!/[֐-׿]/.test(factHe)) errors.push(`${where}: fact_he has no Hebrew characters`);
    const en = norm(nameEn);
    const he = norm(nameHe);
    if (seenEn.has(en)) errors.push(`${where}: duplicate English name (also ${seenEn.get(en)})`);
    if (seenHe.has(he)) errors.push(`${where}: duplicate Hebrew name (also ${seenHe.get(he)})`);
    seenEn.set(en, iso);
    seenHe.set(he, iso);
    if (!opts.flagExists(iso)) errors.push(`${where}: missing flag asset`);
  });

  for (const code of opts.unMembers) {
    if (!seenIso.has(code)) errors.push(`missing UN member state: ${code}`);
  }
  for (const group of opts.lookalikeGroups) {
    for (const code of group) if (!seenIso.has(code)) errors.push(`lookalike group references unknown code ${code}`);
  }
  for (const [a, b] of opts.indistinguishablePairs) {
    if (!seenIso.has(a) || !seenIso.has(b)) errors.push(`indistinguishable pair references unknown code ${a}/${b}`);
  }
  for (const d of ["easy", "medium", "hard"] as const) {
    if (counts[d] < opts.minPerDifficulty) errors.push(`only ${counts[d]} '${d}' countries; need ≥ ${opts.minPerDifficulty}`);
  }
  return { errors, counts };
}
