# FLAGFORGE

A competitive, bilingual (English/Hebrew) flag-identification game: standard games, a server-validated
daily five-flag challenge, leaderboards, achievements and a personal world atlas.

> Status: **Phase 1 of 7** complete — see [`PROGRESS.md`](./PROGRESS.md). The full setup and deployment
> guide (Supabase, migrations, email, Vercel) is written as those phases land.

## Stack

Next.js 15.5 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Zod · Supabase (Phase 3+) ·
Vitest · Playwright

## Local development (Windows + VS Code)

Prerequisites: Node.js 22 LTS (`node -v` ≥ 20.9), npm, Git, VS Code.

```powershell
git clone <your-repo-url> flagforge
cd flagforge
npm ci
Copy-Item .env.example .env.local    # PowerShell (bash: cp .env.example .env.local)
npm run dev                          # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright (builds must exist: run `npm run build` first; first time: `npx playwright install chromium`) |
| `npm run check` | typecheck + lint + unit tests |

## Project layout (so far)

```
src/
  app/                 routes (server components by default)
  components/          layout/, ui/, game/, daily/, auth/
  config/              brand.ts (rename the product here), game.ts (rules: lengths, composition, timezone)
  lib/i18n/            locale negotiation, typed translator, server/client access, switcher action
  lib/time/            DST-safe Asia/Jerusalem calendar helpers
  messages/            en.ts (canonical shape), he.ts (type-checked against en)
tests/unit, tests/e2e
```

## Design notes

- "Modern Atlas": parchment/paper surfaces, ink navy, restrained rust accent, hairline rules, graticule texture.
- Fonts are self-hosted from `@fontsource` (all SIL OFL 1.1): Frank Ruhl Libre, IBM Plex Sans, IBM Plex Sans Hebrew, IBM Plex Mono.
- Layout uses CSS logical properties so Hebrew (RTL) and English (LTR) share one set of components.
