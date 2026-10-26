import type { Continent } from "@/lib/game/types";
import type { MessageKey } from "@/lib/i18n/translate";

export const continentKey: Record<Continent, MessageKey> = {
  africa: "continents.africa",
  asia: "continents.asia",
  europe: "continents.europe",
  "north-america": "continents.northAmerica",
  "south-america": "continents.southAmerica",
  oceania: "continents.oceania",
};
