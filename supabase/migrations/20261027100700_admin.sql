-- FLAGFORGE · administration: audit log and read models for the admin area.
-- The admin area runs on the server with the service-role client, after requireAdmin() has checked
-- public.is_admin(). Every function here is service_role only and returns jsonb (one value per call).

-- ── audit log ───────────────────────────────────────────────────────────────
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  source text not null default 'admin',
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_source_valid check (source in ('admin', 'script')),
  constraint admin_audit_action_format check (action ~ '^[a-z_.]{3,60}$')
);

create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
-- No client policies. Entries are append-only, even for the service role:
create or replace function public.guard_admin_audit_log()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- The single allowed change: the actor's account was deleted (FK on delete set null). History stays intact.
  if tg_op = 'UPDATE' and old.actor_id is not null and new.actor_id is null
     and (new.id, new.source, new.action, new.target, new.details, new.created_at)
         is not distinct from (old.id, old.source, old.action, old.target, old.details, old.created_at) then
    return new;
  end if;
  raise exception 'audit_log_append_only' using errcode = 'PT409';
end;
$$;

create trigger admin_audit_log_append_only
before update or delete on public.admin_audit_log
for each row execute function public.guard_admin_audit_log();

create or replace function public.admin_log(p_actor_id uuid, p_source text, p_action text, p_target text, p_details jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (actor_id, source, action, target, details)
  values (p_actor_id, coalesce(p_source, 'admin'), p_action, p_target, coalesce(p_details, '{}'::jsonb));
$$;

create or replace function public.admin_audit_recent(p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x.created_at desc, x.id desc), '[]'::jsonb)
  from (
    select l.id, l.source, l.action, l.target, l.details, l.created_at, p.username as actor
    from public.admin_audit_log l
    left join public.profiles p on p.id = l.actor_id
    order by l.created_at desc, l.id desc
    limit least(greatest(coalesce(p_limit, 30), 1), 200)
  ) x;
$$;

-- ── overview ────────────────────────────────────────────────────────────────
create or replace function public.admin_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'players', (select count(*) from public.profiles),
    'players_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'games_7d', (select count(*) from public.game_sessions where status = 'completed' and completed_at >= now() - interval '7 days'),
    'today', public.challenge_today(),
    'today_attempts', (select count(*) from public.daily_attempts a join public.daily_challenges c on c.id = a.challenge_id
                       where c.challenge_date = public.challenge_today()),
    'today_completed', (select count(*) from public.daily_attempts a join public.daily_challenges c on c.id = a.challenge_id
                        where c.challenge_date = public.challenge_today() and a.status = 'completed'),
    -- First date from today on that has no published challenge: how far ahead the calendar is covered.
    'first_unpublished', (
      select min(d)::date from generate_series(public.challenge_today(), public.challenge_today() + 400, interval '1 day') d
      where not exists (select 1 from public.daily_challenges c where c.challenge_date = d::date and c.status = 'published')
    )
  );
$$;

-- Calendar rows for a range, as jsonb (status, problems, attempts, and the five countries in order).
create or replace function public.admin_calendar(p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', o.challenge_date,
    'id', o.challenge_id,
    'status', o.status,
    'problems', to_jsonb(o.problems),
    'attempts', o.attempts,
    'countries', coalesce((
      select jsonb_agg(co.iso_code order by q.position)
      from public.daily_challenge_questions q join public.countries co on co.id = q.country_id
      where q.challenge_id = o.challenge_id
    ), '[]'::jsonb)
  ) order by o.challenge_date), '[]'::jsonb)
  from public.daily_challenge_overview(p_from, least(p_to, p_from + 120)) o;
$$;

-- Full content of one date's challenge, for preview and editing.
create or replace function public.admin_challenge_detail(p_date date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when c.id is null then jsonb_build_object('date', p_date, 'status', 'missing') else jsonb_build_object(
    'date', c.challenge_date,
    'id', c.id,
    'status', c.status,
    'published_at', c.published_at,
    'updated_at', c.updated_at,
    'problems', to_jsonb(public.validate_daily_challenge(c.id)),
    'attempts', (select count(*) from public.daily_attempts a where a.challenge_id = c.id),
    'completed', (select count(*) from public.daily_attempts a where a.challenge_id = c.id and a.status = 'completed'),
    'perfect', (select count(*) from public.daily_attempts a where a.challenge_id = c.id and a.status = 'completed' and a.correct_count = 5),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', q.position,
        'difficulty', q.difficulty,
        'country', co.iso_code,
        'options', (select jsonb_agg(oc.iso_code order by o.position)
                    from public.daily_challenge_question_options o join public.countries oc on oc.id = o.country_id
                    where o.question_id = q.id),
        'answered', (select count(*) from public.daily_attempt_answers x where x.question_id = q.id),
        'correct', (select count(*) from public.daily_attempt_answers x where x.question_id = q.id and x.is_correct)
      ) order by q.position)
      from public.daily_challenge_questions q join public.countries co on co.id = q.country_id
      where q.challenge_id = c.id
    ), '[]'::jsonb)
  ) end
  from (select p_date as d) x
  left join public.daily_challenges c on c.challenge_date = x.d;
$$;

-- Countries used by challenges dated in [p_from, p_to], as {date: [iso…]} — to avoid repeats when generating.
create or replace function public.admin_countries_between(p_from date, p_to date)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(d, isos), '{}'::jsonb)
  from (
    select c.challenge_date::text as d, jsonb_agg(co.iso_code order by q.position) as isos
    from public.daily_challenges c
    join public.daily_challenge_questions q on q.challenge_id = c.id
    join public.countries co on co.id = q.country_id
    where c.challenge_date between p_from and p_to
    group by c.challenge_date
  ) x;
$$;

-- Deletes a draft (never a published challenge — the guard trigger also enforces this).
create or replace function public.admin_delete_draft(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.daily_challenges where id = p_challenge_id and status = 'draft';
  if not found then
    raise exception 'draft_not_found' using errcode = 'PT404';
  end if;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_log(uuid, text, text, text, jsonb)',
    'admin_audit_recent(integer)',
    'admin_overview()',
    'admin_calendar(date, date)',
    'admin_challenge_detail(date)',
    'admin_countries_between(date, date)',
    'admin_delete_draft(uuid)',
    'guard_admin_audit_log()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    if f <> 'guard_admin_audit_log()' then
      execute format('grant execute on function public.%s to service_role', f);
    end if;
  end loop;
end;
$$;
