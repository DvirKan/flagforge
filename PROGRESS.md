# FLAGFORGE — Progress

_Last updated: 2026-10-27 (end of Phase 4)_

## Environment notes (build session)

- Built in a cloud sandbox: Docker Hub, GitHub and Go modules are blocked there, so neither `supabase start` nor a
  local GoTrue/PostgREST can run. Database logic is tested on native PostgreSQL 16 with
  `supabase/tests/local-shim.sql`; auth was smoke-tested against the real Supabase project (publishable key only).
- The sandbox cannot hold the Supabase secret key (by design), so `npm run test:e2e:auth` must be run on the
  developer's machine.
- Syncing to the developer's machine: the file bridge cannot write `.git` or `.env*`, so each phase is delivered
  as `flagforge.bundle` (`git pull .\flagforge.bundle main`).

## Phase checklist

| Phase | Status |
|---|---|
| 1 — Foundation & design system | ✅ complete |
| 2 — Country dataset & standard game | ✅ complete |
| 3 — Supabase & authentication | ✅ complete (verified against the real project) |
| 4 — Daily challenge | ✅ complete (verified against the real project) |
| 5 — Profiles, achievements, rankings | ⏳ next |
| 6 — Administration & operational readiness | ⏳ |
| 7 — Production readiness & deployment | ⏳ |

## Decisions (product owner)

- Dataset: the 193 UN member states. Flags: 4:3 canvas (flag-icons, MIT).
- Daily challenge: signed-in users only. Guests play standard games only, nothing saved.

## Phase 3 — verified

- [x] Migrations (4 files): profiles + signup trigger + username rules + public view, roles, countries (+ generated
      data), persisted standard games with service-role-only functions — see docs/DATABASE.md
- [x] RLS on every table; Supabase default grants revoked and re-granted minimally
- [x] 23 database integration tests: constraints, RLS isolation, column-level update limits, no client writes,
      single-use ordered answers, **concurrent submissions → exactly one accepted**, SQL/TS score parity,
      cascade on account deletion, privilege audit (RLS everywhere; only `username_available` callable by anon)
- [x] Server game service ↔ database tests (full game persisted, replayed token rejected, token bound to user)
- [x] Auth: register (username availability, no account enumeration), email verification (`/auth/confirm`
      supports token_hash and PKCE code), login (+ resend confirmation), logout, forgot/reset password,
      open-redirect-safe `next`, per-IP rate limits on auth actions
- [x] Protected routes (server-side): /profile, /settings → login; /admin → DB role check, 404 for non-admins
- [x] Settings: username/display name (RLS update), language (synced to profile), password, account deletion
      (admin API, cascades all data)
- [x] Signed-in games saved; results say "Saved to your profile"; profile shows real completed games
- [x] CSP header (self + Supabase origin), plus previous security headers
- [x] Real-project smoke test: wrong password → "Email or password is incorrect"; reset request → neutral message

### Check results (sandbox)

| Command | Result |
|---|---|
| `npm run typecheck` / `lint` | pass |
| `npm test` | 58 pass (23 DB tests skipped without TEST_DATABASE_URL) |
| `npm run test:db` | 23/23 pass (PostgreSQL 16) |
| `npm run build` | pass (guest-only and Supabase-configured builds) |
| `npm run test:e2e` | 49 pass, 5 skipped (viewport-specific) |
| `npm run test:e2e:auth` | **6/6 pass** on the dev machine against the real Supabase project (2026-10-27) |

## Done on the developer machine

- Migrations applied with `supabase db push` (4 migrations); verified remotely: 193 countries, anon blocked from
  `profiles` and `start_standard_game`.
- `npm run test:e2e:auth`: 6/6 pass (first run exposed two test-selector bugs, fixed in 820a474).
- Still recommended before real sign-ups: dashboard URL configuration + email templates (docs/SUPABASE.md §3).

Sync note: each update is delivered as a uniquely named bundle (`flagforge-<commit>.bundle`); overwriting the same
file name through the bridge did not replace its contents.

## Known limitations

- Guest game tokens can be replayed (stateless; guest results are never stored).
- Rate limiting is in-memory per server instance (database also caps 60 games/hour per user).
- Built-in Supabase email sender is dev-only; production needs SMTP (docs/SUPABASE.md §4).
- `script-src 'unsafe-inline'` in CSP (Next.js inline bootstrap); nonce-based CSP is a possible Phase 7 hardening.

## Phase 4 — verified (sandbox)

- [x] Migration `20261027100400_daily_challenges.sql` — see docs/DAILY.md
- [x] DB tests: publish valid / refuse 5 kinds of invalid challenge, one per date, immutability after publish,
      unpublish rules, client cannot read questions/options or write attempts, idempotent start (4 concurrent
      starts → 1 attempt), ordered single answers (4 concurrent → 1), completion + server elapsed time, ranking
      (perfect first, time, completion tie-break, incomplete excluded, only public fields)
- [x] Service ↔ DB test: full attempt, refresh resumes with the same start time, replayed token rejected,
      token bound to user, result on the board
- [x] Generator: composition and order, distinct countries, 4 valid options, avoids recent flags
- [x] UI: /daily (rules, state-aware action, countdown, standings), /daily/play (focused, auto-start/resume,
      server-anchored clock, 0.9 s feedback, result + review), real daily tab on /leaderboards with day
      navigation, home page shows live status and today's top 5
- [x] `daily:prepare` / `daily:validate` scripts
- [x] Real project: migration applied, 14 challenges published (2026-10-27 → 11-09), `daily:validate` clean,
      `test:e2e:auth` 8/8 pass (incl. daily attempt + refresh resume + guest block)

Check results: typecheck/lint pass · unit 61 · DB 41/41 · e2e (guest) 49 pass / 5 skipped.

## Phase 5 — verified (sandbox)

- [x] Migration `20261027100600_progress.sql` — see docs/PROGRESS_LAYER.md
- [x] Weekly/monthly Hall of Fame: `period_leaderboard` (perfect count → combined time), Monday weeks,
      period navigation, "still in play" for the current period
- [x] Statistics split standard/daily, current + longest streak, discovered countries (`my_stats`,
      `my_discovered_countries` via auth.uid())
- [x] 11 achievements as data, awarded by completion triggers, never twice (PK), backfill; celebration on
      results screens (standard + daily)
- [x] /profile (streak, stats, atlas + achievements cards), /achievements, /map (server-rendered Natural
      Earth map, 35 dot states, detail panel, filterable accessible list)
- [x] Tests: periods unit (6), DB progress (14: ranking, period bounds, anon access, streaks, stats, discovery,
      triggers, no duplicates, thresholds, since-start, RLS/privileges), service tests assert new achievements,
      e2e atlas (guest) + auth e2e "finishing a game updates stats, achievements and the atlas"

Check results: typecheck/lint pass · unit 67 · DB 56/56 · e2e (guest) 53 pass / 5 skipped.

To do on the developer machine: `npx supabase db push` (migration 100600), `npm run build`,
`npm run test:e2e:auth` (now 9 tests).

## Next steps (Phase 6)

Admin area: challenge calendar + validation/publish UI, dataset view, audit log.
