-- Phase 6: profile preferences (theme, onboarding fields).
-- Do not edit or re-apply earlier migrations.
--
-- Prerequisite: Phase 1–5 versions should be recorded in schema_migrations.
-- Phase 3–5 migration files are idempotent if schema already exists.

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'profile_theme'
  ) then
    create type public.profile_theme as enum ('dark', 'light');
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'experience_level'
  ) then
    create type public.experience_level as enum (
      'beginner',
      'intermediate',
      'advanced'
    );
  end if;

  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'training_goal'
  ) then
    create type public.training_goal as enum (
      'endurance',
      'general_fitness',
      'strength',
      'competition'
    );
  end if;
end $$;

alter table public.profiles
  add column if not exists theme public.profile_theme not null default 'dark';

alter table public.profiles
  add column if not exists experience_level public.experience_level;

alter table public.profiles
  add column if not exists disciplines text[] not null default '{}'::text[];

alter table public.profiles
  add column if not exists primary_discipline text;

alter table public.profiles
  add column if not exists goal public.training_goal;

alter table public.profiles
  add column if not exists days_per_week smallint;

alter table public.profiles
  add column if not exists target_event text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_disciplines_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_disciplines_length
      check (cardinality(disciplines) <= 8);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_disciplines_allowed'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_disciplines_allowed
      check (
        disciplines <@ array[
          'CrossFit',
          'HYROX',
          'Running',
          'Functional Fitness',
          'Strength'
        ]::text[]
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_primary_discipline_in_list'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_primary_discipline_in_list
      check (
        primary_discipline is null
        or primary_discipline = any (disciplines)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_days_per_week_range'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_days_per_week_range
      check (
        days_per_week is null
        or (days_per_week >= 1 and days_per_week <= 7)
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_target_event_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_target_event_length
      check (
        target_event = btrim(target_event)
        and char_length(target_event) <= 80
      );
  end if;
end $$;

comment on column public.profiles.theme is
  'UI theme preference; dark is default. Applied via data-theme on the document.';
comment on column public.profiles.experience_level is
  'Optional onboarding experience level.';
comment on column public.profiles.disciplines is
  'Selected training disciplines from a fixed allowlist.';
comment on column public.profiles.primary_discipline is
  'Primary discipline; must be one of disciplines when set.';
comment on column public.profiles.goal is
  'Optional main training goal.';
comment on column public.profiles.days_per_week is
  'Optional planned training days per week (1–7).';
comment on column public.profiles.target_event is
  'Optional target event label (e.g. Open qualifier).';

-- Owner-only RLS policies from Phase 1 remain unchanged.
