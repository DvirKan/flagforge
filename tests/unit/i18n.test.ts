import { describe, expect, it } from "vitest";
import en from "@/messages/en";
import he from "@/messages/he";
import { directionOf, negotiateLocale } from "@/lib/i18n/config";
import { createTranslator, formatMessage } from "@/lib/i18n/translate";

function leafKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj === "string") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) => leafKeys(v, prefix ? `${prefix}.${k}` : k));
}

function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "").sort();
}

describe("dictionaries", () => {
  it("have identical key sets", () => {
    expect(leafKeys(he).sort()).toEqual(leafKeys(en).sort());
  });

  it("use the same placeholders in both languages", () => {
    const t = createTranslator(en);
    const tHe = createTranslator(he);
    for (const key of leafKeys(en)) {
      // @ts-expect-error — dynamic key from the runtime walk
      expect(placeholders(tHe(key)), key).toEqual(placeholders(t(key)));
    }
  });

  it("contain no empty strings", () => {
    for (const dict of [en, he]) {
      const t = createTranslator(dict);
      // @ts-expect-error — dynamic key
      for (const key of leafKeys(dict)) expect(t(key).trim().length, key).toBeGreaterThan(0);
    }
  });
});

describe("formatMessage", () => {
  it("interpolates known variables and leaves unknown ones visible", () => {
    expect(formatMessage("{count} questions", { count: 10 })).toBe("10 questions");
    expect(formatMessage("Hello {name}", {})).toBe("Hello {name}");
  });
});

describe("negotiateLocale", () => {
  it("respects quality values and legacy tags", () => {
    expect(negotiateLocale("he-IL,he;q=0.9,en;q=0.8")).toBe("he");
    expect(negotiateLocale("fr-FR,en;q=0.5,he;q=0.4")).toBe("en");
    expect(negotiateLocale("en;q=0.3,he;q=0.9")).toBe("he");
    expect(negotiateLocale("iw")).toBe("he");
    expect(negotiateLocale("de")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });

  it("maps direction", () => {
    expect(directionOf("he")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });
});
