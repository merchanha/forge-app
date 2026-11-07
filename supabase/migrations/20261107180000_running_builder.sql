-- Phase 8b / design fidelity: Running builder fields + persisted more-options.
-- Do not edit earlier migrations.
--
-- Adds km quantity unit, per-movement pace/zone/repeats, and routine metadata
-- used by CrossFit/HYROX/Running more-options panels.

do $$
begin
  alter type public.quantity_unit add value if not exists 'km';
exception
  when duplicate_object then null;
end $$;

alter table public.routines
  add column if not exists objective text not null default '';

alter table public.routines
  add column if not exists equipment text not null default '';

alter table public.routines
  add column if not exists scaling text not null default '';

alter table public.routines
  add column if not exists effort_rpe smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'routines_objective_trimmed'
      and conrelid = 'public.routines'::regclass
  ) then
    alter table public.routines
      add constraint routines_objective_trimmed check (
        objective = btrim(objective)
        and char_length(objective) <= 80
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'routines_equipment_trimmed'
      and conrelid = 'public.routines'::regclass
  ) then
    alter table public.routines
      add constraint routines_equipment_trimmed check (
        equipment = btrim(equipment)
        and char_length(equipment) <= 80
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'routines_scaling_trimmed'
      and conrelid = 'public.routines'::regclass
  ) then
    alter table public.routines
      add constraint routines_scaling_trimmed check (
        scaling = btrim(scaling)
        and char_length(scaling) <= 80
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'routines_effort_rpe_range'
      and conrelid = 'public.routines'::regclass
  ) then
    alter table public.routines
      add constraint routines_effort_rpe_range check (
        effort_rpe is null
        or (effort_rpe between 1 and 10)
      );
  end if;
end $$;

comment on column public.routines.objective is
  'Builder more-options: Goal (Running) or Objective (other types).';
comment on column public.routines.equipment is
  'Builder more-options: Surface (Running) or Equipment (other types).';
comment on column public.routines.scaling is
  'Builder more-options: Heart-rate zones (Running) or Scaling (other types).';
comment on column public.routines.effort_rpe is
  'Builder more-options: Effort / Strength RPE (1–10).';

alter table public.routine_exercises
  add column if not exists target_pace_seconds_per_km integer;

alter table public.routine_exercises
  add column if not exists hr_zone text;

alter table public.routine_exercises
  add column if not exists segment_repeats integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'routine_exercises_pace_range'
      and conrelid = 'public.routine_exercises'::regclass
  ) then
    alter table public.routine_exercises
      add constraint routine_exercises_pace_range check (
        target_pace_seconds_per_km is null
        or (
          target_pace_seconds_per_km between 150 and 1800
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'routine_exercises_hr_zone_allowed'
      and conrelid = 'public.routine_exercises'::regclass
  ) then
    alter table public.routine_exercises
      add constraint routine_exercises_hr_zone_allowed check (
        hr_zone is null
        or hr_zone in ('Z1', 'Z2', 'Z3', 'Z4', 'Z5')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'routine_exercises_segment_repeats_range'
      and conrelid = 'public.routine_exercises'::regclass
  ) then
    alter table public.routine_exercises
      add constraint routine_exercises_segment_repeats_range check (
        segment_repeats is null
        or (segment_repeats between 1 and 100)
      );
  end if;
end $$;

comment on column public.routine_exercises.target_pace_seconds_per_km is
  'Optional target pace for running segments, stored as seconds per kilometer.';
comment on column public.routine_exercises.hr_zone is
  'Optional heart-rate zone label for running segments (Z1–Z5).';
comment on column public.routine_exercises.segment_repeats is
  'Optional repeat count for interval-style running segments.';

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
  effort smallint;
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

  if payload ->> 'effortRpe' is null
    or btrim(payload ->> 'effortRpe') = '' then
    effort := null;
  else
    effort := (payload ->> 'effortRpe')::smallint;
  end if;

  if payload ->> 'id' is null or btrim(payload ->> 'id') = '' then
    insert into public.routines (
      user_id,
      name,
      description,
      category,
      tags,
      objective,
      equipment,
      scaling,
      effort_rpe
    )
    values (
      actor,
      btrim(payload ->> 'name'),
      coalesce(btrim(payload ->> 'description'), ''),
      (payload ->> 'category')::public.routine_category,
      tags,
      coalesce(btrim(payload ->> 'objective'), ''),
      coalesce(btrim(payload ->> 'equipment'), ''),
      coalesce(btrim(payload ->> 'scaling'), ''),
      effort
    )
    returning id into routine_id;
  else
    routine_id := (payload ->> 'id')::uuid;

    update public.routines
    set
      name = btrim(payload ->> 'name'),
      description = coalesce(btrim(payload ->> 'description'), ''),
      category = (payload ->> 'category')::public.routine_category,
      tags = tags,
      objective = coalesce(btrim(payload ->> 'objective'), ''),
      equipment = coalesce(btrim(payload ->> 'equipment'), ''),
      scaling = coalesce(btrim(payload ->> 'scaling'), ''),
      effort_rpe = effort
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
          notes,
          target_pace_seconds_per_km,
          hr_zone,
          segment_repeats
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
          coalesce(btrim(exercise_json ->> 'notes'), ''),
          case
            when exercise_json ->> 'targetPaceSecondsPerKm' is null
              or btrim(exercise_json ->> 'targetPaceSecondsPerKm') = ''
            then null
            else (exercise_json ->> 'targetPaceSecondsPerKm')::integer
          end,
          case
            when exercise_json ->> 'hrZone' is null
              or btrim(exercise_json ->> 'hrZone') = ''
            then null
            else btrim(exercise_json ->> 'hrZone')
          end,
          case
            when exercise_json ->> 'segmentRepeats' is null
              or btrim(exercise_json ->> 'segmentRepeats') = ''
            then null
            else (exercise_json ->> 'segmentRepeats')::integer
          end
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
    archived_at,
    objective,
    equipment,
    scaling,
    effort_rpe
  )
  values (
    actor,
    left(btrim(source.name) || ' (copy)', 80),
    source.description,
    source.category,
    source.tags,
    false,
    null,
    source.objective,
    source.equipment,
    source.scaling,
    source.effort_rpe
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
      notes,
      target_pace_seconds_per_km,
      hr_zone,
      segment_repeats
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
      notes,
      target_pace_seconds_per_km,
      hr_zone,
      segment_repeats
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
