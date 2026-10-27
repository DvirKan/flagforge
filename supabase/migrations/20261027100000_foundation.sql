-- FLAGFORGE · foundation: profiles, roles, shared helpers.
-- Conventions:
--   * RLS is enabled on every table; anon/authenticated privileges are revoked and re-granted minimally.
--   * Functions that mutate authoritative data are SECURITY DEFINER with an empty search_path and are
--     executable only by service_role (the Next.js server). Clients never write results directly.

-- ── helpers ──────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Username rule shared by the table constraint and the signup trigger.
create or replace function public.is_valid_username(p_username text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_username ~ '^[a-z0-9_]{3,20}$'
     and p_username not in ('admin', 'administrator', 'root', 'system', 'support', 'flagforge', 'moderator', 'null', 'undefined');
$$;

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  avatar_url text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_valid check (public.is_valid_username(username)),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) between 1 and 40),
  constraint profiles_avatar_url_https check (avatar_url is null or avatar_url ~ '^https://'),
  constraint profiles_language_valid check (preferred_language in ('en', 'he'))
);

create unique index profiles_username_key on public.profiles (username);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
-- Owners read their full row; they may change only these columns.
grant select on public.profiles to authenticated;
grant update (username, display_name, avatar_url, preferred_language) on public.profiles to authenticated;

create policy "profiles: owner can read"
on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy "profiles: owner can update"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Public projection: only fields that are meant to be public. No user ids, no email, no language.
create view public.public_profiles
with (security_barrier = true)
as
  select username, display_name, avatar_url, created_at
  from public.profiles;

revoke all on public.public_profiles from anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- ── profile creation on signup ──────────────────────────────────────────────
-- The requested username comes from signup metadata. If it is invalid or already taken (race), a unique
-- fallback is generated so signup never fails halfway; the user can rename it in Settings.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  lang text := coalesce(new.raw_user_meta_data ->> 'preferred_language', 'en');
  candidate text;
begin
  if lang not in ('en', 'he') then
    lang := 'en';
  end if;

  if public.is_valid_username(requested)
     and not exists (select 1 from public.profiles where username = requested) then
    candidate := requested;
  else
    loop
      candidate := 'player_' || substr(md5(gen_random_uuid()::text), 1, 8);
      exit when not exists (select 1 from public.profiles where username = candidate);
    end loop;
  end if;

  insert into public.profiles (id, username, preferred_language)
  values (new.id, candidate, lang);
  return new;
exception
  when unique_violation then
    -- Concurrent signup took the same name between the check and the insert: fall back.
    insert into public.profiles (id, username, preferred_language)
    values (new.id, 'player_' || substr(md5(gen_random_uuid()::text), 1, 8), lang);
    return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Availability check used by the signup form (usernames are public anyway).
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_valid_username(lower(p_username))
     and not exists (select 1 from public.profiles where username = lower(p_username));
$$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated, service_role;

-- ── roles (administrators) ──────────────────────────────────────────────────
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role),
  constraint user_roles_role_valid check (role in ('admin'))
);

alter table public.user_roles enable row level security;
revoke all on public.user_roles from anon, authenticated;
-- No client policies: roles are granted only with SQL by the project owner (see docs/SUPABASE.md).

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.user_roles where user_id = p_user_id and role = 'admin');
$$;

revoke execute on function public.is_admin(uuid) from public, anon, authenticated;
grant execute on function public.is_admin(uuid) to service_role;
