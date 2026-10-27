# Progress: Hall of Fame periods, statistics, streaks, achievements, atlas

Migration: `supabase/migrations/20261027100600_progress.sql`. Everything is derived from persisted results on
the server; nothing in this layer is writable by clients.

## Weekly and monthly Hall of Fame — `period_leaderboard(from, to, limit)`

- Periods are challenge dates (Asia/Jerusalem calendar). Weeks run **Monday → Sunday**; months are calendar
  months. Boundaries are computed in `src/lib/time/periods.ts` (pure calendar arithmetic, unit-tested across
  month/year ends, leap years and the October DST change).
- Counted: completed attempts on *published* daily challenges dated inside the period.
- Order: **most perfect (5/5) runs** → **lowest combined time of those perfect runs** → whoever completed their
  last perfect run earlier → username. Players without a perfect run in the period are not listed.
- Readable by anyone (anon included); returns username, display name and numbers only — never user ids.
- A period that contains today is shown as "still in play".

## Statistics — `player_stats(user)` / `my_stats()`

| Field | Definition |
| --- | --- |
| `standard.games_completed` | standard games with status `completed` |
| `standard.perfect_games` | completed games with every answer correct |
| `standard.best_score` | highest score of a completed game |
| `standard.questions_answered` / `correct_answers` | all answered questions in standard games (completed or not) |
| `daily.completed` / `perfect` | completed daily attempts / those with 5 of 5 |
| `daily.fastest_perfect_ms` | lowest server-measured time of a perfect daily |
| `daily.questions_answered` / `correct_answers` | all daily answers |
| `streak.current` | consecutive challenge dates with a completed daily, ending **today or yesterday** (today may still be ahead) |
| `streak.longest` | longest such run ever |
| `countries_discovered` | distinct countries identified correctly at least once, in either mode |

Accuracy shown on the profile = correct ÷ answered, per mode. `my_stats()` / `my_discovered_countries()` use
`auth.uid()` and are executable by signed-in users only; the `p_user_id` variants are service-role only.

## Achievements

- `achievements` (public catalogue) and `user_achievements` (primary key `(user_id, achievement_id)` — an
  achievement can never be earned twice; owner-read RLS, no client writes).
- Criteria are data: `{ "type": <metric>, "min": n, ["min_answers": n] }`. `evaluate_achievements(user)`
  computes the metrics once and inserts every newly met achievement (`on conflict do nothing`).
- Awarded **automatically by triggers** when a `game_sessions` or `daily_attempts` row changes to
  `completed`. The migration also backfills existing players.
- `achievements_since_start(user, game_or_attempt_id)` lists what was earned since that game started; the
  results screens show it as a celebration.

| Code | Rule |
| --- | --- |
| first_game | 1 completed standard game |
| first_perfect_game | 1 perfect standard game |
| hard_perfect | 1 perfect standard game on Hard |
| first_perfect_daily | 1 perfect daily |
| five_perfect_daily | 5 perfect dailies |
| streak_7 | longest daily streak ≥ 7 |
| correct_50 / correct_500 | correct answers, both modes |
| accuracy_90 | ≥ 90 % accuracy with ≥ 100 answers |
| explorer_50 / explorer_all | countries discovered ≥ 50 / 193 |

Adding an achievement is an `insert` with a supported metric type; new metric types need a change to
`evaluate_achievements`.

## Atlas (personal world map)

- `npm run data:atlas` builds `src/data/atlas.json` from **world-atlas 2.0.2** (Natural Earth admin-0,
  public domain): 1:110m shapes, projected (Natural Earth I) at build time, coordinates rounded to 0.1 px
  (~110 KB). The map is rendered on the server; only a small client component handles selection.
- 35 small members (e.g. Monaco, Tuvalu, Malta, Singapore) are drawn as **dots** — at their 1:50m centroid
  (1:10m for Tuvalu) when they have no 110m shape, or on top of a shape too small to see.
- Natural Earth draws some overseas territories as part of their state (e.g. French Guiana with France), so
  discovering such a country colours those areas too. Non-member features (Greenland, Western Sahara,
  Taiwan, Kosovo, Palestine, Northern Cyprus, Somaliland…) are neutral background land and not selectable;
  Antarctica is omitted. Boundaries are Natural Earth's de facto lines and imply no position.
- The country list under the map (grouped by continent, filterable) is the keyboard / screen-reader path.
  Undiscovered countries show a "?" instead of the flag and hide the capital.
