# FLAGFORGE

A competitive, bilingual (English/Hebrew) flag-identification game: standard games, a server-validated
daily five-flag challenge, leaderboards, achievements and a personal world atlas.

> Status: **Phase 4 of 7** complete — see [`PROGRESS.md`](./PROGRESS.md). The full setup and deployment
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
# put a random value in GAME_SESSION_SECRET (command is in .env.example)
# add the Supabase URL + keys, then follow docs/SUPABASE.md (migrations, auth settings)
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
| `npm run data:import` | Validate `data/countries` and regenerate `src/server/data/*.json` |
| `npm run data:check` | Validate only (CI) |
| `npm run data:atlas` | Regenerate the world map paths `src/data/atlas.json` (docs/PROGRESS_LAYER.md) |
| `npm run test:db` | Migrations + RLS + SQL function tests on plain PostgreSQL (`TEST_DATABASE_URL`) |
| `npm run test:e2e:auth` | Auth/persistence e2e against the real Supabase project in `.env.local` |
| `npm run daily:prepare` / `daily:validate` | Generate + publish upcoming daily challenges / check them (docs/DAILY.md) |
| `npm run db:push` / `db:types` | Apply migrations / generate TS types (Supabase CLI, see docs/SUPABASE.md) |

## Project layout (so far)

```
data/countries/        canonical dataset: 193 UN members, en/he names, capitals, facts, difficulty
scripts/               import-countries.ts (+ lib: validator, SVG sanitizer, UN reference list)
docs/                  SUPABASE.md (setup), DAILY.md (daily rules + operations), ADMIN.md (admin area + audit log), DEPLOY.md (GitHub, Vercel, email), SECURITY.md (pre-launch review), DATABASE.md (schema/security), PROGRESS_LAYER.md (rankings, stats, achievements, atlas), DATASET.md, API.md, THIRD_PARTY.md
supabase/              migrations/ (versioned SQL), config.toml, tests/local-shim.sql (test-only)
src/
  app/                 routes (server components by default); app/api/game/* route handlers
  components/          layout/, ui/, game/, daily/, auth/
  config/              brand.ts (rename the product here), game.ts (rules: lengths, composition, timezone)
  lib/i18n/            locale negotiation, typed translator, server/client access, switcher action
  lib/time/            DST-safe Asia/Jerusalem calendar helpers, duration formatting
  lib/game/            pure game rules: selection, distractors, scoring (unit-tested)
  server/              server-only: country repository, AES-GCM tokens, rate limit, game services, generated data
  lib/supabase/        server/admin clients (+ middleware.ts session refresh); lib/auth: actions, session, errors
  messages/            en.ts (canonical shape), he.ts (type-checked against en)
tests/unit, tests/e2e
```

## Design notes

- "Modern Atlas": parchment/paper surfaces, ink navy, restrained rust accent, hairline rules, graticule texture.
- Fonts are self-hosted from `@fontsource` (SIL OFL 1.1): Rubik for all text (Hebrew + Latin), IBM Plex Mono for numbers.
- Layout uses CSS logical properties so Hebrew (RTL) and English (LTR) share one set of components.
