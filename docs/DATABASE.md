# Database

PostgreSQL on Supabase. Every change is a versioned migration in `supabase/migrations` (applied in filename order).

| Migration | Contents |
|---|---|
| `20261027100000_foundation.sql` | `profiles` (+ signup trigger, username rules, `public_profiles` view), `user_roles`, `is_admin()`, `username_available()` |
| `20261027100100_countries.sql` | `countries` table, constraints, public read policy |
| `20261027100200_countries_data.sql` | **generated** — 193 countries (idempotent upsert) |
| `20261027100300_standard_games.sql` | `game_sessions`, `game_session_questions`, scoring, start/answer/review functions |
| `20261027100400_daily_challenges.sql` | daily challenges, questions, options, attempts, answers; validation, publication, immutability, ranked attempts, `daily_leaderboard()` — see docs/DAILY.md |

## Security model

- RLS is enabled on every table. Supabase's default grants to `anon`/`authenticated` are revoked per table and
  re-granted minimally (tests verify this against a shim that reproduces the permissive defaults).
- Clients (browser, publishable key) can: read countries; read/update **their own** profile (only
  `username`, `display_name`, `avatar_url`, `preferred_language`); read **their own** game sessions; read the
  `public_profiles` view (username, display name, avatar, join date — no ids, emails or language).
- Clients cannot write any results. Game rows are written only by `SECURITY DEFINER` functions with
  `search_path = ''`, executable only by `service_role` (the Next.js server holding the secret key).
- `game_session_questions` (which contains correct answers) is not readable by clients at all;
  `my_answered_questions()` returns only questions the caller has already answered.
- Admin rights come only from `user_roles`, which has no client write path.

## Integrity rules enforced by the database

- One profile per auth user; usernames `^[a-z0-9_]{3,20}$`, unique, reserved names blocked.
- Countries: unique ISO code, unique names (en case-insensitive, he), valid difficulty/continent.
- Each question: exactly 4 distinct options, the stored correct index points at the question's country, no
  country twice in one game.
- Answers: the session row is locked (`FOR UPDATE`); only the next unanswered position is accepted, once.
  Concurrent submissions → exactly one succeeds (tested). Time and points use the database clock.
- Session status/completion fields must be consistent (check constraint).
- Deleting an auth user cascades to profile, roles and games.

Error codes from functions use PostgREST's `PTxxx` convention (e.g. `PT409` conflict → HTTP 409).
