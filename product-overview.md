# FORGE — Product Overview

## 1. Product Vision

**FORGE** is a fitness training application for people who want to create, organize, execute, and track structured workouts across CrossFit, HYROX, running, strength training, and functional fitness.

**Tagline:** Build your training. Track your progress. Become stronger.

Users can create reusable routines, execute them with format-aware timers, record results, and understand their progress over time.

## 2. Product Principles

- User-controlled training: users create and adapt their own routines.
- Progress with context: compare compatible metrics, not just elapsed time.
- Historical integrity: completed sessions must not change when a routine template is edited.
- Simple workout execution: the active workout experience must be clear and easy to use while training.
- AI as an assistant: AI recommendations are suggestions that users review and approve.
- Security by default: users can access only their own private data unless sharing is explicitly supported.

## 3. Target Users

- Beginners who need structure and a way to track progress.
- Intermediate athletes who create and repeat their own training.
- Advanced and competitive athletes who need detailed results and comparisons.
- CrossFit, HYROX, running, strength, and functional fitness enthusiasts.

The application should support different experience levels without assuming that every user understands every workout format.

## 4. Design Source of Truth

The supplied `design/FORGE.html` is the visual and interaction reference for the initial implementation.

Inspect its screens, visual system, layouts, responsive behavior, and visible interactions before building the UI. Do not replace the design with an unrelated visual direction.

The design includes these screen areas:

- Visual system
- Register and onboarding
- Hub and My Training
- Routine builder
- Live timer
- Results and Fran history
- AI Coach
- Profile and light theme
- Desktop Dashboard
- Desktop Builder
- Desktop Progress

If an interaction or requirement is unclear, identify it as an open question instead of inventing product behavior.

## 5. Core Product Capabilities

### 5.1 Authentication and Profile

- Register, sign in, sign out, and manage a basic user profile.
- Use Supabase Auth for authentication.
- Associate user-owned routines, workout sessions, and results with the authenticated user.
- Enforce authorization on the server and in the database, not only in the UI.

### 5.2 Exercise Library

- Browse and manage exercises.
- Exercise information may include name, description, movement category, equipment, and optional video/reference URL.
- Users can reference external demonstration videos, such as a Power Clean technique video.
- Avoid copying or hosting third-party videos unless explicitly required.

### 5.3 Routine Builder and Library

Users can:

- Create, edit, duplicate, archive, and favorite routines.
- Search and filter routines.
- Give routines a name, description, category, and optional tags.
- Add, remove, reorder, and configure sections.
- Add exercises to sections.
- Configure prescriptions such as sets, reps, load, distance, duration, rest, and notes.
- Save routines as reusable templates.

A routine can contain multiple ordered sections, each with its own format and configuration.

Example:

1. Warm-up — For Time
2. Strength — Sets & Reps
3. Metcon — AMRAP
4. Cooldown — Custom

### 5.4 Workout Formats

Initial formats to support:

- AMRAP
- EMOM
- For Time
- Rounds for Time
- Tabata
- Intervals
- Strength / Sets & Reps
- Running
- Custom

Use explicit, validated, format-specific configurations.

Examples:

- **AMRAP:** time cap, movements, repetitions, rounds, and additional reps.
- **EMOM:** total duration or number of minutes, minute structure, movements, and prescriptions.
- **For Time / Rounds for Time:** movements, repetitions, rounds, and optional time cap.
- **Strength:** sets, reps, load, rest, tempo, and notes.
- **Running:** distance, target pace, intervals, rest, and optional splits.
- **Tabata / Intervals:** work duration, rest duration, rounds, and interval structure.
- **Custom:** user-defined instructions and optional duration.

Do not force all formats into one generic configuration without validation.

### 5.5 Live Workout Execution and Timer

- Start a workout session from a saved routine.
- Show the current section, exercise instructions, prescribed work, and relevant timer.
- Support timing behavior appropriate to the section format.
- Support pause, resume, and finish where appropriate.
- Handle browser refresh, backgrounding, and device clock changes reliably.
- Derive elapsed time from timestamps and a well-defined clock strategy. Do not use an incrementing `setInterval` counter as the source of truth.
- Clearly distinguish a routine template from an in-progress or completed workout session.

### 5.6 Results and Workout History

- Save completed sessions separately from reusable routine templates.
- Capture actual performance, notes, and relevant metrics for each section.
- Allow users to review past sessions and compare repeat performances.
- Preserve a snapshot/version of the routine used for each session.
- Editing a routine later must never rewrite historical workout details.

Performance comparisons must be metric-aware:

| Workout type | Useful performance data |
|---|---|
| AMRAP | Rounds, additional reps, duration |
| For Time / RFT | Completion time, time-cap status, rounds |
| Strength | Load, reps, sets, volume, estimated or tested max where applicable |
| Running | Distance, elapsed time, pace, splits |
| Intervals | Work/rest structure, interval results, pace or load |
| HYROX-style | Total time, station splits, run splits, penalties where applicable |
| Custom | User-defined result fields and notes |

Do not compare unlike metrics or imply that a result is better when the measurement context differs.

### 5.7 AI Coach

