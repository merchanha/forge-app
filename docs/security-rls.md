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

## Workout sessions (Phase 4)

| Policy | Intent |
|---|---|
| `workout_sessions_*_own` | Owner-only select/insert/update/delete on `workout_sessions` |
| `session_section_results_*_own` | Owner-only access; each row carries `user_id` |

- `session_section_results (session_id, user_id) → workout_sessions (id, user_id)` on delete cascade
- `routine_id` on sessions is nullable and uses `on delete set null` so deleting a template does not erase history
- `routine_snapshot` is immutable JSONB frozen at start (`snapshotVersion: 1`)
- Server Actions call `getUser()` and write `user_id` from that session. Never trust a client-supplied user id
- Timer source of truth is persisted timestamps (`started_at`, `paused_at`, `total_paused_ms`, `current_section_started_at`), not a ticking counter

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

## Manual two-user test — workout sessions

Run this after `20261107010000_workout_sessions.sql` has been applied once. Confirm Phase 3 (`20261106223000`) is recorded in `schema_migrations` first. Do not re-apply earlier migrations.

1. Sign in as User A. Start a workout from a multi-section routine that includes AMRAP. Confirm the live clock, pause/resume, `+1 Round` / `+1 Rep`, and that a mid-workout refresh restores the correct remaining/elapsed time.
2. Advance to the next section manually, then finish and open the review page. Edit the routine template afterward and confirm the completed session review still shows the original snapshot.
3. Start another session and discard it; confirm status becomes abandoned and you return to My Training.
4. As User B, confirm B cannot select A’s `workout_sessions` or `session_section_results` rows, and direct update/delete of A’s session id affects 0 rows.
5. Sign out; confirm `/app/sessions/<id>` redirects to `/login`.

## Performance history (Phase 5)

No new user-owned tables. History and compares read `workout_sessions` + `session_section_results` under the same owner-only policies. Completed-result edits update those rows only for `status = completed` and never mutate `routine_snapshot`.

Index added by `20261107120000_performance_history.sql`:

- `workout_sessions_user_routine_completed_idx` on `(user_id, routine_id, completed_at desc)` where `status = 'completed'`

## Manual two-user test — history and edited results

Run this after Phase 3 and Phase 4 versions are recorded and `20261107120000_performance_history.sql` has been applied once. Do not re-apply earlier migrations.

1. Sign in as User A. Complete at least two sessions of the same For Time (or AMRAP / Strength) routine with compatible prescriptions. Open `/app/history` and confirm both appear with a metric-aware delta and a PR marker only on the best compatible score.
2. Open a completed session review, edit a section result and notes, save, and confirm the snapshot prescription is unchanged. Edit the live routine template and confirm history still shows the frozen snapshot.
3. As User B, confirm `/app/history` does not list A’s sessions, opening A’s review URL fails or shows not found, and direct update of A’s `session_section_results` id affects 0 rows.
4. Sign out; confirm `/app/history` redirects to `/login`.

## Profile preferences (Phase 6)

No new tables. Columns added on `profiles` by `20261107140000_profile_prefs.sql`:

- `theme` (`dark` | `light`, default `dark`)
- `experience_level` (nullable enum)
- `disciplines` (`text[]`, allowlisted values, max 8)
- `primary_discipline` (nullable; must be in `disciplines` when set)
- `goal` (nullable enum)
- `days_per_week` (nullable 1–7)
- `target_event` (trimmed text ≤ 80)

Existing owner-only policies still apply:

| Policy | Intent |
|---|---|
| `profiles_select_own` | Authenticated user can read only `profiles.id = auth.uid()` |
| `profiles_update_own` | Authenticated user can update only their row |
| No insert policy | Profile insert remains via `handle_new_user` only |

Server Actions call `getUser()` and update `profiles` with `.eq("id", user.id)`. Never trust a client-supplied user id.

## Manual two-user test — profile prefs and theme

Run this after `20261107140000_profile_prefs.sql` has been applied once. Confirm Phase 1–5 versions are recorded first when possible. Do not re-apply earlier migrations.

1. Sign in as User A. Open `/app/profile`, set a distinct display name, switch units to lb, choose light theme, pick experience/disciplines/goal/days/target event, and save. Confirm the UI switches to light and survives a full reload.
2. As User B, confirm B cannot select or update A’s profile row (0 rows affected), and B’s own theme/units remain independent.
3. Sign out; confirm `/app/profile` redirects to `/login`.

## Live timers (Phase 7)

No schema or policy changes. All nine formats use the same owner-only `workout_sessions` / `session_section_results` policies. Timer display for EMOM / Tabata / Intervals derives phase from persisted section timestamps + format config; do not treat a UI tick as elapsed source of truth.

Manual two-user session checks from Phase 4 still apply. Optionally also start a multi-section routine that includes EMOM or Tabata, confirm WORK/REST labels and that a mid-section refresh restores the correct phase remaining time.

## Session rules

- Never put the service role key in client bundles or `NEXT_PUBLIC_*`.
- Never trust client-supplied user IDs for ownership.
- Prefer Server Actions + RLS over UI-only hiding.
