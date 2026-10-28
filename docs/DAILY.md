# Daily challenge

## Rules (what players see)

- One challenge per calendar day, **identical for every player**: 5 flags, 4 options each.
- Composition: **2 easy, 2 medium, 1 hard**, shown easy → hard (`gameConfig.daily.composition`).
- Signed-in players only. **One attempt per account.** Once started, the attempt counts; refreshing or
  reopening resumes the same attempt and the clock keeps running. It cannot be restarted.
- Time is measured by the **database clock**, from the start of the attempt to the fifth answer. After each answer
  the right/wrong feedback shows for 0.9 s, then the next flag appears — the same for everyone. Facts are shown in
  the review at the end.
- Day boundary: **midnight Asia/Jerusalem** (`public.challenge_today()`), DST-safe. Only today's challenge is
  playable; an attempt started before midnight can still be finished and counts for its own date.

## Ranking (`public.daily_leaderboard(date)`)

Completed attempts only (incomplete attempts never rank):

1. Perfect runs (5/5) before all imperfect runs.
2. Then more correct answers (relevant among imperfect runs).
3. Then shorter server-measured time.
4. Then earlier completion timestamp, then attempt id (deterministic).

Rank 1 with a perfect run is the **champion**. Only public fields are returned (username, display name, result).

## Data and integrity

- `daily_challenges` (unique `challenge_date`) → `daily_challenge_questions` (positions 1–5, unique country) →
  `daily_challenge_question_options` (positions 0–3). Clients can see only *that* a date is published.
- `publish_daily_challenge()` refuses unless `validate_daily_challenge()` reports no problems: exactly 5
  questions at positions 1–5, the 2/2/1 composition, difficulty matching each country, 4 options per question
  including the correct one.
- Published challenges are **immutable** (triggers block edits/deletes of the challenge, questions and options).
  A future challenge nobody has started can be unpublished; today's or a started one cannot.
- `daily_attempts` has `UNIQUE (challenge_id, user_id)`; starting is an idempotent upsert, so concurrent starts
  produce one attempt (tested with 4 simultaneous connections).
- `answer_daily_question()` locks the attempt row, accepts only the next unanswered position, maps the chosen
  option to a country server-side and records it once. Concurrent answers → exactly one recorded (tested).

## Preparing challenges in advance

```powershell
npm run daily:prepare                    # today + the next 13 days
npm run daily:prepare -- --days=30
npm run daily:prepare -- --dry-run       # show what would be generated
npm run daily:validate                   # report missing/invalid dates (non-zero exit if any)
```

The generator avoids flags used within 30 days either side of each date. Already-published dates are never
changed; valid drafts (e.g. curated in the admin area) are published as they are. The script and the admin
area's "Prepare ahead" share one implementation (`src/server/admin/calendar.ts`) and both write to the audit
log. Day-to-day management is easier from `/admin` — see docs/ADMIN.md.
Recommended routine: run `daily:prepare -- --days=30` once a month and `daily:validate` weekly (or from a scheduled
job). If no challenge is published for a date, the site says so and nobody can start an attempt.
