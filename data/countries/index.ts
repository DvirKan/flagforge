/**
 * Canonical country source — the single source of truth for the game dataset.
 * `npm run data:import` validates this file and generates the runtime JSON (and, from Phase 3, SQL seed data).
 * Scope: the 193 UN member states. See docs/DATASET.md.
 */
import { africa } from "./africa";
import { northAmerica, oceania, southAmerica } from "./americas-oceania";
import { asia } from "./asia";
import { europe } from "./europe";
import type { CountryRow } from "./types";

export const countryRows: CountryRow[] = [...africa, ...asia, ...europe, ...northAmerica, ...southAmerica, ...oceania];

/**
 * Flags that are easily confused. Used to choose plausible distractors.
 * Groups may overlap; membership is symmetric.
 */
export const lookalikeGroups: string[][] = [
  ["TD", "RO", "MD", "AD"],
  ["ID", "MC", "PL", "SG"],
  ["IE", "CI", "IT", "NE", "IN"],
  ["NL", "LU", "RU", "SI", "SK", "RS", "HR", "PY"],
  ["AU", "NZ", "FJ", "TV"],
  ["SN", "ML", "GN", "CM", "GH", "BO", "LT", "ET"],
  ["NO", "IS", "DK", "FI", "SE"],
  ["EG", "YE", "IQ", "SY", "SD"],
  ["VE", "EC", "CO"],
  ["JP", "BD", "PW", "LA"],
  ["HN", "NI", "SV", "GT"],
  ["QA", "BH"],
  ["JO", "SD", "KW", "AE"],
  ["AT", "LV", "LB"],
  ["BE", "DE"],
  ["US", "LR", "MY"],
  ["CU", "GR", "UY"],
  ["KP", "KR"],
  ["MA", "VN", "TR", "TN"],
  ["CZ", "PH", "TL"],
  ["BS", "JM", "TT"],
  ["SO", "FM"],
];

/**
 * Pairs that are visually indistinguishable at the game's 4:3 rendering. They must never appear in the
 * same question — that would make the question ambiguous.
 */
export const indistinguishablePairs: [string, string][] = [
  ["TD", "RO"], // only the shade of blue differs
  ["ID", "MC"], // identical except for proportions, which 4:3 rendering removes
];
