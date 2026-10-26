import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { countryRows, indistinguishablePairs, lookalikeGroups } from "../../data/countries";
import { checkSanitizedSvg, sanitizeFlagSvg } from "../../scripts/lib/sanitize-svg";
import { UN_MEMBER_CODES } from "../../scripts/lib/un-members";
import { validateDataset } from "../../scripts/lib/validate-dataset";
import generated from "@/server/data/countries.json";
import flags from "@/server/data/flags.json";

const flagFile = (iso: string) => join(process.cwd(), "node_modules/flag-icons/flags/4x3", `${iso.toLowerCase()}.svg`);
const opts = {
  unMembers: UN_MEMBER_CODES,
  flagExists: (iso: string) => existsSync(flagFile(iso)),
  lookalikeGroups,
  indistinguishablePairs,
  minPerDifficulty: 15,
};

describe("country dataset", () => {
  it("is valid: 193 UN members, unique codes and names, both languages, valid difficulty, flags present", () => {
    const report = validateDataset(countryRows, opts);
    expect(report.errors).toEqual([]);
    expect(report.counts.total).toBe(193);
  });

  it("catches duplicates, bad values and missing members", () => {
    const first = countryRows[0];
    if (!first) throw new Error("empty dataset");
    const broken = [...countryRows.slice(1), [...first], [...first]] as typeof countryRows;
    broken.push(["XX", "atlantis" as never, "impossible" as never, "", "", "", "", "", ""]);
    const report = validateDataset(broken, opts);
    expect(report.errors.join("\n")).toMatch(/duplicate iso2/);
    expect(report.errors.join("\n")).toMatch(/not a UN member/);
    expect(report.errors.join("\n")).toMatch(/invalid continent/);
    expect(report.errors.join("\n")).toMatch(/invalid difficulty/);
    expect(report.errors.join("\n")).toMatch(/empty name_he/);
    const missing = validateDataset(countryRows.slice(1), opts);
    expect(missing.errors.join("\n")).toMatch(new RegExp(`missing UN member state: ${first[0]}`));
  });

  it("generated runtime files are in sync with the source (run `npm run data:import` if this fails)", () => {
    expect(generated.countries.map((c) => c.iso2)).toEqual(countryRows.map((r) => r[0]));
    expect(Object.keys(flags).sort()).toEqual(countryRows.map((r) => r[0]).sort());
    for (const row of countryRows) {
      const fresh = sanitizeFlagSvg(readFileSync(flagFile(row[0]), "utf8"));
      expect((flags as Record<string, string>)[row[0]], row[0]).toBe(fresh);
    }
  });
});

describe("flag sanitizer", () => {
  it("removes every identifying id and class and keeps references consistent", () => {
    const input = `<?xml version="1.0"?><!-- jp --><svg id="flag-icons-jp" viewBox="0 0 640 480"><title>Japan</title><defs><clipPath id="jp-a"><path d="M0 0h1"/></clipPath></defs><g clip-path="url(#jp-a)" class="jp-st1 other"><use href="#jp-a"/></g></svg>`;
    const out = sanitizeFlagSvg(input);
    expect(out).not.toMatch(/jp|Japan|flag-icons/i);
    expect(out).toContain('id="f0"');
    expect(out).toContain("url(#f0)");
    expect(out).toContain('href="#f0"');
    expect(checkSanitizedSvg(out, "JP")).toEqual({ ok: true, problems: [] });
  });

  it("flags unsafe content", () => {
    const bad = `<svg viewBox="0 0 1 1" onload="x()"><script>x()</script><image href="https://evil.example/a.png"/></svg>`;
    const res = checkSanitizedSvg(bad, "ZZ");
    expect(res.ok).toBe(false);
    expect(res.problems.join(" ")).toMatch(/script/);
    expect(res.problems.join(" ")).toMatch(/event handler/);
    expect(res.problems.join(" ")).toMatch(/external reference/);
  });
});
