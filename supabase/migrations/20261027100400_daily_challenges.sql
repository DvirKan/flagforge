-- FLAGFORGE · daily challenge.
-- One preconfigured challenge per date (Asia/Jerusalem calendar), identical for every player: 5 questions,
-- 4 stored options each. A challenge can be published only if it passes validation, and is immutable once
-- published. Each user gets exactly one attempt; the server's clock measures it; answers are written once.

-- The challenge calendar day, in the challenge timezone. Midnight Asia/Jerusalem is the rollover (DST-safe:
-- conversion happens at the current instant).
create or replace function public.challenge_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Jerusalem')::date;
$$;

grant execute on function public.challenge_today() to anon, authenticated, service_role;

-- ── tables ───────────────────────────────────────────────────────────────────
create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_date date not null,
  timezone text not null default 'Asia/Jerusalem',
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_challenges_status_valid check (status in ('draft', 'published')),
  constraint daily_challenges_timezone_fixed check (timezone = 'Asia/Jerusalem'),
  constraint daily_challenges_published_at check ((status = 'published') = (published_at is not null))
);

create unique index daily_challenges_date_key on public.daily_challenges (challenge_date);

create trigger daily_challenges_set_updated_at
before update on public.daily_challenges
for each row execute function public.set_updated_at();

create table public.daily_challenge_questions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.daily_challenges (id) on delete cascade,
  position smallint not null,
  country_id uuid not null references public.countries (id),
  difficulty text not null,
  constraint dcq_position_range check (position between 1 and 5),
  constraint dcq_difficulty_valid check (difficulty in ('easy', 'medium', 'hard'))
);

create unique index dcq_challenge_position_key on public.daily_challenge_questions (challenge_id, position);
create unique index dcq_challenge_country_key on public.daily_challenge_questions (challenge_id, country_id);

create table public.daily_challenge_question_options (
  question_id uuid not null references public.daily_challenge_questions (id) on delete cascade,
  country_id uuid not null references public.countries (id),
  position smallint not null,
  primary key (question_id, country_id),
  constraint dcqo_position_range check (position between 0 and 3)
);

create unique index dcqo_question_position_key on public.daily_challenge_question_options (question_id, position);

create table public.daily_attempts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.daily_challenges (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'active',
  correct_count integer not null default 0,
  elapsed_ms bigint,
  created_at timestamptz not null default now(),
  constraint daily_attempts_status_valid check (status in ('active', 'completed')),
  constraint daily_attempts_correct_range check (correct_count between 0 and 5),
  constraint daily_attempts_completion_consistent check (
    (status = 'completed') = (completed_at is not null and elapsed_ms is not null)
  )
);

-- The essential rule: one attempt per user per challenge.
create unique index daily_attempts_challenge_user_key on public.daily_attempts (challenge_id, user_id);
create index daily_attempts_user_idx on public.daily_attempts (user_id, started_at desc);
create index daily_attempts_ranking_idx on public.daily_attempts (challenge_id, status, correct_count desc, elapsed_ms, completed_at);

create table public.daily_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.daily_attempts (id) on delete cascade,
  question_id uuid not null references public.daily_challenge_questions (id),
  selected_country_id uuid not null references public.countries (id),
  is_correct boolean not null,
  answered_at timestamptz not null default now()
);

create unique index daa_attempt_question_key on public.daily_attempt_answers (attempt_id, question_id);

-- ── access ───────────────────────────────────────────────────────────────────
alter table public.daily_challenges enable row level security;
alter table public.daily_challenge_questions enable row level security;
alter table public.daily_challenge_question_options enable row level security;
alter table public.daily_attempts enable row level security;
alter table public.daily_attempt_answers enable row level security;

revoke all on public.daily_challenges from anon, authenticated;
revoke all on public.daily_challenge_questions from anon, authenticated;
revoke all on public.daily_challenge_question_options from anon, authenticated;
revoke all on public.daily_attempts from anon, authenticated;
revoke all on public.daily_attempt_answers from anon, authenticated;

-- Only the existence/date of published challenges is public. Questions, options (and thus answers) are not
-- client-readable at all.
grant select (id, challenge_date, status, published_at) on public.daily_challenges to anon, authenticated;
create policy "daily_challenges: published are visible"
on public.daily_challenges for select
to anon, authenticated
using (status = 'published');

