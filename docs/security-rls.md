# Security & RLS checklist

## Profiles (Phase 1)

| Policy | Intent |
|---|---|
| `profiles_select_own` | Authenticated user can read only `profiles.id = auth.uid()` |
| `profiles_update_own` | Authenticated user can update only their row |
| No insert policy | Profile insert is via `handle_new_user` security-definer trigger only |

## Exercises (Phase 2)

| Policy | Intent |
|---|---|
| `exercises_select_own` | Authenticated user can read only rows where `user_id = auth.uid()` |
| `exercises_insert_own` | Inserts must set `user_id` to `auth.uid()` |
| `exercises_update_own` | Updates stay on the owner’s row, and cannot move `user_id` to someone else |
| `exercises_delete_own` | Deletes only the owner’s row |

`seed_starter_exercises(uuid)` is security definer and is not executable by `anon` or `authenticated`. It runs from the signup trigger and from the one-time backfill in the exercises migration. Demo URLs are optional and must be https YouTube or Vimeo links. The app does not fetch them.

## Routines (Phase 3)

| Policy | Intent |
|---|---|
| `routines_*_own` | Owner-only select/insert/update/delete on `routines` |
| `routine_sections_*_own` | Owner-only access; each row carries `user_id` |
| `routine_exercises_*_own` | Owner-only access; each row carries `user_id` |

Composite foreign keys keep children on the same owner:

- `routine_sections (routine_id, user_id) → routines (id, user_id)`
- `routine_exercises (section_id, user_id) → routine_sections (id, user_id)`
- `routine_exercises (exercise_id, user_id) → exercises (id, user_id)`

`save_routine(jsonb)` and `duplicate_routine(uuid)` are `security invoker`, executable by `authenticated` only, and write `user_id` from `auth.uid()`. Format configs are checked by `is_valid_format_config` before insert. Deleting an exercise that is still referenced by a routine is blocked (`on delete restrict`).

## Manual two-user test — profiles

1. Create User A and User B (register twice).
2. As A, open `/app/profile` and save a distinct display name.
3. In Supabase SQL editor (or Table Editor as each user via client), confirm:
   - A cannot `select` B’s profile.
   - A cannot `update` B’s profile.
4. Sign out; confirm `/app` redirects to `/login`.

## Manual two-user test — exercises

Run this after `20261106193000_exercises.sql` has been applied once. Do not apply that file a second time, and do not re-run the profiles migration.

1. Sign in as User A and open `/app/exercises`. A should see only A’s starter exercises.
2. Create an exercise with a distinct name, then edit and delete a different starter exercise.
3. Reject a non-YouTube/Vimeo demo link (for example `https://example.com/watch`) and accept an `https://www.youtube.com/watch?v=…` or `https://vimeo.com/…` link.
4. As User B, confirm B cannot read A’s exercise list, and a direct update or delete of A’s exercise id affects 0 rows.
5. Sign out; confirm `/app/exercises` redirects to `/login`.

## Manual two-user test — routines

Run this after `20261106223000_routines.sql` has been applied once. Do not re-apply profiles or exercises migrations.

1. Sign in as User A. Open `/app/routines/new`, build a multi-section routine (at least AMRAP and Strength), save it, then duplicate, favorite, archive, restore, and edit it.
2. Confirm invalid format config is rejected (for example EMOM duration that is not a multiple of the interval).
3. Confirm adding another user’s exercise id is rejected, and deleting an exercise still used by a routine fails with a clear error.
4. As User B, confirm B cannot list A’s routines, and direct select/update/delete of A’s routine, section, or routine-exercise ids affects 0 rows.
5. Sign out; confirm `/app/routines` redirects to `/login`.

## Session rules

- Never put the service role key in client bundles or `NEXT_PUBLIC_*`.
- Never trust client-supplied user IDs for ownership.
- Prefer Server Actions + RLS over UI-only hiding.
