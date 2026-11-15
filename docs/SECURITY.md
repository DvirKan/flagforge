# Security review (pre-launch)

Reviewed before the first production deploy. ✅ = verified (test or inspection), ⚠️ = accepted limitation.

## Secrets
- ✅ Only the publishable key and the Supabase URL are `NEXT_PUBLIC_*`. `SUPABASE_SECRET_KEY` and
  `GAME_SESSION_SECRET` are server-only; the admin client throws if a secret is ever given a `NEXT_PUBLIC_` name,
  and `server-only` modules fail the build if imported by client code.
- ✅ `.env*` files are git-ignored; no keys in the repository (`git grep sb_secret_` → documentation only).
- ✅ CI needs no secrets; the weekly challenge workflow reads the secret key from GitHub Actions secrets and
  passes its one input through an environment variable (no shell interpolation).
- ✅ `npm audit`: 0 vulnerabilities (production and development dependencies).

## Data access (Supabase)
- ✅ RLS on every table; clients read only their own rows, public views expose username/display name only.
- ✅ All writes that matter (games, daily attempts, achievements, admin) go through `SECURITY DEFINER`
  functions with `search_path = ''`, executable by `service_role` only. A privileges test fails if any new
  function becomes callable by `anon` (allowed: `daily_leaderboard`, `period_leaderboard`, `username_available`).
- ✅ The service role is used only on the server, with the user id taken from the verified session
  (`getVerifiedUserId`), never from the request body.
- ✅ Answers are never sent before they are given: questions reference flags through opaque, expiring handles;
  guest game state is AES-256-GCM sealed; signed-in and daily state lives in the database.
- ✅ Timing is measured by the database clock; one daily attempt per user (unique constraint); answers are
  accepted once, in order (row locks).

## Web
- ✅ Headers on every response: CSP (`default-src 'self'`, no framing, `object-src 'none'`, form posts to
  self only), HSTS, `nosniff`, `X-Frame-Options: DENY`, strict referrer policy, restrictive permissions policy.
- ⚠️ `script-src 'unsafe-inline'` — required by Next.js inline bootstrap without nonces. No user content is
  ever rendered as HTML, which keeps XSS impact low; nonce-based CSP is a possible later hardening.
- ✅ Server actions: Next.js checks the `Origin` header; every admin action re-checks the role in the database.
- ✅ Redirect targets after sign-in / email links are restricted to same-origin paths (`safeNextPath`).
- ✅ JSON APIs: 8 KB body limit, Zod validation, `Cache-Control: no-store`.
- ✅ Flag SVGs are sanitised at import (no scripts, ids/classes renamed) and served with their own
  `default-src 'none'; sandbox` CSP.

## Abuse
- ⚠️ API rate limits are in-memory per server instance (Vercel sets `x-forwarded-for` itself, so the client IP
  cannot be spoofed). Database caps back them up (60 standard games/hour per user; one daily attempt).
  A shared store (e.g. Upstash Redis) can replace the limiter without API changes if traffic grows.
- ✅ Sign-up, sign-in and email sending are rate-limited by Supabase Auth (Authentication → Rate Limits).
  If bot sign-ups ever appear, enable Supabase's CAPTCHA protection.
- ✅ Admin area: role in a table with no client write path, 404 for everyone else, append-only audit log.

## Accounts
- ✅ Email confirmation required; minimum password length 8 (Supabase setting + server validation).
- ✅ Account deletion removes profile, games, attempts and achievements (cascade); audit history keeps the
  entry with the actor set to null.

## Review 2026-11-15 (live site + database)

Checked against the production deployment, not only the code.

| Area | Result |
| --- | --- |
| Secrets in git history | none (`sb_secret_`, JWTs, connection strings, private keys, session secret values) |
| Secrets in the JavaScript sent to browsers | none (14 bundles from the live site scanned); source maps not served (403) |
| Tables as an anonymous visitor (publishable key) | readable: `countries`, `achievements` (catalogue) — everything else 401 |
| Functions as an anonymous visitor | only `daily_leaderboard`, `period_leaderboard`, `username_available`; all admin/game/stats functions 401 |
| HTML injection points (`dangerouslySetInnerHTML`, `innerHTML`, `eval`…) | none; all user text rendered by React (escaped) |
| Headers | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff` present on the live site |
| Supabase Auth | email confirmation on, anonymous sign-ins off, manual linking off |
| Supabase security advisor | 1 error fixed (below); remaining warnings are intentional (public leaderboards, own-data `my_*` functions, RLS-without-policy = deny-all tables) |

Fixed in this review:
- **Open redirect** in `safeNextPath`: `next=/%09/evil.com` passed the check because browsers drop tabs while
  parsing URLs (→ `//evil.com`). Now rejects any control character/whitespace and verifies the resolved URL
  stays on the site. Regression tests added.
- **Removed `public_profiles`** (anyone could list every username and sign-up date; unused by the app) and the
  unused `my_answered_questions` function (migration `20261115100000_security_hardening.sql`).
- **Display names**: invisible bidi/zero-width characters stripped (prevents misleading names on boards).

Accepted / not available on the free plan:
- Leaked-password protection (HaveIBeenPwned check) is a Supabase Pro feature.
- CAPTCHA on sign-up: off; enable (Attack Protection) if bot sign-ups appear.

Account security (owner, outside the code): enable 2-factor authentication on GitHub, Vercel, Supabase and the
project Gmail — whoever controls these controls the site and its data.
