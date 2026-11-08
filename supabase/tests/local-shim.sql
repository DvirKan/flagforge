-- ─────────────────────────────────────────────────────────────────────────────
-- TEST-ONLY: emulates the parts of a Supabase database that migrations depend on,
-- so migrations, RLS policies and functions can be tested on plain PostgreSQL.
-- Never run against a real Supabase project.
--
-- It deliberately reproduces Supabase's *permissive* defaults (anon/authenticated get ALL
-- on new public tables and functions) so tests prove that our migrations revoke them.
-- ─────────────────────────────────────────────────────────────────────────────
-- Roles are cluster-wide and test files set up their databases in parallel: on a fresh server two files can
-- both see a role missing and race to create it, so "already exists" is tolerated.
do $$
declare r record;
begin
  for r in select * from (values ('anon', ''), ('authenticated', ''), ('service_role', ' bypassrls')) v(name, extra) loop
    if not exists (select 1 from pg_roles where rolname = r.name) then
      begin
        execute format('create role %I nologin noinherit%s', r.name, r.extra);
      exception when duplicate_object or unique_violation then
        null; -- created concurrently by another test file
      end;
    end if;
  end loop;
end $$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  email_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
