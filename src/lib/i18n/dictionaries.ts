import en from "@/messages/en";
import he from "@/messages/he";
import type { Messages } from "@/messages/en";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Messages> = { en, he };

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}
