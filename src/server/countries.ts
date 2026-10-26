import "server-only";
import { buildRelation, type SelectionContext } from "@/lib/game/selection";
import type { Country, CountryReveal } from "@/lib/game/types";
import data from "./data/countries.json";

/**
 * Server-side country repository. Phase 2 reads the generated dataset; Phase 3 swaps the source for the
 * `countries` table without changing callers.
 */
const countries = data.countries as Country[];
const byIso = new Map(countries.map((c) => [c.iso2, c]));

export const selectionContext: SelectionContext = {
  countries,
  lookalikes: buildRelation(data.lookalikeGroups),
  indistinguishable: buildRelation(data.indistinguishablePairs),
};

export function getCountry(iso2: string): Country | undefined {
  return byIso.get(iso2);
}

export function revealCountry(c: Country): CountryReveal {
  return { iso2: c.iso2, continent: c.continent, name: c.name, capital: c.capital, fact: c.fact };
}

export function countryCount(): number {
  return countries.length;
}
