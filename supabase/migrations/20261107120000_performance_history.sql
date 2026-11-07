-- Phase 5: history / compare query support for completed sessions.
-- Do not edit or re-apply earlier migrations.
--
-- Prerequisite: Phase 3 (`20261106223000`) and Phase 4 (`20261107010000`) must be
-- applied or recorded first. Those files are idempotent if schema already exists.

create index if not exists workout_sessions_user_routine_completed_idx
  on public.workout_sessions (user_id, routine_id, completed_at desc nulls last)
  where status = 'completed';

comment on index public.workout_sessions_user_routine_completed_idx is
  'Speeds completed-session history and same-routine comparisons.';
