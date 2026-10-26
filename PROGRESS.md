# FLAGFORGE — Progress

_Last updated: 2026-10-26 (end of Phase 2)_

## Environment notes (build session)

- Built in a cloud sandbox. **Docker Hub is blocked there**, so `supabase start` cannot run in that sandbox.
  Plan for Phases 3–6: run migrations/RLS/anti-cheat integration tests against native PostgreSQL 16 with a
  minimal `auth` schema shim (`auth.users`, `auth.uid()`, `anon`/`authenticated` roles). Full Supabase Auth
  flows (email verification, recovery) must be verified against a real Supabase project.
- Google Fonts and Wikimedia are blocked from the sandbox; fonts are self-hosted via `@fontsource` (OFL-1.1).
- The project is synced to the user's linked folder at the end of each phase (no remote shell on that machine).

## Phase checklist

| Phase | Status |
|---|---|
| 1 — Foundation & design system | ✅ complete |
| 2 — Country dataset & standard game | ✅ complete (verified, see below) |
| 3 — Supabase & authentication | ⏳ next — needs a Supabase project from the user |
| 4 — Daily challenge | ⏳ |
| 5 — Profiles, achievements, rankings | ⏳ |
| 6 — Administration & operational readiness | ⏳ |
| 7 — Production readiness & deployment | ⏳ |

## Decisions (from the product owner)

- Dataset scope: the 193 UN member states only.
- Flag artwork: 4:3 canvas (flag-icons, MIT) is acceptable; real-world proportions not preserved.
- Daily challenge: authenticated users only. Guests play standard games only.

## Phase 2 — verified

- [x] Dataset: 193 UN members (40 easy / 70 medium / 83 hard), en/he names, capitals, continent, one fact each in
      both languages — `data/countries/*.ts`; validated against an independent UN reference list
- [x] Import script validates codes, uniqueness (codes, en names, he names), Hebrew text, difficulty, continent,
      flag presence, lookalike references; `--check` mode for CI
- [x] Flags: sanitized so ids/classes no longer contain the ISO code; **all 193 pixel-identical** to the originals
- [x] Engine: 10 distinct questions per difficulty; 4 distinct options, exactly one correct; plausible distractors
      (lookalikes → continent → difficulty); indistinguishable pairs (TD/RO, ID/MC) never together
- [x] Server-authoritative: AES-256-GCM encrypted game token (HKDF-derived key, purpose-bound AAD); opaque,
      expiring flag URLs; correctness, timing and score computed on the server; no ISO code in any client payload
- [x] Route handlers with strict Zod schemas, 8 KiB body cap, per-IP rate limits, typed error codes, no stack traces
- [x] UI: atlas-plate flag, 4 large options, progress ticks, monotonic display timer, reveal with capital,
      continent and fact, results with review of all 10 flags; keyboard 1–4 + Enter; focus management; aria-live
- [x] Mobile: options fit on screen without scrolling on iPhone SE (568px), iPhone 13, Pixel 7 (tab bar hidden
      during a game); 16px gutters at 320px
- [x] Language switch mid-game keeps the current question (verified e2e)

### Check results

| Command | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm test` | 46/46 pass |
| `npm run data:check` | pass |
| `npm run build` | pass |
| `npm run test:e2e` | 49 pass, 5 skipped (viewport-specific), desktop + Pixel 7 |

## Known limitations

- Guest game tokens can be replayed (stateless by design; guest results are not stored). See `docs/API.md`.
- Rate limiting is in-memory per server instance.
- CSP header for pages deferred to Phase 3 (needs the Supabase origin).

## Next steps (Phase 3)

1. User creates a Supabase project and provides URL + anon key (service-role key goes only into `.env.local` / Vercel).
2. Migrations: profiles, countries (seeded from `data/countries`), game_sessions, game_session_questions, roles; RLS.
3. Auth flows (register with username, verify email, login/logout, forgot/reset), protected routes, locale sync.
4. Authenticated standard games persisted in the database (single-use answers per question).
5. Native-Postgres test harness with an `auth` shim for RLS/constraint integration tests.
