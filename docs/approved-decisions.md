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
