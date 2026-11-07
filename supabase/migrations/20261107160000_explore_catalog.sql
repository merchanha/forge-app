-- Phase 8: curated Explore catalog (read-only for athletes; copy into owned routines).
-- Do not edit or re-apply earlier migrations.
--
-- Prerequisite: Phase 1–6 versions should be recorded in schema_migrations.
-- Phase 3–6 migration files are idempotent if schema already exists, so a push
-- can record them before this file runs.

create table if not exists public.explore_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text not null default '',
  category public.routine_category not null default 'custom',
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint explore_templates_slug_key unique (slug),
  constraint explore_templates_slug_trimmed check (
    slug = btrim(slug)
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    and char_length(slug) between 2 and 60
  ),
  constraint explore_templates_name_trimmed check (
    name = btrim(name)
    and char_length(name) between 1 and 80
  ),
  constraint explore_templates_description_trimmed check (
    description = btrim(description)
    and char_length(description) <= 500
  ),
  constraint explore_templates_tags_limit check (cardinality(tags) <= 12)
);

comment on table public.explore_templates is
  'Curated system workout templates. Athletes may select and copy, never mutate.';

create table if not exists public.explore_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.explore_templates (id) on delete cascade,
  sort_order integer not null,
  name text not null,
  format public.workout_format not null,
  format_config jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint explore_sections_name_trimmed check (
    name = btrim(name)
    and char_length(name) between 1 and 80
  ),
  constraint explore_sections_sort_order_nonneg check (sort_order >= 0),
  constraint explore_sections_format_config_valid check (
    public.is_valid_format_config(format, format_config)
  ),
  constraint explore_sections_template_sort_key unique (template_id, sort_order)
);

comment on table public.explore_sections is
  'Ordered sections for a curated Explore template.';

create table if not exists public.explore_movements (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.explore_sections (id) on delete cascade,
  sort_order integer not null,
  exercise_name text not null,
  exercise_description text not null default '',
  movement_category public.exercise_movement_category not null,
  equipment text not null,
  quantity numeric not null,
  quantity_unit public.quantity_unit not null,
  load_value numeric,
  load_unit public.preferred_units,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  constraint explore_movements_name_trimmed check (
    exercise_name = btrim(exercise_name)
    and char_length(exercise_name) between 1 and 80
  ),
  constraint explore_movements_description_trimmed check (
    exercise_description = btrim(exercise_description)
    and char_length(exercise_description) <= 500
  ),
  constraint explore_movements_equipment_trimmed check (
    equipment = btrim(equipment)
    and char_length(equipment) between 1 and 40
  ),
  constraint explore_movements_notes_trimmed check (
    notes = btrim(notes)
    and char_length(notes) <= 300
  ),
  constraint explore_movements_quantity_positive check (quantity > 0 and quantity <= 100000),
  constraint explore_movements_load_pair check (
    (load_value is null and load_unit is null)
    or (
      load_value is not null
      and load_unit is not null
      and load_value >= 0
      and load_value <= 10000
    )
  ),
  constraint explore_movements_sort_order_nonneg check (sort_order >= 0),
  constraint explore_movements_section_sort_key unique (section_id, sort_order)
);

comment on table public.explore_movements is
  'Denormalized movement prescriptions for Explore. No FK to user exercises.';

create index if not exists explore_templates_sort_order_idx
  on public.explore_templates (sort_order, name);
create index if not exists explore_sections_template_id_idx
  on public.explore_sections (template_id, sort_order);
create index if not exists explore_movements_section_id_idx
  on public.explore_movements (section_id, sort_order);

alter table public.explore_templates enable row level security;
alter table public.explore_sections enable row level security;
alter table public.explore_movements enable row level security;

drop policy if exists "explore_templates_select_authenticated" on public.explore_templates;
create policy "explore_templates_select_authenticated"
on public.explore_templates
for select
to authenticated
using (true);

drop policy if exists "explore_sections_select_authenticated" on public.explore_sections;
create policy "explore_sections_select_authenticated"
on public.explore_sections
for select
to authenticated
using (true);

drop policy if exists "explore_movements_select_authenticated" on public.explore_movements;
create policy "explore_movements_select_authenticated"
on public.explore_movements
for select
to authenticated
using (true);

-- Seed a small curated set once (idempotent by slug).
do $$
declare
  helen_id uuid;
  hyrox_id uuid;
  threshold_id uuid;
  section_id uuid;
