-- Phase 2: user-owned exercises. Do not edit or re-apply 20261104210000_profiles.sql.
-- Starter rows are private copies. There is no shared catalog row.

create type public.exercise_movement_category as enum (
  'olympic',
  'strength',
  'gymnastics',
  'conditioning',
  'monostructural',
  'mobility',
  'other'
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  movement_category public.exercise_movement_category not null,
  equipment text not null,
  demo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint exercises_name_trimmed check (
    name = btrim(name)
    and char_length(name) between 1 and 80
  ),
  constraint exercises_description_trimmed check (
    description = btrim(description)
    and char_length(description) <= 500
  ),
  constraint exercises_equipment_trimmed check (
    equipment = btrim(equipment)
    and char_length(equipment) between 1 and 40
  ),
  constraint exercises_demo_url_allowed check (
    demo_url is null
    or (
      char_length(demo_url) <= 300
      and demo_url = btrim(demo_url)
      and demo_url ~* '^https://(www\.youtube\.com|m\.youtube\.com|youtube\.com|youtu\.be|www\.youtube-nocookie\.com|youtube-nocookie\.com|player\.vimeo\.com|www\.vimeo\.com|vimeo\.com)/[^[:space:]]+$'
    )
  )
);

comment on table public.exercises is
  'Athlete-owned exercise definitions. Starter rows are per-user copies.';
comment on column public.exercises.demo_url is
  'Optional https YouTube or Vimeo URL. The app does not fetch this URL.';

create index exercises_user_id_name_idx on public.exercises (user_id, name);

create or replace function public.set_exercises_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger exercises_set_updated_at
before update on public.exercises
for each row
execute function public.set_exercises_updated_at();

alter table public.exercises enable row level security;

create policy "exercises_select_own"
on public.exercises
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "exercises_insert_own"
on public.exercises
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "exercises_update_own"
on public.exercises
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "exercises_delete_own"
on public.exercises
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Copies the small starter set onto one athlete. Not idempotent.
-- Revoked from client roles so it cannot insert rows for another user.
create or replace function public.seed_starter_exercises(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.exercises (
    user_id,
    name,
    description,
    movement_category,
    equipment
  )
  values
    (
      target_user_id,
      'Power Clean',
      'Olympic lift from the floor to the shoulders.',
      'olympic',
      'Barbell'
    ),
    (
      target_user_id,
      'Front squat',
      'Squat with the bar racked on the front of the shoulders.',
      'strength',
      'Barbell'
    ),
    (
      target_user_id,
      'Pull-up',
      'Vertical pull from a hanging position.',
      'gymnastics',
      'Rig'
    ),
    (
      target_user_id,
      'Burpee',
      'Squat, plank, and jump sequence.',
      'conditioning',
      'Bodyweight'
    ),
    (
      target_user_id,
      'Wall ball',
      'Squat and throw to a target with a medicine ball.',
      'conditioning',
      'Medicine ball'
    ),
    (
      target_user_id,
      'Easy run',
      'Steady aerobic run.',
      'monostructural',
      'None'
    ),
    (
      target_user_id,
      'Row',
      'Rowing machine distance or time.',
      'monostructural',
      'Rower'
    ),
    (
      target_user_id,
      'Farmers carry',
      'Walk while carrying a load in each hand.',
      'strength',
      'Kettlebells'
    );
end;
$$;

revoke all on function public.seed_starter_exercises(uuid) from public;
revoke all on function public.seed_starter_exercises(uuid) from anon;
revoke all on function public.seed_starter_exercises(uuid) from authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), '')
  );

  perform public.seed_starter_exercises(new.id);

  return new;
end;
$$;

-- One-time copies for athletes who signed up before this migration.
do $$
declare
  athlete_id uuid;
begin
  for athlete_id in
    select profiles.id
    from public.profiles
    where not exists (
      select 1
      from public.exercises
      where exercises.user_id = profiles.id
    )
  loop
    perform public.seed_starter_exercises(athlete_id);
  end loop;
end;
$$;
