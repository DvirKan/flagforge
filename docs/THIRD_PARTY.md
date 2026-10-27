# Third-party assets

## flag-icons — MIT License

Flag artwork in `src/server/data/flags.json` is derived (sanitized, ids renamed) from flag-icons v7.6.0.

```
The MIT License (MIT)

Copyright (c) 2013 Panayiotis Lipiridis

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of
the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## Map data and libraries (build time only)

- **Natural Earth** admin-0 countries — public domain (naturalearthdata.com), via
  **world-atlas** 2.0.2 (ISC, © Mike Bostock). Used by `scripts/build-atlas.ts` to generate `src/data/atlas.json`.
- **topojson-client** 3.1.0 (ISC), **d3-geo** 3.1.1 (ISC) — conversion and projection at build time.
- **i18n-iso-countries** 7.14.0 (MIT) — ISO 3166 numeric → alpha-2 mapping at build time.

None of these ship to the browser; the generated path data does.

## Fonts — SIL Open Font License 1.1

Self-hosted via `@fontsource`: Rubik (headings and text, Hebrew + Latin), IBM Plex Mono (numbers).

## Country names, capitals and facts

Written for this project (`data/countries/*.ts`). Country names and capitals are factual data.
