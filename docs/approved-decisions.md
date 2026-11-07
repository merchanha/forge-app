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
2. **Explore:** In MVP as a small curated catalog. Saving copies into the athlete’s private routines (new IDs); catalog rows are read-only for users.
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

## Phase 4 engineering

- Workout sessions live in `src/features/workout-sessions` and `public.workout_sessions` / `session_section_results`.
- On start, freeze a full JSONB `routine_snapshot` (`snapshotVersion: 1`). Editing the routine later does not rewrite history.
- Lifecycle: `planned` → `in_progress` → `completed` | `abandoned`. Start creates `in_progress`. Discard abandons unfinished work.
- Timer source of truth is timestamps + monotonic clock while active (`started_at`, `paused_at`, `total_paused_ms`, `current_section_started_at`). UI may refresh on an interval; it must not invent elapsed time.
- Live timer UX in this phase: AMRAP, For Time, Strength, Custom. Other formats show prescription + manual advance.
- Multi-section sessions advance manually. Post-workout review reads the snapshot + section results only.
- Explore, Google OAuth, history/compare/PRs, AI Coach, and desktop timer parity stay out of this phase.

## Phase 5 engineering

- History and metric-aware comparisons live in `src/features/performance`. Reuse `workout-sessions` public queries/validation only; do not import another feature’s internals.
- Historical display always reads `routine_snapshot` + `session_section_results`, never the live routine template.
- Completed results and notes are editable after completion. Edits never mutate `routine_snapshot`.
- Comparisons are metric-aware and context-gated: For Time (completion time), AMRAP (rounds + reps within the same duration), Strength (volume with the same load unit). Unlike metrics are never ranked.
- PR markers appear only when the metric family and prescription context are compatible (same format config context + same scaling).
- Matching is practical and routine-based (`routine_id`); there is no Fran/benchmark entity graph.
- Explore, Google OAuth, AI Coach, remaining live timers, and desktop Progress chart parity stay out of this phase.

## Phase 6 engineering

- Profile prefs and theme live in `src/features/profiles` (+ shared theme tokens). Reuse `src/platform/supabase`; do not import another feature’s internals.
- Persist `preferred_units` (default kg), `theme` (dark/light), and basic onboarding fields: experience, disciplines/primary, goal, days/week, target event.
- Theme applies through existing `[data-theme="light"]` CSS variables without redesigning the dark-first system.
- Responsive desktop layouts for Dashboard, Builder, and Progress/History follow the design boards; mobile remains the primary compact layout. Explore and AI Coach stay hidden.
- Progress sparkline reuses `src/features/performance` metric-aware scores for a selected routine; no Fran entity graph.
- Explore, Google OAuth, AI Coach, and remaining live timer formats stay out of this phase.

## Phase 7 engineering

- Remaining live timers live in `src/features/workout-sessions` (reuse shared timer helpers). Do not import another feature’s internals.
- Live timer UX for all nine formats: AMRAP, For Time, Strength, Custom, EMOM, Tabata, Intervals, Rounds for Time, Running.
- EMOM / Tabata / Intervals derive WORK / REST / DONE (and interval/round index) from active elapsed ms + format config. UI may refresh on an interval; elapsed remains timestamp-based.
- Multi-section sessions stay manual: next-section preview on the advance control; section clock resets via persisted `current_section_started_at`.
- No schema migration in this phase. Explore, Google OAuth, and AI Coach stay out.

## Phase 8 engineering

- Explore lives in `src/features/explore` and `public.explore_templates` / `explore_sections` / `explore_movements`.
- Catalog is a small curated seed (Helen-style, HYROX skills, Threshold run). Not a marketplace or community catalog.
- Authenticated athletes may `select` catalog rows only. No user insert/update/delete on system rows.
- `copy_explore_template` creates a private owned routine (new IDs), find-or-creating exercises by exact name from the athlete’s library.
- Explore appears in app nav. Google OAuth and AI Coach stay out.
