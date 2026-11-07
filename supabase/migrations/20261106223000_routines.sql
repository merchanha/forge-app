-- Phase 3: user-owned routines with ordered sections and format configs.
-- Do not edit or re-apply 20261104210000_profiles.sql or 20261106193000_exercises.sql.
--
-- Idempotent on purpose: this schema was applied out-of-band on the linked project
-- before schema_migrations recorded 20261106223000. Re-running must succeed so the
-- migration runner can mark it applied, then continue to Phase 4.

do $$
begin
  create type public.routine_category as enum (
  'crossfit',
  'hyrox',
  'running',
  'custom'
);
exception
  when duplicate_object then null;
end $$;


do $$
begin
  create type public.workout_format as enum (
  'amrap',
  'emom',
  'for_time',
  'rounds_for_time',
  'tabata',
  'intervals',
  'strength',
  'running',
  'custom'
);
exception
  when duplicate_object then null;
end $$;


do $$
begin
  create type public.quantity_unit as enum (
  'reps',
  'm',
  'cal',
  'min'
);
exception
  when duplicate_object then null;
end $$;


-- Composite ownership keys for child FKs.
do $$
begin
  alter table public.exercises
    add constraint exercises_id_user_id_key unique (id, user_id);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  category public.routine_category not null default 'custom',
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint routines_name_trimmed check (
    name = btrim(name)
    and char_length(name) between 1 and 80
  ),
  constraint routines_description_trimmed check (
    description = btrim(description)
    and char_length(description) <= 500
  ),
  constraint routines_tags_limit check (cardinality(tags) <= 12),
  constraint routines_id_user_id_key unique (id, user_id)
);

comment on table public.routines is
  'Athlete-owned workout templates. Results are never stored here.';

create index if not exists routines_user_id_archived_at_idx
  on public.routines (user_id, archived_at);
create index if not exists routines_user_id_name_idx
  on public.routines (user_id, name);
create index if not exists routines_user_id_is_favorite_idx
  on public.routines (user_id, is_favorite)
  where is_favorite = true;

create or replace function public.set_routines_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists routines_set_updated_at on public.routines;
create trigger routines_set_updated_at
before update on public.routines
for each row
execute function public.set_routines_updated_at();

create or replace function public.is_valid_format_config(
  format public.workout_format,
  config jsonb
)
returns boolean
language plpgsql
immutable
as $$
declare
  keys text[];
  timer_mode text;
