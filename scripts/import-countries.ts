/**
 * Validates the canonical dataset in data/countries and generates the runtime files:
 *   src/server/data/countries.json  — country metadata (server-only)
 *   src/server/data/flags.json      — sanitized flag SVG markup keyed by ISO code (server-only)
 *
 * Usage:  npm run data:import          (writes files)
 *         npm run data:import -- --check  (validates only; non-zero exit on any problem)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { countryRows, indistinguishablePairs, lookalikeGroups } from "../data/countries";
import { UN_MEMBER_CODES } from "./lib/un-members";
import { checkSanitizedSvg, sanitizeFlagSvg } from "./lib/sanitize-svg";
import { validateDataset } from "./lib/validate-dataset";

const root = join(__dirname, "..");
const flagDir = join(root, "node_modules", "flag-icons", "flags", "4x3");
const flagPath = (iso: string) => join(flagDir, `${iso.toLowerCase()}.svg`);
const checkOnly = process.argv.includes("--check");

const report = validateDataset(countryRows, {
  unMembers: UN_MEMBER_CODES,
  flagExists: (iso) => existsSync(flagPath(iso)),
  lookalikeGroups,
  indistinguishablePairs,
  minPerDifficulty: 15,
});

const flags: Record<string, string> = {};
for (const [iso] of countryRows) {
  if (!existsSync(flagPath(iso))) continue;
  const svg = sanitizeFlagSvg(readFileSync(flagPath(iso), "utf8"));
  const check = checkSanitizedSvg(svg, iso);
  if (!check.ok) report.errors.push(`${iso}: flag sanitization failed — ${check.problems.join("; ")}`);
  flags[iso] = svg;
}

console.log(`Countries: ${report.counts.total} (easy ${report.counts.easy}, medium ${report.counts.medium}, hard ${report.counts.hard})`);
if (report.errors.length) {
  console.error(`\n${report.errors.length} problem(s):`);
  for (const e of report.errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("Validation passed.");
if (checkOnly) process.exit(0);

const countries = countryRows.map(([iso2, continent, difficulty, nameEn, nameHe, capitalEn, capitalHe, factEn, factHe]) => ({
  iso2,
  continent,
  difficulty,
  name: { en: nameEn, he: nameHe },
  capital: { en: capitalEn, he: capitalHe },
  fact: { en: factEn, he: factHe },
}));

writeFileSync(join(root, "src/server/data/countries.json"), `${JSON.stringify({ countries, lookalikeGroups, indistinguishablePairs }, null, 1)}\n`);
writeFileSync(join(root, "src/server/data/flags.json"), `${JSON.stringify(flags)}\n`);
const bytes = Object.values(flags).reduce((n, s) => n + Buffer.byteLength(s), 0);
console.log(`Wrote countries.json and flags.json (${(bytes / 1024).toFixed(0)} KiB of SVG).`);