grant select on public.daily_attempts to authenticated;
create policy "daily_attempts: owner can read"
on public.daily_attempts for select
to authenticated
using (user_id = (select auth.uid()));

-- ── immutability once published ─────────────────────────────────────────────
create or replace function public.guard_daily_challenge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'published' then
      raise exception 'challenge_published_immutable' using errcode = 'PT409';
    end if;
    return old;
  end if;
  if old.status = 'published' then
    if new.challenge_date <> old.challenge_date then
      raise exception 'challenge_published_immutable' using errcode = 'PT409';
    end if;
    if new.status = 'draft' then
      -- Unpublishing is allowed only for future challenges nobody has started.
      if old.challenge_date <= public.challenge_today()
         or exists (select 1 from public.daily_attempts where challenge_id = old.id) then
        raise exception 'challenge_already_live' using errcode = 'PT409';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger daily_challenges_guard
before update or delete on public.daily_challenges
for each row execute function public.guard_daily_challenge();

create or replace function public.guard_daily_challenge_content()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_challenge uuid;
begin
  if tg_table_name = 'daily_challenge_questions' then
    v_challenge := coalesce(new.challenge_id, old.challenge_id);
  else
    select challenge_id into v_challenge from public.daily_challenge_questions
    where id = coalesce(new.question_id, old.question_id);
  end if;
  if exists (select 1 from public.daily_challenges where id = v_challenge and status = 'published') then
    raise exception 'challenge_published_immutable' using errcode = 'PT409';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger dcq_guard
before insert or update or delete on public.daily_challenge_questions
for each row execute function public.guard_daily_challenge_content();

create trigger dcqo_guard
before insert or update or delete on public.daily_challenge_question_options
for each row execute function public.guard_daily_challenge_content();