begin
  if config is null or jsonb_typeof(config) <> 'object' then
    return false;
  end if;

  keys := array(select jsonb_object_keys(config));

  case format
    when 'amrap' then
      return keys = array['durationSeconds']
        and jsonb_typeof(config -> 'durationSeconds') = 'number'
        and (config ->> 'durationSeconds')::numeric
          between 30 and 7200
        and (config ->> 'durationSeconds')::numeric
          = trunc((config ->> 'durationSeconds')::numeric);

    when 'emom' then
      return (
          select array_agg(k order by k) = array['durationSeconds', 'intervalSeconds']
          from unnest(keys) as k
        )
        and jsonb_typeof(config -> 'durationSeconds') = 'number'
        and jsonb_typeof(config -> 'intervalSeconds') = 'number'
        and (config ->> 'durationSeconds')::numeric between 60 and 7200
        and (config ->> 'intervalSeconds')::numeric between 15 and 600
        and (config ->> 'durationSeconds')::numeric
          = trunc((config ->> 'durationSeconds')::numeric)
        and (config ->> 'intervalSeconds')::numeric
          = trunc((config ->> 'intervalSeconds')::numeric)
        and mod(
          (config ->> 'durationSeconds')::int,
          (config ->> 'intervalSeconds')::int
        ) = 0;

    when 'for_time' then
      return (
          select array_agg(k order by k)
          from unnest(keys) as k
        ) in (
          array['rounds'],
          array['rounds', 'timeCapSeconds']
        )
        and jsonb_typeof(config -> 'rounds') = 'number'
        and (config ->> 'rounds')::numeric between 1 and 100
        and (config ->> 'rounds')::numeric
          = trunc((config ->> 'rounds')::numeric)
        and (
          not (config ? 'timeCapSeconds')
          or (
            jsonb_typeof(config -> 'timeCapSeconds') = 'number'
            and (config ->> 'timeCapSeconds')::numeric between 30 and 7200
            and (config ->> 'timeCapSeconds')::numeric
              = trunc((config ->> 'timeCapSeconds')::numeric)
          )
        );

    when 'rounds_for_time' then
      return (
          select array_agg(k order by k)
          from unnest(keys) as k
        ) in (
          array['rounds'],
          array['rounds', 'timeCapSeconds']
        )
        and jsonb_typeof(config -> 'rounds') = 'number'
        and (config ->> 'rounds')::numeric between 1 and 100
        and (config ->> 'rounds')::numeric
          = trunc((config ->> 'rounds')::numeric)
        and (
          not (config ? 'timeCapSeconds')
          or (
            jsonb_typeof(config -> 'timeCapSeconds') = 'number'
            and (config ->> 'timeCapSeconds')::numeric between 30 and 7200
            and (config ->> 'timeCapSeconds')::numeric
              = trunc((config ->> 'timeCapSeconds')::numeric)
          )
        );

    when 'tabata' then
      return (
          select array_agg(k order by k) = array['restSeconds', 'rounds', 'workSeconds']
          from unnest(keys) as k
        )
        and jsonb_typeof(config -> 'workSeconds') = 'number'
        and jsonb_typeof(config -> 'restSeconds') = 'number'
        and jsonb_typeof(config -> 'rounds') = 'number'
        and (config ->> 'workSeconds')::numeric between 5 and 600
        and (config ->> 'restSeconds')::numeric between 0 and 600
        and (config ->> 'rounds')::numeric between 1 and 60
        and (config ->> 'workSeconds')::numeric
          = trunc((config ->> 'workSeconds')::numeric)
        and (config ->> 'restSeconds')::numeric
          = trunc((config ->> 'restSeconds')::numeric)
        and (config ->> 'rounds')::numeric
          = trunc((config ->> 'rounds')::numeric);

    when 'intervals' then
      return (
          select array_agg(k order by k) = array['restSeconds', 'rounds', 'workSeconds']
          from unnest(keys) as k
        )
        and jsonb_typeof(config -> 'workSeconds') = 'number'
        and jsonb_typeof(config -> 'restSeconds') = 'number'
        and jsonb_typeof(config -> 'rounds') = 'number'
        and (config ->> 'workSeconds')::numeric between 5 and 3600
        and (config ->> 'restSeconds')::numeric between 0 and 3600
        and (config ->> 'rounds')::numeric between 1 and 100
        and (config ->> 'workSeconds')::numeric
          = trunc((config ->> 'workSeconds')::numeric)
        and (config ->> 'restSeconds')::numeric
          = trunc((config ->> 'restSeconds')::numeric)
        and (config ->> 'rounds')::numeric
          = trunc((config ->> 'rounds')::numeric);

    when 'strength' then
      return (
          select array_agg(k order by k)
          from unnest(keys) as k
        ) in (
          array['reps', 'restSeconds', 'sets'],
          array['reps', 'restSeconds', 'rpe', 'sets']
        )
        and jsonb_typeof(config -> 'sets') = 'number'
        and jsonb_typeof(config -> 'reps') = 'number'
        and jsonb_typeof(config -> 'restSeconds') = 'number'
        and (config ->> 'sets')::numeric between 1 and 20
        and (config ->> 'reps')::numeric between 1 and 100
        and (config ->> 'restSeconds')::numeric between 0 and 900
        and (config ->> 'sets')::numeric
          = trunc((config ->> 'sets')::numeric)
        and (config ->> 'reps')::numeric
          = trunc((config ->> 'reps')::numeric)
        and (config ->> 'restSeconds')::numeric
          = trunc((config ->> 'restSeconds')::numeric)
        and (
          not (config ? 'rpe')
          or (
            jsonb_typeof(config -> 'rpe') = 'number'
            and (config ->> 'rpe')::numeric between 1 and 10
          )
        );

    when 'running' then
      return (
          select array_agg(k order by k)
          from unnest(keys) as k
        ) in (
          array['distanceMeters'],
          array['distanceMeters', 'targetPaceSecondsPerKm']
        )
        and jsonb_typeof(config -> 'distanceMeters') = 'number'
        and (config ->> 'distanceMeters')::numeric between 50 and 100000
        and (config ->> 'distanceMeters')::numeric
          = trunc((config ->> 'distanceMeters')::numeric)
        and (
          not (config ? 'targetPaceSecondsPerKm')
          or (
            jsonb_typeof(config -> 'targetPaceSecondsPerKm') = 'number'
            and (config ->> 'targetPaceSecondsPerKm')::numeric
              between 120 and 1800
            and (config ->> 'targetPaceSecondsPerKm')::numeric
              = trunc((config ->> 'targetPaceSecondsPerKm')::numeric)
          )
        );

    when 'custom' then
      timer_mode := config ->> 'timerMode';
      if timer_mode = 'none' or timer_mode = 'stopwatch' then
        return keys = array['timerMode'];
      end if;
      if timer_mode = 'countdown' then
        return (
            select array_agg(k order by k) = array['durationSeconds', 'timerMode']
            from unnest(keys) as k
          )
          and jsonb_typeof(config -> 'durationSeconds') = 'number'
          and (config ->> 'durationSeconds')::numeric between 30 and 7200
          and (config ->> 'durationSeconds')::numeric
            = trunc((config ->> 'durationSeconds')::numeric);
      end if;
      return false;

    else
      return false;
  end case;
