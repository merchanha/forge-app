-- Fix save_routine UPDATE path: PL/pgSQL variable "tags" shadowed the column
-- "tags", so "tags = tags" raised "column reference tags is ambiguous" and
-- edits failed after create. Rename locals to v_* for clarity.
-- Do not edit earlier migrations.

create or replace function public.save_routine(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
  v_routine_id uuid;
  v_section_id uuid;
  section_json jsonb;
  exercise_json jsonb;
  section_index integer := 0;
  exercise_index integer;
  tag text;
  v_tags text[] := '{}';
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
      v_tags := array_append(v_tags, btrim(tag));
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
      v_tags,
      coalesce(btrim(payload ->> 'objective'), ''),
      coalesce(btrim(payload ->> 'equipment'), ''),
      coalesce(btrim(payload ->> 'scaling'), ''),
      effort
    )
    returning id into v_routine_id;
  else
    v_routine_id := (payload ->> 'id')::uuid;

    update public.routines
    set
      name = btrim(payload ->> 'name'),
      description = coalesce(btrim(payload ->> 'description'), ''),
      category = (payload ->> 'category')::public.routine_category,
      tags = v_tags,
      objective = coalesce(btrim(payload ->> 'objective'), ''),
      equipment = coalesce(btrim(payload ->> 'equipment'), ''),
      scaling = coalesce(btrim(payload ->> 'scaling'), ''),
      effort_rpe = effort
    where id = v_routine_id
      and user_id = actor;

    if not found then
      raise exception 'Routine not found';
    end if;

    delete from public.routine_sections
    where routine_id = v_routine_id
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
      v_routine_id,
      actor,
      section_index,
      btrim(section_json ->> 'name'),
      (section_json ->> 'format')::public.workout_format,
      section_json -> 'formatConfig'
    )
    returning id into v_section_id;

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
          v_section_id,
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

  return v_routine_id;
end;
$$;

revoke all on function public.save_routine(jsonb) from public;
grant execute on function public.save_routine(jsonb) to authenticated;