- Help users draft routines or suggest adjustments based on user-provided goals and available training history.
- Present generated routines as editable drafts.
- Require explicit user review and approval before saving or starting an AI-generated routine.
- Treat model output as untrusted input.
- Validate generated content against domain rules and supported workout formats.
- Keep AI provider credentials on the server.
- Apply reasonable rate and cost controls.
- Do not present the AI Coach as a medical professional or provide medical diagnosis.

## 6. Main Application Areas

- Authentication and onboarding
- Dashboard / training hub
- My Training / routine library
- Exercise library
- Routine builder
- Active workout / live timer
- Results and workout history
- Progress and comparisons
- AI Coach
- Profile and preferences

## 7. Suggested MVP Scope

Prioritize a complete and reliable core training loop before advanced features.

### MVP

1. Authentication and user profile.
2. Exercise library with basic exercise details and reference URLs.
3. Create, edit, and save routine templates.
4. Multiple ordered sections per routine, with format-specific configuration.
5. Start, execute, pause/resume where relevant, and complete a workout session.
6. Record actual results.
7. View workout history and basic metric-aware comparisons.
8. Responsive UI that follows `design/FORGE.html`.

### Later Phases

- AI Coach and AI-generated routine drafts.
- Advanced progress analytics and personal records.
- More specialized HYROX and running analysis.
- Rich exercise media and curated exercise catalog.
- Sharing, social, or coach-athlete workflows if validated by user needs.

These features should not delay a sound MVP foundation.

## 8. Explicitly Out of Scope for the Initial MVP

- WhatsApp or email notifications.
- Push notifications and notification scheduling.
- Payments and subscriptions.
- Medical diagnosis, treatment, or injury assessment.
- Microservices without a concrete scaling or organizational need.

## 9. Technology Stack

The selected initial technology stack is:

| Layer | Technology |
|---|---|
| Web application | Next.js with App Router |
| Language | TypeScript |
| UI styling | Tailwind CSS |
| Backend platform | Supabase |
| Database | Supabase-hosted PostgreSQL |
| Authentication | Supabase Auth |
| File storage | Supabase Storage, only where needed |
| Validation | Zod or equivalent |
| Unit/component tests | Vitest and Testing Library, subject to setup plan |
| End-to-end tests | Playwright |
| Deployment | Vercel + Supabase |

**Important project status:** This is the selected technology direction, not a claim that the project is initialized.

The current project folder contains documentation and design files only. No application, dependencies, Supabase project, database schema, or environment configuration should be assumed to exist.

Use current compatible stable versions and verify official documentation before choosing installation commands or APIs. Avoid adding dependencies without a clear reason.

## 10. Architecture and Engineering Principles

- Start with a modular monolith. Do not introduce microservices by default.
- Organize code by feature/domain, such as exercises, routines, workout sessions, results/progress, and AI Coach.
- Keep UI components focused on presentation and interaction.
- Separate domain rules and validation from database access and framework-specific code where that separation provides real value.
- Apply SOLID pragmatically; avoid abstraction for its own sake.
- Reuse components when responsibilities and behavior are genuinely shared.
- Use strict TypeScript and validate untrusted input at system boundaries.
- Keep server-only code, service-role credentials, and secrets out of client bundles.
- Use Supabase Row Level Security (RLS) for user-owned data.
- Design and test RLS policies for every relevant table.
- Never rely on client-side filtering as authorization.
- Prefer server-side authorization and least-privilege access.
- Design database constraints, indexes, and transactions around actual access patterns and invariants.
- Keep historical workout records immutable in meaning, even if correction workflows are introduced later.
- Build accessible, responsive UI and handle loading, empty, error, and success states.

## 11. Security and Privacy Requirements

- Enable and test RLS on all user-owned tables.
- Write policies that verify the authenticated user owns or is authorized to access each row.
- Never expose the Supabase service-role key to the browser.
- Store secrets in deployment environment variables; commit only safe example placeholders.
- Validate inputs on the server, even when forms also validate on the client.
- Protect sensitive mutations with server-side authorization and appropriate request protections.
- Prevent insecure direct object references (IDOR): knowing a record ID must not grant access.
- Use safe query APIs and avoid unsafe SQL construction.
- Consider rate limiting and abuse controls for authentication and AI endpoints.
- Collect only data required for the feature.
- Avoid sending unnecessary personal data to AI providers.

## 12. Performance and Reliability

- Use server rendering and client components intentionally.
- Keep client-side JavaScript limited to interactive areas.
- Fetch only the data needed for each screen.
- Paginate or incrementally load growing history and exercise lists.
- Add indexes based on actual query patterns.
- Inspect query plans when useful.
- Avoid unnecessary client re-renders and duplicated requests.
- Make session completion and result writes safe against accidental duplicate submission.
- Treat timer correctness and workout-history integrity as core reliability requirements.

## 13. Product Success Criteria

A user should be able to:

1. Register and sign in.
2. Create or select exercises.
3. Build and save a routine with multiple differently configured sections.
4. Start and complete the routine.
5. Record actual performance.
6. Find the completed session in history.
7. Compare a repeat performance using the correct metric.

The core product loop is:

**Create routine → Execute session → Record results → Review progress → Improve next session.**