end;
$$;

create table if not exists public.routine_sections (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null,
  user_id uuid not null,
  sort_order integer not null,
  name text not null,
  format public.workout_format not null,
  format_config jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint routine_sections_name_trimmed check (
    name = btrim(name)
    and char_length(name) between 1 and 80
  ),
  constraint routine_sections_sort_order_nonneg check (sort_order >= 0),
  constraint routine_sections_format_config_valid check (
    public.is_valid_format_config(format, format_config)
  ),
  constraint routine_sections_id_user_id_key unique (id, user_id),
  constraint routine_sections_routine_owner_fkey
    foreign key (routine_id, user_id)
    references public.routines (id, user_id)
    on delete cascade
);

comment on table public.routine_sections is
  'Ordered parts of a routine. Each section has one validated workout format.';

create index if not exists routine_sections_routine_id_sort_order_idx
  on public.routine_sections (routine_id, sort_order);

create or replace function public.set_routine_sections_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists routine_sections_set_updated_at on public.routine_sections;
create trigger routine_sections_set_updated_at
before update on public.routine_sections
for each row
execute function public.set_routine_sections_updated_at();

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null,
  user_id uuid not null,
  exercise_id uuid not null,
  sort_order integer not null,
  quantity numeric(10, 2) not null,
  quantity_unit public.quantity_unit not null,
  load_value numeric(10, 2),
  load_unit public.preferred_units,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint routine_exercises_sort_order_nonneg check (sort_order >= 0),
  constraint routine_exercises_quantity_positive check (quantity > 0),
  constraint routine_exercises_load_pair check (
    (load_value is null and load_unit is null)
    or (
      load_value is not null
      and load_unit is not null
      and load_value >= 0
    )
  ),
  constraint routine_exercises_notes_trimmed check (
    notes = btrim(notes)
    and char_length(notes) <= 300
  ),
  constraint routine_exercises_section_owner_fkey
    foreign key (section_id, user_id)
    references public.routine_sections (id, user_id)
    on delete cascade,
  constraint routine_exercises_exercise_owner_fkey
    foreign key (exercise_id, user_id)
    references public.exercises (id, user_id)
    on delete restrict
);

comment on table public.routine_exercises is
  'Ordered exercise prescriptions inside a routine section.';
comment on column public.routine_exercises.load_unit is
  'Explicit load unit. Never inferred from profile at read time.';

create index if not exists routine_exercises_section_id_sort_order_idx
  on public.routine_exercises (section_id, sort_order);
create index if not exists routine_exercises_exercise_id_idx
  on public.routine_exercises (exercise_id);

create or replace function public.set_routine_exercises_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists routine_exercises_set_updated_at on public.routine_exercises;
create trigger routine_exercises_set_updated_at
before update on public.routine_exercises
for each row
execute function public.set_routine_exercises_updated_at();

alter table public.routines enable row level security;
alter table public.routine_sections enable row level security;
alter table public.routine_exercises enable row level security;

