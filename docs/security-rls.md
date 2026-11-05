# Security & RLS checklist

## Profiles (Phase 1)

| Policy | Intent |
|---|---|
| `profiles_select_own` | Authenticated user can read only `profiles.id = auth.uid()` |
| `profiles_update_own` | Authenticated user can update only their row |
| No insert policy | Profile insert is via `handle_new_user` security-definer trigger only |

## Manual two-user test

1. Create User A and User B (register twice).
2. As A, open `/app/profile` and save a distinct display name.
3. In Supabase SQL editor (or Table Editor as each user via client), confirm:
   - A cannot `select` B’s profile.
   - A cannot `update` B’s profile.
4. Sign out; confirm `/app` redirects to `/login`.

## Session rules

- Never put the service role key in client bundles or `NEXT_PUBLIC_*`.
- Never trust client-supplied user IDs for ownership.
- Prefer Server Actions + RLS over UI-only hiding.
