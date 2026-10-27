-- FLAGFORGE · progress: period rankings, statistics, streaks, discovered countries and achievements.
-- Everything here is derived from persisted results; nothing is client-writable. Achievements are awarded by
-- database triggers when a game or daily attempt completes, and the primary key prevents duplicates.

-- ── weekly / monthly Hall of Fame ───────────────────────────────────────────
-- Over the daily challenges dated p_from..p_to (inclusive): most perfect completed attempts first, then the
-- lowest combined time of those perfect attempts, then whoever completed their last perfect run earlier.
-- Players with no perfect run in the period are not ranked.
create or replace function public.period_leaderboard(p_from date, p_to date, p_limit integer default 50)
returns table (
  rank bigint,
  username text,
  display_name text,
  perfect_count integer,
  total_ms bigint,
  days_played integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with per_user as (
    select
      a.user_id,
      count(*) filter (where a.correct_count = 5)::integer as perfect_count,
      coalesce(sum(a.elapsed_ms) filter (where a.correct_count = 5), 0)::bigint as total_ms,
      count(*)::integer as days_played,
      max(a.completed_at) filter (where a.correct_count = 5) as last_perfect_at
    from public.daily_attempts a
    join public.daily_challenges c on c.id = a.challenge_id
    where c.challenge_date between p_from and p_to
      and c.status = 'published'
      and a.status = 'completed'
    group by a.user_id
  )
  select
    row_number() over (order by u.perfect_count desc, u.total_ms asc, u.last_perfect_at asc, p.username asc) as rank,
    p.username,
    p.display_name,
    u.perfect_count,
    u.total_ms,
    u.days_played
  from per_user u
  join public.profiles p on p.id = u.user_id
  where u.perfect_count > 0
  order by rank
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

revoke execute on function public.period_leaderboard(date, date, integer) from public;
grant execute on function public.period_leaderboard(date, date, integer) to anon, authenticated, service_role;

-- ── streaks ─────────────────────────────────────────────────────────────────
-- A streak is a run of consecutive challenge dates with a completed daily attempt. The current streak is the
-- run ending today or yesterday (today's challenge may still be ahead of the player).
create or replace function public.daily_streaks(p_user_id uuid)
returns table (current_streak integer, longest_streak integer)
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select distinct c.challenge_date as d
    from public.daily_attempts a
    join public.daily_challenges c on c.id = a.challenge_id
    where a.user_id = p_user_id and a.status = 'completed'
  ),
  grouped as (
    select d, d - (row_number() over (order by d))::integer as grp from days
  ),
  runs as (
    select max(d) as last_day, count(*)::integer as len from grouped group by grp
  )
  select
    coalesce((select len from runs where last_day >= public.challenge_today() - 1 order by last_day desc limit 1), 0),
    coalesce((select max(len) from runs), 0);
$$;

revoke execute on function public.daily_streaks(uuid) from public, anon, authenticated;
grant execute on function public.daily_streaks(uuid) to service_role;

-- ── discovered countries (the personal atlas) ───────────────────────────────
-- A country is discovered once the player identified its flag correctly, in a standard game or a daily.
create or replace function public.discovered_countries(p_user_id uuid)
returns table (iso_code text, first_identified_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.iso_code, min(x.at) as first_identified_at
  from (
    select q.country_id, q.answered_at as at
    from public.game_session_questions q
    join public.game_sessions s on s.id = q.session_id
    where s.user_id = p_user_id and q.is_correct
    union all
    select dq.country_id, ans.answered_at
    from public.daily_attempt_answers ans
    join public.daily_attempts a on a.id = ans.attempt_id
    join public.daily_challenge_questions dq on dq.id = ans.question_id
    where a.user_id = p_user_id and ans.is_correct
  ) x
  join public.countries c on c.id = x.country_id
  group by c.iso_code
  order by min(x.at);
$$;

revoke execute on function public.discovered_countries(uuid) from public, anon, authenticated;
grant execute on function public.discovered_countries(uuid) to service_role;

-- ── achievements ────────────────────────────────────────────────────────────
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name_en text not null,
  name_he text not null,
  description_en text not null,
  description_he text not null,
  icon_key text,
  criteria jsonb not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint achievements_code_format check (code ~ '^[a-z0-9_]{3,40}$'),
  constraint achievements_criteria_type check (criteria ? 'type' and criteria ? 'min')
);

create unique index achievements_code_key on public.achievements (code);

create table public.user_achievements (
  user_id uuid not null references public.profiles (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create index user_achievements_user_idx on public.user_achievements (user_id, earned_at desc);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
revoke all on public.achievements from anon, authenticated;
revoke all on public.user_achievements from anon, authenticated;

grant select on public.achievements to anon, authenticated;
create policy "achievements: readable by everyone"
on public.achievements for select to anon, authenticated using (true);

grant select on public.user_achievements to authenticated;
create policy "user_achievements: owner can read"
on public.user_achievements for select to authenticated using (user_id = (select auth.uid()));

-- ── statistics ──────────────────────────────────────────────────────────────
-- Standard games and daily challenges are reported separately (docs/STATS.md defines every number).
create or replace function public.player_stats(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'standard', (
      select jsonb_build_object(
        'games_completed', count(*) filter (where s.status = 'completed'),
        'perfect_games', count(*) filter (where s.status = 'completed' and s.correct_count = s.total_questions),
        'best_score', coalesce(max(s.score) filter (where s.status = 'completed'), 0),
        'questions_answered', (select count(*) from public.game_session_questions q join public.game_sessions s2 on s2.id = q.session_id
                               where s2.user_id = p_user_id and q.answered_at is not null),
        'correct_answers', (select count(*) from public.game_session_questions q join public.game_sessions s2 on s2.id = q.session_id
                            where s2.user_id = p_user_id and q.is_correct)
      )
      from public.game_sessions s where s.user_id = p_user_id
    ),
    'daily', (
      select jsonb_build_object(
        'attempts', count(*),
        'completed', count(*) filter (where a.status = 'completed'),
        'perfect', count(*) filter (where a.status = 'completed' and a.correct_count = 5),
        'fastest_perfect_ms', min(a.elapsed_ms) filter (where a.status = 'completed' and a.correct_count = 5),
        'questions_answered', (select count(*) from public.daily_attempt_answers x join public.daily_attempts a2 on a2.id = x.attempt_id where a2.user_id = p_user_id),
        'correct_answers', (select count(*) from public.daily_attempt_answers x join public.daily_attempts a2 on a2.id = x.attempt_id where a2.user_id = p_user_id and x.is_correct)
      )
      from public.daily_attempts a where a.user_id = p_user_id
    ),
    'streak', (select jsonb_build_object('current', current_streak, 'longest', longest_streak) from public.daily_streaks(p_user_id)),
    'countries_discovered', (select count(*) from public.discovered_countries(p_user_id)),
    'countries_total', (select count(*) from public.countries),
    'achievements_earned', (select count(*) from public.user_achievements ua where ua.user_id = p_user_id)
  );
$$;

revoke execute on function public.player_stats(uuid) from public, anon, authenticated;
grant execute on function public.player_stats(uuid) to service_role;

-- Criteria are data: { "type": <metric>, "min": <threshold>, ["min_answers": n] }. Adding an achievement is an
-- INSERT; the evaluator below understands these metric types.
insert into public.achievements (code, name_en, name_he, description_en, description_he, icon_key, criteria, sort_order) values
  ('first_game', 'First flight', 'ההמראה הראשונה', 'Complete your first game.', 'סיימו את המשחק הראשון.', 'flag', '{"type":"games_completed","min":1}', 10),
  ('first_perfect_game', 'Flawless', 'בלי טעויות', 'Get every flag right in a standard game.', 'ענו נכון על כל הדגלים במשחק רגיל.', 'star', '{"type":"perfect_games","min":1}', 20),
  ('hard_perfect', 'Atlas reader', 'קוראי אטלס', 'A perfect standard game on Hard.', 'משחק מושלם ברמה קשה.', 'mountain', '{"type":"perfect_hard_games","min":1}', 30),
  ('first_perfect_daily', 'Daily champion material', 'חומר של אלופים', 'Finish a daily challenge 5 out of 5.', 'סיימו אתגר יומי ב-5 מתוך 5.', 'trophy', '{"type":"daily_perfect","min":1}', 40),
  ('five_perfect_daily', 'High five', 'חמש מתוך חמש, חמש פעמים', 'Five perfect daily challenges.', 'חמישה אתגרים יומיים מושלמים.', 'medal', '{"type":"daily_perfect","min":5}', 50),
  ('streak_7', 'A full week', 'שבוע שלם', 'Complete the daily challenge 7 days in a row.', 'השלימו את האתגר היומי 7 ימים ברצף.', 'flame', '{"type":"longest_streak","min":7}', 60),
  ('correct_50', 'Fifty flags', 'חמישים דגלים', 'Answer 50 flags correctly.', 'ענו נכון על 50 דגלים.', 'check', '{"type":"correct_answers","min":50}', 70),
  ('correct_500', 'Vexillologist', 'מומחי דגלים', 'Answer 500 flags correctly.', 'ענו נכון על 500 דגלים.', 'award', '{"type":"correct_answers","min":500}', 80),
  ('accuracy_90', 'Sharp eye', 'עין חדה', '90% accuracy over at least 100 answers.', 'דיוק של 90% לפחות על פני 100 תשובות ומעלה.', 'target', '{"type":"accuracy_pct","min":90,"min_answers":100}', 90),
  ('explorer_50', 'Explorer', 'מגלי ארצות', 'Discover 50 countries on your atlas.', 'גלו 50 מדינות באטלס שלכם.', 'compass', '{"type":"countries_discovered","min":50}', 100),
  ('explorer_all', 'The whole world', 'כל העולם', 'Discover all 193 countries.', 'גלו את כל 193 המדינות.', 'globe', '{"type":"countries_discovered","min":193}', 110);

-- Awards every achievement whose criteria the player now meets; returns the codes newly earned.
create or replace function public.evaluate_achievements(p_user_id uuid)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_metrics jsonb;
  v_answered bigint;
  v_correct bigint;
begin
  select count(*) filter (where q.answered_at is not null), count(*) filter (where q.is_correct)
  into v_answered, v_correct
  from public.game_session_questions q join public.game_sessions s on s.id = q.session_id
  where s.user_id = p_user_id;

  v_answered := v_answered + (select count(*) from public.daily_attempt_answers x join public.daily_attempts a on a.id = x.attempt_id where a.user_id = p_user_id);
  v_correct := v_correct + (select count(*) from public.daily_attempt_answers x join public.daily_attempts a on a.id = x.attempt_id where a.user_id = p_user_id and x.is_correct);

  v_metrics := jsonb_build_object(
    'games_completed', (select count(*) from public.game_sessions where user_id = p_user_id and status = 'completed'),
    'perfect_games', (select count(*) from public.game_sessions where user_id = p_user_id and status = 'completed' and correct_count = total_questions),
    'perfect_hard_games', (select count(*) from public.game_sessions where user_id = p_user_id and status = 'completed' and correct_count = total_questions and difficulty = 'hard'),
    'daily_perfect', (select count(*) from public.daily_attempts where user_id = p_user_id and status = 'completed' and correct_count = 5),
    'longest_streak', (select longest_streak from public.daily_streaks(p_user_id)),
    'correct_answers', v_correct,
    'answers', v_answered,
    'accuracy_pct', case when v_answered > 0 then floor(100.0 * v_correct / v_answered) else 0 end,
    'countries_discovered', (select count(*) from public.discovered_countries(p_user_id))
  );

  return query
  insert into public.user_achievements (user_id, achievement_id)
  select p_user_id, a.id
  from public.achievements a
  where coalesce((v_metrics ->> (a.criteria ->> 'type'))::numeric, 0) >= (a.criteria ->> 'min')::numeric
    and (not a.criteria ? 'min_answers' or (v_metrics ->> 'answers')::numeric >= (a.criteria ->> 'min_answers')::numeric)
  on conflict (user_id, achievement_id) do nothing
  returning (select code from public.achievements where id = achievement_id);
end;
$$;

revoke execute on function public.evaluate_achievements(uuid) from public, anon, authenticated;
grant execute on function public.evaluate_achievements(uuid) to service_role;

-- Award automatically when a game or a daily attempt completes.
create or replace function public.award_on_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    perform public.evaluate_achievements(new.user_id);
  end if;
  return new;
end;
$$;

revoke execute on function public.award_on_completion() from public, anon, authenticated;

create trigger game_sessions_award
after update of status on public.game_sessions
for each row execute function public.award_on_completion();

create trigger daily_attempts_award
after update of status on public.daily_attempts
for each row execute function public.award_on_completion();

-- Achievements earned since a game or daily attempt started — what the results screen celebrates.
create or replace function public.achievements_since_start(p_user_id uuid, p_game_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with started as (
    select started_at from public.game_sessions where id = p_game_id and user_id = p_user_id
    union all
    select started_at from public.daily_attempts where id = p_game_id and user_id = p_user_id
  )
  select coalesce(
    jsonb_agg(jsonb_build_object('code', a.code, 'name_en', a.name_en, 'name_he', a.name_he, 'icon_key', a.icon_key) order by a.sort_order),
    '[]'::jsonb
  )
  from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id
  where ua.user_id = p_user_id and ua.earned_at >= (select min(started_at) from started);
$$;

revoke execute on function public.achievements_since_start(uuid, uuid) from public, anon, authenticated;
grant execute on function public.achievements_since_start(uuid, uuid) to service_role;

-- Backfill for players who already have results.
select public.evaluate_achievements(id) from public.profiles;

-- ── signed-in reads (auth.uid(), no user id parameter) ──────────────────────
create or replace function public.my_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when (select auth.uid()) is null then null else public.player_stats((select auth.uid())) end;
$$;

create or replace function public.my_discovered_countries()
returns table (iso_code text, first_identified_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.discovered_countries((select auth.uid())) where (select auth.uid()) is not null;
$$;

revoke execute on function public.my_stats() from public, anon;
revoke execute on function public.my_discovered_countries() from public, anon;
grant execute on function public.my_stats() to authenticated, service_role;
grant execute on function public.my_discovered_countries() to authenticated, service_role;
