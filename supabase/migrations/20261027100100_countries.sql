-- FLAGFORGE · countries (reference data). Rows are loaded by the generated *_countries_data migration.

create table public.countries (
  id uuid primary key default gen_random_uuid(),
  iso_code text not null,
  name_en text not null,
  name_he text not null,
  difficulty text not null,
  continent text not null,
  capital_en text,
  capital_he text,
  flag_asset text not null,
  fact_en text,
  fact_he text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint countries_iso_code_format check (iso_code ~ '^[A-Z]{2}$'),
  constraint countries_name_en_nonempty check (char_length(trim(name_en)) > 0),
  constraint countries_name_he_nonempty check (char_length(trim(name_he)) > 0),
  constraint countries_difficulty_valid check (difficulty in ('easy', 'medium', 'hard')),
  constraint countries_continent_valid check (continent in ('africa', 'asia', 'europe', 'north-america', 'south-america', 'oceania')),
  constraint countries_flag_asset_format check (flag_asset ~ '^flags/4x3/[a-z]{2}\.svg$')
);

create unique index countries_iso_code_key on public.countries (iso_code);
create unique index countries_name_en_key on public.countries (lower(name_en));
create unique index countries_name_he_key on public.countries (name_he);
create index countries_difficulty_idx on public.countries (difficulty);

create trigger countries_set_updated_at
before update on public.countries
for each row execute function public.set_updated_at();

alter table public.countries enable row level security;
revoke all on public.countries from anon, authenticated;
grant select on public.countries to anon, authenticated;

-- Country metadata is public reference data. Writes happen only through service_role (admin tooling).
create policy "countries: readable by everyone"
on public.countries for select
to anon, authenticated
using (true);