-- ── authoring ────────────────────────────────────────────────────────────────
-- Problems that block publication. Empty array = publishable.
create or replace function public.validate_daily_challenge(p_challenge_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_problems text[] := '{}';
  v_count integer;
  r record;
begin
  if not exists (select 1 from public.daily_challenges where id = p_challenge_id) then
    return array['challenge_not_found'];
  end if;

  select count(*) into v_count from public.daily_challenge_questions where challenge_id = p_challenge_id;
  if v_count <> 5 then
    v_problems := v_problems || format('expected 5 questions, found %s', v_count);
  end if;

  if exists (
    select 1 from generate_series(1, 5) p
    where not exists (select 1 from public.daily_challenge_questions q where q.challenge_id = p_challenge_id and q.position = p)
  ) then
    v_problems := v_problems || 'positions must be exactly 1–5'::text;
  end if;

  -- Composition: 2 easy, 2 medium, 1 hard (as documented in docs/DAILY.md).
  for r in
    select d.difficulty, d.expected, count(q.id) as actual
    from (values ('easy', 2), ('medium', 2), ('hard', 1)) as d(difficulty, expected)
    left join public.daily_challenge_questions q on q.challenge_id = p_challenge_id and q.difficulty = d.difficulty
    group by d.difficulty, d.expected
  loop
    if r.actual <> r.expected then
      v_problems := v_problems || format('expected %s %s question(s), found %s', r.expected, r.difficulty, r.actual);
    end if;
  end loop;

  -- The stored difficulty must match the country's curated difficulty.
  for r in
    select q.position from public.daily_challenge_questions q
    join public.countries c on c.id = q.country_id
    where q.challenge_id = p_challenge_id and q.difficulty <> c.difficulty
  loop
    v_problems := v_problems || format('question %s: difficulty does not match the country', r.position);
  end loop;

  -- Each question: exactly 4 options, positions 0–3, the correct country among them.
  for r in
    select q.position,
           count(o.country_id) as n,
           count(distinct o.position) as positions,
           bool_or(o.country_id = q.country_id) as has_correct
    from public.daily_challenge_questions q
    left join public.daily_challenge_question_options o on o.question_id = q.id
    where q.challenge_id = p_challenge_id
    group by q.id, q.position
  loop
    if r.n <> 4 or r.positions <> 4 then
      v_problems := v_problems || format('question %s: expected 4 options, found %s', r.position, r.n);
    end if;
    if not coalesce(r.has_correct, false) then
      v_problems := v_problems || format('question %s: the correct country is not among the options', r.position);
    end if;
  end loop;

  return v_problems;
end;
$$;

revoke execute on function public.validate_daily_challenge(uuid) from public, anon, authenticated;
grant execute on function public.validate_daily_challenge(uuid) to service_role;

-- Creates (or replaces) a DRAFT challenge for a date from a generated payload:
-- [{ "country": "JP", "difficulty": "easy", "options": ["JP","KR","CN","VN"] }, ...] in position order.
create or replace function public.upsert_daily_challenge_draft(p_date date, p_questions jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_item jsonb;
  v_pos integer := 0;
  v_question uuid;
  v_country uuid;
  v_opt text;
  v_opt_pos integer;
begin
  select id into v_id from public.daily_challenges where challenge_date = p_date;
  if v_id is not null then
    if exists (select 1 from public.daily_challenges where id = v_id and status = 'published') then
      raise exception 'challenge_published_immutable' using errcode = 'PT409';
    end if;
    delete from public.daily_challenge_questions where challenge_id = v_id;
  else
    insert into public.daily_challenges (challenge_date) values (p_date) returning id into v_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_questions) loop
    v_pos := v_pos + 1;
    select id into v_country from public.countries where iso_code = v_item ->> 'country';
    if v_country is null then
      raise exception 'unknown_country %', v_item ->> 'country' using errcode = 'PT400';
    end if;
    insert into public.daily_challenge_questions (challenge_id, position, country_id, difficulty)
    values (v_id, v_pos, v_country, v_item ->> 'difficulty')
    returning id into v_question;
    v_opt_pos := 0;
    for v_opt in select * from jsonb_array_elements_text(v_item -> 'options') loop
      insert into public.daily_challenge_question_options (question_id, country_id, position)
      select v_question, c.id, v_opt_pos from public.countries c where c.iso_code = v_opt;
      if not found then
        raise exception 'unknown_country %', v_opt using errcode = 'PT400';
      end if;
      v_opt_pos := v_opt_pos + 1;
    end loop;
  end loop;
  return v_id;
end;
$$;

revoke execute on function public.upsert_daily_challenge_draft(date, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_daily_challenge_draft(date, jsonb) to service_role;

create or replace function public.publish_daily_challenge(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_problems text[] := public.validate_daily_challenge(p_challenge_id);
begin
  if cardinality(v_problems) > 0 then
    raise exception 'challenge_invalid: %', array_to_string(v_problems, '; ') using errcode = 'PT422';
  end if;
  update public.daily_challenges
  set status = 'published', published_at = now()
  where id = p_challenge_id and status = 'draft';
end;
$$;

revoke execute on function public.publish_daily_challenge(uuid) from public, anon, authenticated;
grant execute on function public.publish_daily_challenge(uuid) to service_role;

create or replace function public.unpublish_daily_challenge(p_challenge_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.daily_challenges set status = 'draft', published_at = null where id = p_challenge_id;
$$;

revoke execute on function public.unpublish_daily_challenge(uuid) from public, anon, authenticated;
grant execute on function public.unpublish_daily_challenge(uuid) to service_role;

-- ── playing ──────────────────────────────────────────────────────────────────
-- Shape returned to the server for one question (includes the correct country — server-only).
create or replace function public.daily_question_internal(p_user_id uuid, p_attempt_id uuid, p_position integer)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'position', q.position,
    'total', 5,
    'country', c.iso_code,
    'options', (select jsonb_agg(oc.iso_code order by o.position)
                from public.daily_challenge_question_options o
                join public.countries oc on oc.id = o.country_id
                where o.question_id = q.id)
  )
  from public.daily_attempts a
  join public.daily_challenge_questions q on q.challenge_id = a.challenge_id and q.position = p_position
  join public.countries c on c.id = q.country_id
  where a.id = p_attempt_id and a.user_id = p_user_id;
$$;

revoke execute on function public.daily_question_internal(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.daily_question_internal(uuid, uuid, integer) to service_role;

-- Starts the user's attempt on today's challenge, or returns the existing one (a refresh never resets it).
create or replace function public.start_daily_attempt(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_challenge public.daily_challenges%rowtype;
  v_attempt public.daily_attempts%rowtype;
  v_resumed boolean := false;
  v_next integer;
begin
  if p_user_id is null or not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'unknown_user' using errcode = 'PT404';
  end if;
  select * into v_challenge from public.daily_challenges
  where challenge_date = public.challenge_today() and status = 'published';
  if not found then
    raise exception 'no_challenge_today' using errcode = 'PT404';
  end if;

  insert into public.daily_attempts (challenge_id, user_id)
  values (v_challenge.id, p_user_id)
  on conflict (challenge_id, user_id) do nothing
  returning * into v_attempt;

  if not found then
    select * into v_attempt from public.daily_attempts where challenge_id = v_challenge.id and user_id = p_user_id;
    v_resumed := true;
  end if;

  select min(q.position) into v_next
  from public.daily_challenge_questions q
  where q.challenge_id = v_challenge.id
    and not exists (select 1 from public.daily_attempt_answers a where a.attempt_id = v_attempt.id and a.question_id = q.id);

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'challenge_date', v_challenge.challenge_date,
    'status', v_attempt.status,
    'resumed', v_resumed,
    'started_at', v_attempt.started_at,
    'next_position', v_next,
    'answered', (select count(*) from public.daily_attempt_answers where attempt_id = v_attempt.id),
    'correct_count', v_attempt.correct_count,
    'elapsed_ms', v_attempt.elapsed_ms
  );
end;
$$;

revoke execute on function public.start_daily_attempt(uuid) from public, anon, authenticated;
grant execute on function public.start_daily_attempt(uuid) to service_role;

-- Accepts the answer to question p_position of the attempt — only if it is the next unanswered one.
create or replace function public.answer_daily_question(p_user_id uuid, p_attempt_id uuid, p_position integer, p_choice integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.daily_attempts%rowtype;
  v_question public.daily_challenge_questions%rowtype;
  v_next integer;
  v_selected uuid;
  v_correct boolean;
  v_correct_index integer;
  v_now timestamptz := clock_timestamp();
  v_answered integer;
begin
  if p_choice is null or p_choice < 0 or p_choice > 3 then
    raise exception 'invalid_choice' using errcode = 'PT400';
  end if;

  select * into v_attempt from public.daily_attempts where id = p_attempt_id for update;
  if not found or v_attempt.user_id is distinct from p_user_id then
    raise exception 'attempt_not_found' using errcode = 'PT404';
  end if;
  if v_attempt.status <> 'active' then
    raise exception 'conflict' using errcode = 'PT409';
  end if;

  select min(q.position) into v_next
  from public.daily_challenge_questions q
  where q.challenge_id = v_attempt.challenge_id
    and not exists (select 1 from public.daily_attempt_answers a where a.attempt_id = v_attempt.id and a.question_id = q.id);
  if v_next is null or v_next <> p_position then
    raise exception 'conflict' using errcode = 'PT409';
  end if;

  select * into v_question from public.daily_challenge_questions
  where challenge_id = v_attempt.challenge_id and position = p_position;

  select country_id into v_selected from public.daily_challenge_question_options
  where question_id = v_question.id and position = p_choice;
  select position into v_correct_index from public.daily_challenge_question_options
  where question_id = v_question.id and country_id = v_question.country_id;
  v_correct := (v_selected = v_question.country_id);

  insert into public.daily_attempt_answers (attempt_id, question_id, selected_country_id, is_correct, answered_at)
  values (v_attempt.id, v_question.id, v_selected, v_correct, v_now);

  select count(*) into v_answered from public.daily_attempt_answers where attempt_id = v_attempt.id;
  if v_answered = 5 then
    update public.daily_attempts a
    set status = 'completed',
        completed_at = v_now,
        elapsed_ms = (extract(epoch from (v_now - a.started_at)) * 1000)::bigint,
        correct_count = (select count(*) from public.daily_attempt_answers x where x.attempt_id = a.id and x.is_correct)
    where a.id = v_attempt.id
    returning * into v_attempt;
  elsif v_correct then
    update public.daily_attempts set correct_count = correct_count + 1 where id = v_attempt.id
    returning * into v_attempt;
  end if;

  return jsonb_build_object(
    'correct', v_correct,
    'correct_index', v_correct_index,
    'country', (select iso_code from public.countries where id = v_question.country_id),
    'completed', v_attempt.status = 'completed',
    'correct_count', v_attempt.correct_count,
    'elapsed_ms', v_attempt.elapsed_ms
  );
end;
$$;

revoke execute on function public.answer_daily_question(uuid, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.answer_daily_question(uuid, uuid, integer, integer) to service_role;

-- Review of a completed attempt (server-side, for the results screen).
create or replace function public.daily_attempt_review(p_user_id uuid, p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'position', q.position,
      'country', c.iso_code,
      'selected', sc.iso_code,
      'is_correct', ans.is_correct
    ) order by q.position), '[]'::jsonb)
  from public.daily_attempts a
  join public.daily_challenge_questions q on q.challenge_id = a.challenge_id
  join public.countries c on c.id = q.country_id
  join public.daily_attempt_answers ans on ans.attempt_id = a.id and ans.question_id = q.id
  join public.countries sc on sc.id = ans.selected_country_id
  where a.id = p_attempt_id and a.user_id = p_user_id and a.status = 'completed';
$$;

revoke execute on function public.daily_attempt_review(uuid, uuid) from public, anon, authenticated;
grant execute on function public.daily_attempt_review(uuid, uuid) to service_role;

-- ── ranking ──────────────────────────────────────────────────────────────────
-- Public daily standings: completed attempts only. Perfect runs (5/5) first, then by server-measured time,
-- then by earlier completion. Imperfect runs follow, by correct answers, then time. Exposes only public fields.
create or replace function public.daily_leaderboard(p_date date, p_limit integer default 50)
returns table (
  rank bigint,
  username text,
  display_name text,
  correct_count integer,
  elapsed_ms bigint,
  completed_at timestamptz,
  is_perfect boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    row_number() over w as rank,
    p.username,
    p.display_name,
    a.correct_count,
    a.elapsed_ms,
    a.completed_at,
    a.correct_count = 5 as is_perfect
  from public.daily_attempts a
  join public.daily_challenges c on c.id = a.challenge_id
  join public.profiles p on p.id = a.user_id
  where c.challenge_date = p_date and c.status = 'published' and a.status = 'completed'
  window w as (order by (a.correct_count = 5) desc, a.correct_count desc, a.elapsed_ms asc, a.completed_at asc, a.id asc)
  order by rank
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

revoke execute on function public.daily_leaderboard(date, integer) from public;
grant execute on function public.daily_leaderboard(date, integer) to anon, authenticated, service_role;

-- ── authoring helpers ───────────────────────────────────────────────────────
-- Countries used by challenges on or after p_from (to avoid repeating flags across nearby days).
create or replace function public.daily_countries_since(p_from date)
returns table (challenge_date date, iso_code text)
language sql
stable
security definer
set search_path = ''
as $$
  select c.challenge_date, co.iso_code
  from public.daily_challenges c
  join public.daily_challenge_questions q on q.challenge_id = c.id
  join public.countries co on co.id = q.country_id
  where c.challenge_date >= p_from
  order by c.challenge_date, q.position;
$$;

revoke execute on function public.daily_countries_since(date) from public, anon, authenticated;
grant execute on function public.daily_countries_since(date) to service_role;

-- Status of challenges in a date range, with validation problems (for scripts and the admin area).
create or replace function public.daily_challenge_overview(p_from date, p_to date)
returns table (challenge_date date, challenge_id uuid, status text, problems text[], attempts bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select d::date, c.id, coalesce(c.status, 'missing'),
         case when c.id is null then array['no challenge for this date'] else public.validate_daily_challenge(c.id) end,
         (select count(*) from public.daily_attempts a where a.challenge_id = c.id)
  from generate_series(p_from, p_to, interval '1 day') as d
  left join public.daily_challenges c on c.challenge_date = d::date
  order by 1;
$$;

revoke execute on function public.daily_challenge_overview(date, date) from public, anon, authenticated;
grant execute on function public.daily_challenge_overview(date, date) to service_role;