drop policy if exists "routines_select_own" on public.routines;
create policy "routines_select_own"
on public.routines
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "routines_insert_own" on public.routines;
create policy "routines_insert_own"
on public.routines
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "routines_update_own" on public.routines;
create policy "routines_update_own"
on public.routines
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "routines_delete_own" on public.routines;
create policy "routines_delete_own"
on public.routines
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "routine_sections_select_own" on public.routine_sections;
create policy "routine_sections_select_own"
on public.routine_sections
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "routine_sections_insert_own" on public.routine_sections;
create policy "routine_sections_insert_own"
on public.routine_sections
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "routine_sections_update_own" on public.routine_sections;
create policy "routine_sections_update_own"
on public.routine_sections
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "routine_sections_delete_own" on public.routine_sections;
create policy "routine_sections_delete_own"
on public.routine_sections
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "routine_exercises_select_own" on public.routine_exercises;
create policy "routine_exercises_select_own"
on public.routine_exercises
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "routine_exercises_insert_own" on public.routine_exercises;
create policy "routine_exercises_insert_own"
on public.routine_exercises
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "routine_exercises_update_own" on public.routine_exercises;
create policy "routine_exercises_update_own"
on public.routine_exercises
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "routine_exercises_delete_own" on public.routine_exercises;
create policy "routine_exercises_delete_own"
on public.routine_exercises
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Replaces a routine template and its sections in one transaction under RLS.
create or replace function public.save_routine(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
  routine_id uuid;
  section_id uuid;
  section_json jsonb;
  exercise_json jsonb;
  section_index integer := 0;
  exercise_index integer;
  tag text;
  tags text[] := '{}';
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;

  if jsonb_typeof(payload) <> 'object' then
    raise exception 'Invalid routine payload';
  end if;

  if payload ? 'tags' and jsonb_typeof(payload -> 'tags') = 'array' then
    for tag in
      select jsonb_array_elements_text(payload -> 'tags')
    loop
      tags := array_append(tags, btrim(tag));
    end loop;
  end if;

  if payload ->> 'id' is null or btrim(payload ->> 'id') = '' then
    insert into public.routines (
      user_id,
      name,
      description,
      category,
      tags
    )
    values (
      actor,
      btrim(payload ->> 'name'),
      coalesce(btrim(payload ->> 'description'), ''),
      (payload ->> 'category')::public.routine_category,
      tags
    )
    returning id into routine_id;
  else
    routine_id := (payload ->> 'id')::uuid;

    update public.routines
    set
      name = btrim(payload ->> 'name'),
      description = coalesce(btrim(payload ->> 'description'), ''),
      category = (payload ->> 'category')::public.routine_category,
      tags = tags
    where id = routine_id
      and user_id = actor;

    if not found then
      raise exception 'Routine not found';
    end if;

    delete from public.routine_sections
    where routine_id = save_routine.routine_id
      and user_id = actor;
  end if;

  if jsonb_typeof(payload -> 'sections') <> 'array'
    or jsonb_array_length(payload -> 'sections') < 1 then
    raise exception 'At least one section is required';
  end if;

  for section_json in
    select value
    from jsonb_array_elements(payload -> 'sections')
  loop
    insert into public.routine_sections (
      routine_id,
      user_id,
      sort_order,
      name,
      format,
      format_config
    )
    values (
      routine_id,
      actor,
      section_index,
      btrim(section_json ->> 'name'),
      (section_json ->> 'format')::public.workout_format,
      section_json -> 'formatConfig'
    )
    returning id into section_id;

    exercise_index := 0;
    if section_json ? 'exercises'
      and jsonb_typeof(section_json -> 'exercises') = 'array' then
      for exercise_json in
        select value
        from jsonb_array_elements(section_json -> 'exercises')
      loop
        insert into public.routine_exercises (
          section_id,
          user_id,
          exercise_id,
          sort_order,
          quantity,
          quantity_unit,
          load_value,
          load_unit,
          notes
        )
        values (
          section_id,
          actor,
          (exercise_json ->> 'exerciseId')::uuid,
          exercise_index,
          (exercise_json ->> 'quantity')::numeric,
          (exercise_json ->> 'quantityUnit')::public.quantity_unit,
          case
            when exercise_json ->> 'loadValue' is null
              or btrim(exercise_json ->> 'loadValue') = ''
            then null
            else (exercise_json ->> 'loadValue')::numeric
          end,
          case
            when exercise_json ->> 'loadUnit' is null
              or btrim(exercise_json ->> 'loadUnit') = ''
            then null
            else (exercise_json ->> 'loadUnit')::public.preferred_units
          end,
          coalesce(btrim(exercise_json ->> 'notes'), '')
        );
        exercise_index := exercise_index + 1;
      end loop;
    end if;

    section_index := section_index + 1;
  end loop;

  return routine_id;
end;
$$;

revoke all on function public.save_routine(jsonb) from public;
grant execute on function public.save_routine(jsonb) to authenticated;

create or replace function public.duplicate_routine(source_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
  new_id uuid;
  source public.routines%rowtype;
  section public.routine_sections%rowtype;
  new_section_id uuid;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into source
  from public.routines
  where id = source_id
    and user_id = actor;

  if not found then
    raise exception 'Routine not found';
  end if;

  insert into public.routines (
    user_id,
    name,
    description,
    category,
    tags,
    is_favorite,
    archived_at
  )
  values (
    actor,
    left(btrim(source.name) || ' (copy)', 80),
    source.description,
    source.category,
    source.tags,
    false,
    null
  )
  returning id into new_id;

  for section in
    select *
    from public.routine_sections
    where routine_id = source_id
      and user_id = actor
    order by sort_order
  loop
    insert into public.routine_sections (
      routine_id,
      user_id,
      sort_order,
      name,
      format,
      format_config
    )
    values (
      new_id,
      actor,
      section.sort_order,
      section.name,
      section.format,
      section.format_config
    )
    returning id into new_section_id;

    insert into public.routine_exercises (
      section_id,
      user_id,
      exercise_id,
      sort_order,
      quantity,
      quantity_unit,
      load_value,
      load_unit,
      notes
    )
    select
      new_section_id,
      actor,
      exercise_id,
      sort_order,
      quantity,
      quantity_unit,
      load_value,
      load_unit,
      notes
    from public.routine_exercises
    where section_id = section.id
      and user_id = actor
    order by sort_order;
  end loop;

  return new_id;
end;
$$;

revoke all on function public.duplicate_routine(uuid) from public;
grant execute on function public.duplicate_routine(uuid) to authenticated;
