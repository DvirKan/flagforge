# Country dataset

## Scope

The game uses exactly the **193 UN member states**. Observer states (Vatican City, Palestine) and
partially recognised states (e.g. Kosovo, Taiwan) are not included. Dependent territories are not included.

`scripts/lib/un-members.ts` holds an independent reference list of the 193 ISO 3166-1 alpha-2 codes; the import
script fails if the dataset adds a code outside it or misses one in it.

## Source of truth

`data/countries/*.ts` — one row per country:

| Field | Notes |
|---|---|
| `iso2` | ISO 3166-1 alpha-2, uppercase. Stable internal ID (Phase 3 adds a UUID primary key alongside it). |
| `continent` | `africa`, `asia`, `europe`, `north-america`, `south-america`, `oceania` |
| `difficulty` | `easy` / `medium` / `hard` — a curated game classification, not a prediction for every player |
| `name_en`, `name_he` | Common short names. English follows UN short names where familiar (`Türkiye`, `Czechia`, `Côte d'Ivoire`). |
| `capital_en`, `capital_he` | The official capital. Where it differs from the seat of government, the fact says so (Benin, Bolivia, Netherlands, Sri Lanka). Nauru has no official capital; Yaren (government offices) is listed. |
| `fact_en`, `fact_he` | One short, verifiable fact, usually about the flag itself. Written for this project. |

Continent assignment for transcontinental states: **Russia → Europe**, **Türkiye → Asia**, **Cyprus → Europe**,
**Georgia, Armenia, Azerbaijan, Kazakhstan → Asia**, **Egypt → Africa**. Central America and the Caribbean →
North America.

Current distribution: **40 easy, 70 medium, 83 hard**.

## Distractors and ambiguity

`lookalikeGroups` (in `data/countries/index.ts`) lists flags that are easily confused — e.g. Chad/Romania/Moldova/
Andorra, Netherlands/Luxembourg/Russia, Australia/New Zealand. The option builder weights these, then the same
continent, then a similar difficulty, so distractors are plausible.

`indistinguishablePairs` lists flags that are visually identical at the game's 4:3 rendering —
**Chad/Romania** (shade of blue only) and **Indonesia/Monaco** (proportions only). They never share a question,
so every question has exactly one defensible answer.

## Flag artwork

- Source: [flag-icons](https://github.com/lipis/flag-icons) v7.6.0, **MIT licence** (© Panayiotis Lipiridis and
  contributors). See `docs/THIRD_PARTY.md`.
- All flags use the library's **4:3** canvas. Flags are shown uncropped (`object-contain`); real-world proportions
  (e.g. Nepal, Qatar, Switzerland) are not preserved — an explicit product decision.
- The import step **sanitizes** every SVG: flag-icons puts the country code in element ids and class names
  (`id="jp-a"`, `class="mr-st1"`), which would leak the answer. All ids/classes are renamed to opaque values and
  references rewritten; comments, `<title>`, `<desc>`, `<metadata>` are removed. The import fails if any
  sanitized SVG still contains the code, a script, an event handler or an external reference.
- Verified: all 193 sanitized SVGs render pixel-identical to the originals (Chromium, 160×120).

## Updating the data

```powershell
# edit data/countries/*.ts, then:
npm run data:import     # validates and regenerates src/server/data/{countries,flags}.json
npm test                # includes a check that the generated files are in sync with the source
```

`npm run data:check` validates without writing (use it in CI).