begin
  insert into public.explore_templates (
    slug, name, description, category, tags, sort_order
  )
  values (
    'helen-style',
    'Helen-style',
    'Three rounds for time: run, burpees, and pull-ups. A classic conditioning starter.',
    'crossfit',
    array['benchmark', 'conditioning'],
    0
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    tags = excluded.tags,
    sort_order = excluded.sort_order,
    updated_at = timezone('utc', now())
  returning id into helen_id;

  if helen_id is null then
    select id into helen_id from public.explore_templates where slug = 'helen-style';
  end if;

  delete from public.explore_sections where template_id = helen_id;

  insert into public.explore_sections (
    template_id, sort_order, name, format, format_config
  )
  values (
    helen_id,
    0,
    'Metcon',
    'rounds_for_time',
    '{"rounds": 3, "timeCapSeconds": 1200}'::jsonb
  )
  returning id into section_id;

  insert into public.explore_movements (
    section_id, sort_order, exercise_name, exercise_description,
    movement_category, equipment, quantity, quantity_unit, notes
  )
  values
    (
      section_id, 0, 'Easy run', 'Steady aerobic run.',
      'monostructural', 'None', 400, 'm', '400 m'
    ),
    (
      section_id, 1, 'Burpee', 'Squat, plank, and jump sequence.',
      'conditioning', 'Bodyweight', 21, 'reps', ''
    ),
    (
      section_id, 2, 'Pull-up', 'Vertical pull from a hanging position.',
      'gymnastics', 'Rig', 12, 'reps', ''
    );

  insert into public.explore_templates (
    slug, name, description, category, tags, sort_order
  )
  values (
    'hyrox-skills',
    'HYROX skills',
    'Skill block: farmers carries and an easy run with a stopwatch.',
    'hyrox',
    array['hyrox', 'skills'],
    1
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    tags = excluded.tags,
    sort_order = excluded.sort_order,
    updated_at = timezone('utc', now())
  returning id into hyrox_id;

  if hyrox_id is null then
    select id into hyrox_id from public.explore_templates where slug = 'hyrox-skills';
  end if;

  delete from public.explore_sections where template_id = hyrox_id;

  insert into public.explore_sections (
    template_id, sort_order, name, format, format_config
  )
  values (
    hyrox_id,
    0,
    'Skills',
    'custom',
    '{"timerMode": "stopwatch"}'::jsonb
  )
  returning id into section_id;

  insert into public.explore_movements (
    section_id, sort_order, exercise_name, exercise_description,
    movement_category, equipment, quantity, quantity_unit,
    load_value, load_unit, notes
  )
  values
    (
      section_id, 0, 'Farmers carry', 'Walk while carrying a load in each hand.',
      'strength', 'Kettlebells', 100, 'm', 24, 'kg', 'Each hand'
    ),
    (
      section_id, 1, 'Easy run', 'Steady aerobic run.',
      'monostructural', 'None', 1000, 'm', null, null, ''
    ),
    (
      section_id, 2, 'Farmers carry', 'Walk while carrying a load in each hand.',
      'strength', 'Kettlebells', 100, 'm', 24, 'kg', 'Each hand'
    );

  insert into public.explore_templates (
    slug, name, description, category, tags, sort_order
  )
  values (
    'threshold-run',
    'Threshold run',
    'Five kilometers at a controlled threshold pace.',
    'running',
    array['running', 'threshold'],
    2
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    description = excluded.description,
    category = excluded.category,
    tags = excluded.tags,
    sort_order = excluded.sort_order,
    updated_at = timezone('utc', now())
  returning id into threshold_id;

  if threshold_id is null then
    select id into threshold_id from public.explore_templates where slug = 'threshold-run';
  end if;

  delete from public.explore_sections where template_id = threshold_id;

  insert into public.explore_sections (
    template_id, sort_order, name, format, format_config
  )
  values (
    threshold_id,
    0,
    'Run',
    'running',
    '{"distanceMeters": 5000, "targetPaceSecondsPerKm": 300}'::jsonb
  )
  returning id into section_id;

  insert into public.explore_movements (
    section_id, sort_order, exercise_name, exercise_description,
    movement_category, equipment, quantity, quantity_unit, notes
  )
  values (
    section_id, 0, 'Easy run', 'Steady aerobic run.',
    'monostructural', 'None', 5000, 'm', 'Hold threshold effort'
  );
end $$;

-- Copy a catalog template into the athlete's private routines (new IDs).
create or replace function public.copy_explore_template(template_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
  template public.explore_templates%rowtype;
  section public.explore_sections%rowtype;
  movement public.explore_movements%rowtype;
  new_routine_id uuid;
  new_section_id uuid;
  resolved_exercise_id uuid;
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into template
  from public.explore_templates
  where id = template_id;

  if not found then
    raise exception 'Explore template not found';
  end if;

  if not exists (
    select 1
    from public.explore_sections
    where explore_sections.template_id = copy_explore_template.template_id
  ) then
    raise exception 'Explore template has no sections';
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
    template.name,
    template.description,
    template.category,
    template.tags,
    false,
    null
  )
  returning id into new_routine_id;

  for section in
    select *
    from public.explore_sections
    where explore_sections.template_id = copy_explore_template.template_id
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
      new_routine_id,
      actor,
      section.sort_order,
      section.name,
      section.format,
      section.format_config
    )
    returning id into new_section_id;

    for movement in
      select *
      from public.explore_movements
      where section_id = section.id
      order by sort_order
    loop
      select e.id
      into resolved_exercise_id
      from public.exercises e
      where e.user_id = actor
        and e.name = movement.exercise_name
      order by e.created_at
      limit 1;

      if resolved_exercise_id is null then
        insert into public.exercises (
          user_id,
          name,
          description,
          movement_category,
          equipment
        )
        values (
          actor,
          movement.exercise_name,
          movement.exercise_description,
          movement.movement_category,
          movement.equipment
        )
        returning id into resolved_exercise_id;
      end if;

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
        new_section_id,
        actor,
        resolved_exercise_id,
        movement.sort_order,
        movement.quantity,
        movement.quantity_unit,
        movement.load_value,
        movement.load_unit,
        movement.notes
      );
    end loop;
  end loop;

  return new_routine_id;
end;
$$;

revoke all on function public.copy_explore_template(uuid) from public;
grant execute on function public.copy_explore_template(uuid) to authenticated;

comment on function public.copy_explore_template(uuid) is
  'Copies an Explore catalog template into a new athlete-owned routine with new IDs.';
