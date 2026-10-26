# FLAGFORGE — Progress

_Last updated: 2026-10-26 (end of Phase 1)_

## Environment notes (build session)

- Built in a cloud sandbox. **Docker Hub is blocked there**, so `supabase start` cannot run in that sandbox.
  Plan for Phases 3–6: run migrations/RLS/anti-cheat integration tests against native PostgreSQL 16 with a
  minimal `auth` schema shim (`auth.users`, `auth.uid()`, `anon`/`authenticated` roles). Full Supabase Auth
  flows (email verification, recovery) must be verified against a real Supabase project.
- Google Fonts and Wikimedia are blocked from the sandbox; fonts are self-hosted via `@fontsource` (OFL-1.1),
  which also removes the build-time network dependency on Vercel.

## Phase checklist

| Phase | Status |
|---|---|
| 1 — Foundation & design system | ✅ complete (verified, see below) |
| 2 — Country dataset & standard game | ⏳ next |
| 3 — Supabase & authentication | ⏳ |
| 4 — Daily challenge | ⏳ |
| 5 — Profiles, achievements, rankings | ⏳ |
| 6 — Administration & operational readiness | ⏳ |
| 7 — Production readiness & deployment | ⏳ |

## Phase 1 — verified

- [x] Next.js 15.5.28 (App Router) + React 19.2 + TypeScript 5.9 strict (`noUncheckedIndexedAccess`)
- [x] Tailwind CSS 4 with "Modern Atlas" tokens; text contrast ≥ 4.5:1 (computed; see `globals.css` header)
- [x] Fonts: Frank Ruhl Libre (display), IBM Plex Sans + Plex Sans Hebrew (body), Plex Mono (data) — self-hosted
- [x] i18n: typed en/he dictionaries (missing key = type error), cookie + Accept-Language negotiation,
      server-rendered `lang`/`dir` (no RTL flash), switcher preserves client state (`router.refresh()`)
- [x] Logical CSS properties (`ms-`, `ps-`, `border-s`, `start-`) throughout
- [x] DST-safe Asia/Jerusalem calendar utilities + live countdown to next local midnight (skew-corrected, monotonic)
- [x] Desktop masthead nav, tablet secondary nav, mobile dialog menu + bottom tab bar
- [x] All required routes render; unbuilt features show an explicit "phase N" notice — no sample data
- [x] Security headers (nosniff, DENY framing, HSTS, referrer, permissions policy); `poweredByHeader` off
- [x] `npm audit`: 0 vulnerabilities (postcss pinned via `overrides` to 8.5.31; vitest 5)

### Check results

| Command | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass (0 warnings) |
| `npm test` | 17/17 pass (DST transitions 27 Mar / 25 Oct 2026, i18n key/placeholder parity) |
| `npm run build` | pass (16 routes) |
| `npm run test:e2e` | 42 pass, 4 skipped (viewport-specific), desktop + Pixel 7 |

## Known issues / deferred

- CSP header deferred to Phase 3 (needs the Supabase origin in `connect-src`).
- Language preference is cookie-only until Phase 3 (then mirrored to `profiles.preferred_language`).
- GitHub push pending: the sandbox's GitHub token was invalid; repository is committed locally.

## Next steps (Phase 2)

1. Choose flag source with **true aspect ratios** (candidate: public-domain Wikimedia-derived SVG set via npm/GitHub).
2. Country dataset: 193 UN members (+ decision on observers Vatican/Palestine — documented), en/he names,
   continent, capital, curated difficulty, facts; import + validation script.
3. Server-side standard game engine: session token, question selection, plausible distractors, answer check
   without exposing correct answer up front.
