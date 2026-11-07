-- Phase 4: workout sessions + section results with immutable routine snapshots.
-- Do not edit or re-apply earlier migrations.
--
-- Idempotent on purpose: this schema may already exist on the linked project if it
-- was applied out-of-band before schema_migrations recorded this version.

do $$
begin
  create type public.session_status as enum (
    'planned',
    'in_progress',
    'completed',
    'abandoned'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.session_scaling as enum (
    'rx',
    'scaled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid references public.routines (id) on delete set null,
  status public.session_status not null default 'planned',
  scaling public.session_scaling not null default 'rx',
  routine_snapshot jsonb not null,
  notes text not null default '',
  current_section_index integer not null default 0,
  started_at timestamptz,
  paused_at timestamptz,
  total_paused_ms bigint not null default 0,
  current_section_started_at timestamptz,
  completed_at timestamptz,
  abandoned_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workout_sessions_id_user_id_key unique (id, user_id),
  constraint workout_sessions_notes_trimmed check (
    notes = btrim(notes)
    and char_length(notes) <= 2000
  ),
  constraint workout_sessions_section_index_nonneg check (
    current_section_index >= 0
  ),
  constraint workout_sessions_total_paused_nonneg check (
    total_paused_ms >= 0
  ),
  constraint workout_sessions_snapshot_version check (
    (routine_snapshot ->> 'snapshotVersion') = '1'
  ),
  constraint workout_sessions_lifecycle check (
    (
      status = 'planned'
      and started_at is null
      and paused_at is null
      and completed_at is null
      and abandoned_at is null
    )
    or (
      status = 'in_progress'
      and started_at is not null
      and completed_at is null
      and abandoned_at is null
    )
    or (
      status = 'completed'
      and started_at is not null
      and completed_at is not null
      and abandoned_at is null
      and paused_at is null
    )
    or (
      status = 'abandoned'
      and started_at is not null
      and abandoned_at is not null
      and completed_at is null
      and paused_at is null
    )
  )
);

comment on table public.workout_sessions is
  'One execution of a routine. Results never write back to the routine template.';

comment on column public.workout_sessions.routine_snapshot is
  'Immutable copy of the routine at session start (snapshotVersion 1).';

create index if not exists workout_sessions_user_id_started_at_idx
  on public.workout_sessions (user_id, started_at desc nulls last);

create index if not exists workout_sessions_user_id_status_idx
  on public.workout_sessions (user_id, status);

create or replace function public.set_workout_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists workout_sessions_set_updated_at on public.workout_sessions;
create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row
execute function public.set_workout_sessions_updated_at();

create table if not exists public.session_section_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  section_index integer not null,
  format public.workout_format not null,
  result jsonb not null default '{}'::jsonb,
  section_started_at timestamptz,
  section_ended_at timestamptz,
  elapsed_ms bigint,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint session_section_results_section_index_nonneg check (
    section_index >= 0
  ),
  constraint session_section_results_elapsed_nonneg check (
    elapsed_ms is null or elapsed_ms >= 0
  ),
  constraint session_section_results_session_section_key
    unique (session_id, section_index),
  constraint session_section_results_session_owner_fkey
    foreign key (session_id, user_id)
    references public.workout_sessions (id, user_id)
    on delete cascade
);

comment on table public.session_section_results is
  'Actual metrics for one section of a workout session.';

create index if not exists session_section_results_user_id_session_id_idx
  on public.session_section_results (user_id, session_id);

create or replace function public.set_session_section_results_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists session_section_results_set_updated_at
  on public.session_section_results;
create trigger session_section_results_set_updated_at
before update on public.session_section_results
for each row
execute function public.set_session_section_results_updated_at();

alter table public.workout_sessions enable row level security;
alter table public.session_section_results enable row level security;

drop policy if exists workout_sessions_select_own on public.workout_sessions;
create policy workout_sessions_select_own
  on public.workout_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists workout_sessions_insert_own on public.workout_sessions;
create policy workout_sessions_insert_own
  on public.workout_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists workout_sessions_update_own on public.workout_sessions;
create policy workout_sessions_update_own
  on public.workout_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists workout_sessions_delete_own on public.workout_sessions;
create policy workout_sessions_delete_own
  on public.workout_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists session_section_results_select_own
  on public.session_section_results;
create policy session_section_results_select_own
  on public.session_section_results
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists session_section_results_insert_own
  on public.session_section_results;
create policy session_section_results_insert_own
  on public.session_section_results
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists session_section_results_update_own
  on public.session_section_results;
create policy session_section_results_update_own
  on public.session_section_results
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists session_section_results_delete_own
  on public.session_section_results;
create policy session_section_results_delete_own
  on public.session_section_results
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
