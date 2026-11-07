# FORGE — Approved decisions

Recorded when Phase 0 was approved. Update this file when product/architecture decisions change.

## Architecture

- Modular monolith with Next.js App Router + TypeScript + Tailwind + Supabase.
- Domain/feature-oriented folders; introduce feature modules when functionality exists.
- Historical workouts: **JSONB routine snapshot on session start**.
- Workout format schemas: all supported formats validated early; live timer UX ships in waves (AMRAP, For Time, Strength, Custom first).
- AI Coach and notifications are out of MVP until explicitly approved.

## Product decisions (Phase 0 approval)

1. **Auth:** Email/password initially. Google OAuth later.
2. **Explore:** Out of MVP for now (hide/defer the Explore tab).
3. **Onboarding:** Basic profile first; expand onboarding later.
4. **Units:** Default **KG**, with option to switch to LB.
5. **Results:** Users can edit saved workout results.
6. **Incomplete workouts:** Started but unfinished → **abandoned**. Users may **discard** before completion.
7. **Multi-section sessions:** Manual section advancement initially.
8. **Exercises:** Small curated starter library + user-created exercises.
9. **Account deletion:** Remove associated personal data; retention details defined before production.

## Phase 0 engineering

- Node.js 22 + npm.
- Strict TypeScript.
- ESLint + Prettier.
- Tailwind tokens from `design/FORGE.html`.
- Vitest, Testing Library, Playwright smoke config.
- Preserve existing design and documentation files.
- No Supabase connection, schema, auth, or product features in Phase 0.

## Phase 1 engineering

- `@supabase/ssr` cookie sessions; Next.js 16 `proxy.ts` refreshes via `getClaims()`.
- Email/password only; no Google OAuth.
- `profiles` table + signup trigger + owner-only RLS.
- Minimal profile fields: `display_name`, `preferred_units` (default `kg`).
- Protected `/app` shell; full onboarding quiz deferred.

## Phase 2 engineering

- Exercises live in `src/features/exercises` and `public.exercises`.
- Each athlete receives a private copy of eight starter exercises on signup. Existing athletes are backfilled once.
- Demo media is an optional https YouTube or Vimeo URL. The server does not fetch it.
- Routines, sessions, timers, Explore, Google OAuth, and AI Coach stay out of this phase.

## Phase 3 engineering

- Routines live in `src/features/routines` and `public.routines` / `routine_sections` / `routine_exercises`.
- A routine is a template only. Session snapshots and timers stay in Phase 4.
- Each section has one of nine formats with a Zod- and database-validated `format_config`.
- Sections reorder with ▲ / ▼ controls (no drag-and-drop). Movements reference the athlete’s own exercises.
- Load units are stored explicitly on each routine exercise (`kg` or `lb`).
- Explore, Google OAuth, workout sessions, timers, and AI Coach stay out of this phase.
