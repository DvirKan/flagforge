-- FLAGFORGE · usernames may use English letters (any case), Hebrew letters, digits and underscores.
-- Uniqueness becomes case-insensitive ("Dvir" and "dvir" are the same name), while the chosen casing is kept.

create or replace function public.is_valid_username(p_username text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_username ~ '^[A-Za-z0-9_א-ת]{3,20}$'
     and lower(p_username) not in ('admin', 'administrator', 'root', 'system', 'support', 'flagforge', 'moderator', 'null', 'undefined');
$$;

drop index if exists public.profiles_username_key;
create unique index profiles_username_lower_key on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := trim(coalesce(new.raw_user_meta_data ->> 'username', ''));
  lang text := coalesce(new.raw_user_meta_data ->> 'preferred_language', 'en');
  candidate text;
begin
  if lang not in ('en', 'he') then
    lang := 'en';
  end if;

  if public.is_valid_username(requested)
     and not exists (select 1 from public.profiles where lower(username) = lower(requested)) then
    candidate := requested;
  else
    loop
      candidate := 'player_' || substr(md5(gen_random_uuid()::text), 1, 8);
      exit when not exists (select 1 from public.profiles where lower(username) = lower(candidate));
    end loop;
  end if;

  insert into public.profiles (id, username, preferred_language)
  values (new.id, candidate, lang);
  return new;
exception
  when unique_violation then
    insert into public.profiles (id, username, preferred_language)
    values (new.id, 'player_' || substr(md5(gen_random_uuid()::text), 1, 8), lang);
    return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_valid_username(trim(p_username))
     and not exists (select 1 from public.profiles where lower(username) = lower(trim(p_username)));
$$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated, service_role;
