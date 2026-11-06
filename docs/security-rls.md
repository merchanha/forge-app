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

## Session rules

- Never put the service role key in client bundles or `NEXT_PUBLIC_*`.
- Never trust client-supplied user IDs for ownership.
- Prefer Server Actions + RLS over UI-only hiding.
