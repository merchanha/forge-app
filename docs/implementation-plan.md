# FORGE — Discovery & Implementation Plan

Planning document produced from product, design, and technical discovery.
**Status:** Phase 0–3 implemented. Awaiting approval before Phase 4.
**Approved decisions:** see [`docs/approved-decisions.md`](./approved-decisions.md).

**Sources reviewed:** `START-HERE-PROMPT.md`, `product-overview.md`, `.cursorrules`, `.cursor/rules/forge-engineering.mdc`, `README.md`, `design/FORGE.html`.

**Restrictions honored during discovery:** no Next.js init, no dependency installs, no application code, no Supabase connection, no schema/migrations, no file modifications to existing sources.

---

## 1. Executive summary

FORGE is documentation/design-only today: no app, deps, Supabase project, schema, auth, or CI. The stack choice (Next.js App Router + TypeScript + Tailwind + Supabase) is sound for a single-developer MVP. The supplied `design/FORGE.html` is a strong visual system (dark-first, Forge orange, Barlow Condensed + Inter Tight) and maps cleanly to the product loop.

The hard problems are domain, not scaffolding: **format-specific configs**, a **timestamp-based timer** (the design demo’s `setInterval` countdown must not be copied), **immutable session snapshots**, **metric-aware comparisons**, and **RLS ownership** on every user table.

Recommendation: initialize a thin modular monolith, ship a secure vertical slice (auth → exercises → routines → session → history), support all format *schemas* early but implement live timers in waves, defer AI Coach / rich Explore / advanced analytics, and keep abstractions small.

---

## 2. Confirmed repository starting state

**This is a documentation/design-only starting point.** Nothing is initialized.

```text
FORGE/
├── .cursor/rules/forge-engineering.mdc
├── .cursorrules
├── design/FORGE.html
├── product-overview.md
├── START-HERE-PROMPT.md
└── README.md
```

Also present: a git repo on `main`. No `package.json`, `app/`, `.env`, Supabase config, tests, or CI.

**Missing information (expected at this stage):**

- Supabase project / Auth providers (email-only vs Google)
- Preferred units default and locale/timezone handling
- Whether “Explore” is in MVP
- AI provider choice (post-MVP)
- Account deletion / retention policy details
- Exact Next.js minor version at install time (verify then)

---

## 3. Design review and screen-to-feature mapping

Inspected all 11 boards in `design/FORGE.html` (unpacked templates + visual review).

### Visual system

| Token | Dark | Notes |
|---|---|---|
| Accent / Forge orange | `#FF5A1F` | Live clock, PR, primary CTA |
| Ground | `#0C0C0E` | Page background |
| Surface | `#16161A` | Cards / panels |
| Raised | `#1F1F25` | Elevated controls |
| Border | `#2A2A32` | Hairlines / chips |
| Text | `#F4F2EE` | Primary text |
| Muted | `#A8A6AE` | Secondary (claimed ~7.6:1) |
| Success delta | `#7BE0A4` on `#12301F` | Improvements |
| Timer WORK / REST / DONE | `#FF5A1F` / `#4CC3E8` / `#F4F2EE` | Glanceable phases |

**Light theme (optional):** accent `#C93C06`, surface `#FFFFFF`, text `#15151A`, muted `#5C5A62`, borders like `#D9D5CD`.

**Typography:** Barlow Condensed 800 for timers/titles/numbers; Inter Tight 600/400 for body/captions. Min 12px; 48px tap targets; spacing 4/8/12/16/24; radii 12/20/28/pill.

**Principle from design:** orange is reserved; deltas always pair sign + number + correct metric (never color alone).

### Screens → features

| Board | Viewport | Product mapping |
|---|---|---|
| Visual system | 1280×900 | Design tokens, component recipes |
| Register + onboarding | 390×844 | Auth, profile quiz (exp, disciplines, goal) |
| Hub + My Training | 390×844 | Dashboard, library, search, favorite/archive/delete, Explore |
| Routine builder | 390×844 | Multi-section builder, format sheet, exercise sheet, video URL |
| Live timer | 390×844 | Active session, Rx/Scaled, score, pause, end/review |
| Results + Fran history | 390×844 | Save/discard result, metric history, PR markers |
| AI Coach | 390×844 | Draft chat → editable draft → explicit save (**post-MVP**) |
| Profile + light theme | 390×844 | Units, theme, training prefs, logout |
| Desktop Dashboard / Builder / Progress | 1280×820 | Same features, denser layout |

**Mobile nav (5):** Dashboard · My Training · Explore · Progress · AI Coach. Profile is reached from avatar, not the tab bar.

**Visible interactions worth preserving:** bottom sheets (format / exercise / video / action / confirm delete); Rx↔Scaled; +1 Round / +1 Rep during AMRAP; save-vs-discard results with copy that the **template is unchanged**; delete routine keeps history.

### Design gaps / unclear interactions

1. **Timer demo is not production-correct** — decrements via `setInterval`; product rules forbid that as source of truth.
2. **Onboarding “days/week”** appears on the done screen / profile, but the quiz script has no day picker UI.
3. **Explore** is a small curated catalog (Helen, HYROX skills, threshold run) — not specified as MVP in `product-overview.md`.
4. **Progress / “Fran history”** assumes named benchmark identity across sessions — matching rules unclear.
5. **Desktop vs mobile** — same features, different chrome; need one responsive system, not two apps.
6. **Google sign-in** shown; provider setup not decided.
7. **Exercise library** as a first-class screen is thin in the design (embedded in builder sheets).
8. **HYROX** is a *discipline/category* in UI, not a distinct timer format in the format list.
9. **Multi-section live workout** — timer board shows one section; section advance / between-section rest UX is incomplete.
10. **Offline / background kill** during a workout — not designed.

---

## 4. Recommended Next.js + Supabase architecture

### Recommendation: modular monolith (option A)

**Keep the selected stack.** Use current stable Next.js at install time (docs indicate **Next.js 16** uses `proxy.ts` instead of deprecated `middleware.ts`; follow the latest Supabase SSR guide exactly).

| Concern | Approach |
|---|---|
| Rendering | Server Components by default; Client Components for builder DnD-ish UI, timer, sheets, theme toggle |
| Mutations | Server Actions for form/domain commands; re-auth + Zod inside every action |
| Reads | Server Components → Supabase user-scoped client; no Route Handler hop for page data |
| Route Handlers | Auth callbacks, webhooks, AI proxy (later), health |
| Auth session | `@supabase/ssr` cookie clients; refresh in `proxy.ts` / middleware per docs; **no tokens in localStorage** |
| Validation | Shared Zod schemas (client UX + server authority) |
| DB access | Supabase JS + SQL migrations via Supabase CLI; generated TypeScript types |
| UI | Tailwind tokens matching design; optional Radix primitives for a11y — **do not adopt a generic shadcn look** |
| State | Local React state; pure timer domain module; no Redux/global store for MVP |

### Suggested folder shape (introduce as features land)

```text
src/
  app/                    # routes, layouts, providers
  features/
    auth/
    profiles/
    exercises/
    routines/
    workout-sessions/
    performance/          # comparisons, later PRs
    ai-coach/             # later only
  shared/
    ui/                   # buttons, sheets, chips matching design
    domain/               # formats, units, clock helpers
    validation/
  platform/
    supabase/             # browser/server/proxy clients
```

**Dependency rule:** `app` → `features/*` public API → `shared` / `platform`. Features do not import each other’s internals.

### Data / command flow

1. Authenticated layout loads profile via server client.
2. Routine CRUD via Server Actions; Zod validates format-discriminated section configs.
3. **Start workout** creates `workout_sessions` row with **full routine snapshot** + status `in_progress`.
4. Client timer derives display time from persisted timestamps + `performance.now()` while foregrounded.
5. **Complete** writes section results in a transaction; status → `completed`; idempotency key prevents double-save.
6. History/compare reads snapshots + results; never the live template for historical display.

---

## 5. Architecture alternatives and trade-offs

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **A. Next.js + Supabase modular monolith (recommended)** | Fast MVP, one deploy story, RLS, fits solo | Some coupling to Supabase | **Choose** |
| **B. Next.js + Postgres (Drizzle/Prisma) + Auth.js, no Supabase** | More control | You own auth, hosting, storage, migrations ops | Worse for solo MVP |
| **C. Heavy clean architecture / CQRS / separate API** | Theoretical purity | Slow, overbuilt | Reject for MVP |

**Small decisions inside A:**

- Prefer **SQL migrations + Supabase client** over Prisma (avoids dual schema tooling).
- Prefer **Server Actions** over a large REST surface for MVP mutations.
- Prefer **JSONB snapshot at session start** over full template version tables (see domain).

---

## 6. Proposed domain model and relationships

```text
auth.users
   └── profiles (1:1)
         ├── exercises (1:n)                    # user-owned; optional system seed later
         ├── routines (1:n)
         │     └── routine_sections (1:n, ordered)
         │           └── routine_exercises (1:n, ordered)
         ├── workout_sessions (1:n)
         │     ├── routine_snapshot (jsonb, required)
         │     └── session_section_results (1:n)
         └── (later) performance_records / personal_records
```

### Entities

| Entity | Role |
|---|---|
| **Profile** | display name, experience, disciplines[], primary discipline, goal, days/week, units (`kg`/`lb`), theme, timezone |
| **Exercise** | name, description, category, equipment, optional demo URL (https YouTube/Vimeo only) |
| **Routine** | template: name, description, category/tags, difficulty, favorite, archived_at |
| **Routine section** | order, name, `format` enum, `format_config` (validated JSON) |
| **Routine exercise** | order, exercise_id (nullable if free-text), prescription fields (sets/reps/load/distance/duration/rest/notes/tempo) |
| **Workout session** | execution: status, timestamps, pause accounting, Rx/Scaled, notes, **immutable snapshot** |
| **Session section result** | actual metrics for one section (format-discriminated) |
| **Performance record** | **defer materialization**; compute comparisons from results in early MVP |

### Format configs (discriminated; Zod + DB check)

Aligned with design + product overview:

| Format | Config highlights | Result highlights |
|---|---|---|
| AMRAP | duration, scoring | rounds, additional reps, capped |
| EMOM | duration, interval | completed minutes, notes |
| For Time | rounds, optional time cap | completion_ms, capped? |
| Rounds for Time | rounds, optional cap | completion_ms |
| Tabata | work, rest, rounds | interval logs / completed |
| Intervals | work, rest, rounds | per-interval results |
| Strength | sets, reps, rest, RPE | set logs (load×reps), volume |
| Running | distance, target pace | time, distance, pace, optional splits |
| Custom | timer mode (stopwatch/countdown/none) | notes + optional duration |

### Critical invariants

1. Template ≠ session; never write results onto the routine.
2. On start (or first meaningful start): freeze `routine_snapshot` (sections, exercises, prescriptions, format configs, names). Edits later do not rewrite history.
3. Session lifecycle: `planned` → `in_progress` → `completed` | `abandoned` (document allowed transitions).
4. Timer source of truth: `started_at`, `paused_at`, `total_paused_ms`, section boundaries — **not** a ticking integer.
5. Comparisons only within same metric family + compatible prescription context (e.g. Fran For Time vs Fran For Time).
6. Units stored explicitly; convert at display using profile preference.
7. Timestamps UTC in DB; render in profile timezone.

### Snapshot strategy (recommended)

**Copy-on-start JSONB snapshot** (+ `routine_id` nullable FK for “started from”).
Enough for historical integrity and simpler than version graphs. Later, if needed: routine `version` integer and snapshot metadata.

---

## 7. Database and RLS strategy

### Migrations

- Supabase CLI; all schema in versioned SQL.
- Enable RLS on every user-owned table **before** any client access.
- Indexes from real paths: `routines(user_id, archived_at)`, `workout_sessions(user_id, started_at desc)`, `exercises(user_id, name)`, GIN only if search needs it.

### RLS pattern (all private MVP data)

```sql
-- example shape; apply per table
create policy "owner_select" on routines
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "owner_insert" on routines
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
-- update/delete similarly
```

- Use `(select auth.uid())` for plan caching; always `TO authenticated`.
- Child tables: ownership via parent (`section.routine_id → routines.user_id`) or denormalized `user_id` (simpler policies; slight duplication).
- **Session results:** insert/update only while session owned and status allows; completed sessions immutable except maybe notes (decide explicitly).
- **Service role:** server-only (seed, admin, later AI); never in browser.
- **Storage:** skip for MVP (external video URLs only). If avatars later: per-user folder policies.

### Explore / system content (if approved)

`is_system` catalog rows with `select` for authenticated; no user update. Saving to My Training **copies** into user-owned routines (new IDs), not shared mutable rows.

---

## 8. Security, privacy, performance, and testing strategy

### Security

- Supabase Auth (email/password MVP; Google optional after approval).
- Cookie sessions via `@supabase/ssr`; refresh in proxy/middleware; `getUser()` / `getClaims()` per current docs.
- Authorize in **Server Actions and RLS** — UI hiding is not security.
- Zod at boundaries; allowlist URL schemes for demo links; no server-side fetch of arbitrary URLs (SSRF).
- CSRF: Server Actions POST + same-site cookies; still re-check session inside actions.
- Rate limit auth (Supabase) and later AI routes.
- `.env.example` only; never commit secrets or service role.

### Privacy

- Collect only profile fields needed for training prefs.
- No real health data in fixtures/logs.
- Define deletion: cascade user-owned rows (open question for legal copy).
- AI later: minimize PII in prompts; never send passwords.

### Performance

- RSC for lists/detail; client JS concentrated on builder + timer.
- Paginate history and exercise lists.
- Avoid caching user data across users (no shared CDN cache of private workouts).
- Session completion: idempotency key / unique constraint on `(session_id, completion_token)`.
- Timer: rAF or 250ms UI refresh OK; clock math from timestamps.

### Testing (pragmatic for solo)

| Layer | What |
|---|---|
| Vitest | Format Zod schemas, timer pure functions, metric comparison, lifecycle transitions |
| Integration | RLS with two users (Supabase local or dedicated test project) |
| Playwright | Register → build routine → start → complete → history shows snapshot after template edit |
| Manual | Background tab / refresh mid-workout |

Do **not** wait for 100% coverage before shipping the vertical slice; lock the invariants above with tests first.

---

## 9. Incremental implementation roadmap

### Phase 0 — Project foundation *(first implementation phase)*

- **Goal:** Runnable Next.js app with Tailwind tokens, lint/typecheck/test harness, env skeleton — still no product features.
- **Non-goals:** Supabase schema, auth UI, real pages beyond a design-token smoke screen.
- **Deps:** Node toolchain; user approval.
- **Likely files:** `package.json`, `src/app/`, Tailwind theme, Vitest/Playwright config, `.env.example`, `README` update.
- **DB:** none.
- **Security:** no secrets committed.
- **Acceptance:** `dev`/`lint`/`typecheck`/`test` scripts work; tokens match visual system; design file untouched.
- **Risks:** Next 15 vs 16 proxy/middleware — follow docs at install time.

### Phase 1 — Supabase + Auth + Profile *(implemented)*

- **Outcome:** Register / login / logout; protected app shell; profile row on signup.
- **Non-goals:** OAuth (unless approved), full onboarding quiz persistence polish.
- **DB:** `profiles` + trigger on `auth.users`; RLS.
- **Security:** SSR cookies, RLS checklist in `docs/security-rls.md` (manual two-user verification).
- **Acceptance:** Unauthenticated users redirected; owner-only profile read/write.

### Phase 2 — Exercises *(implemented)*

- **Outcome:** User-owned exercise CRUD inside `/app/exercises`, with shared Zod validation and a database check for https YouTube or Vimeo demo URLs.
- **Starter library:** eight private copies per athlete, inserted by `seed_starter_exercises` from the signup trigger. Existing profiles with no exercises are backfilled once by `supabase/migrations/20261106193000_exercises.sql`. There is no shared editable catalog row.
- **Non-goals:** Hosted video, a large catalog, routines, sessions, timers, Explore, Google OAuth, AI Coach.
- **DB:** `exercises` plus owner-only RLS. Do not edit or re-apply `20261104210000_profiles.sql`.
- **Security:** Server Actions call `getUser()` and write `user_id` from that session. Policies use `(select auth.uid())` and `to authenticated`.
- **Acceptance:** Zod unit tests cover field and demo-URL rules. The two-user RLS checklist in `docs/security-rls.md` is run after the migration is applied once. Lint, typecheck, unit tests, and the production build pass.

### Phase 3 — Routines + multi-section builder (mobile-first UI) *(implemented)*

- **Outcome:** Create/edit/save routines with ordered sections and format-specific config; duplicate/archive/favorite; search. Mobile builder at `/app/routines` follows board “4-5 · Routine builder”.
- **Non-goals:** Perfect desktop builder parity, Explore catalog, AI, sessions/timers.
- **DB:** `routines`, `routine_sections`, `routine_exercises` in `supabase/migrations/20261106223000_routines.sql`, plus owner-only RLS and `save_routine` / `duplicate_routine` invoker RPCs. Do not edit or re-apply earlier migrations.
- **Security:** Server Actions call `getUser()` and ignore client-supplied user ids. Child rows are owner-scoped via denormalized `user_id` and composite FKs. Format configs validated by Zod and `is_valid_format_config`.
- **Acceptance:** All 9 formats validate; invalid configs rejected server-side; two-user RLS checklist in `docs/security-rls.md`; lint, typecheck, unit tests, and production build pass.

### Phase 4 — Workout sessions + reliable timer *(core risk phase)*

- **Outcome:** Start session → snapshot → execute **AMRAP, For Time, Strength, Custom** with pause/resume/refresh survival → end → review.
- **Non-goals:** Full EMOM/Tabata/Intervals/Running/RFT timer UX (schema ready; UI later).
- **DB:** `workout_sessions`, `session_section_results`.
- **Acceptance:** Refresh mid-AMRAP restores correct remaining/elapsed; template edit after complete does not change history.

### Phase 5 — Results, history, basic comparisons

- **Outcome:** Save/discard flow; history list; metric-aware compare for repeat For Time / AMRAP / strength load.
- **Non-goals:** Fancy charts parity with desktop Progress, automatic “Fran” entity graph.
- **Acceptance:** PR badge only when same metric + comparable context; unlike metrics never ranked.

### Phase 6 — Profile prefs, theme, responsive desktop layouts

- **Outcome:** Units, theme, onboarding fields; desktop dashboard/builder/progress layouts from design.
- **Non-goals:** Social, payments.

### Phase 7 — Remaining timer formats + polish

- EMOM, Tabata, Intervals, RFT, Running; multi-section advance UX; empty/error states.

### Phase 8 — Explore seed (optional)

- Only if curated templates are wanted in MVP.

### Phase 9 — AI Coach (explicitly later)

- Server-side provider, validate drafts, user confirm before save; rate/cost limits.

---

## 10. Risks, assumptions, and open questions

### Risks

1. **Timer correctness** under iOS Safari backgrounding — mitigate with timestamps + resume reconciliation; be honest about OS limits.
2. **Format explosion** delaying MVP — mitigate with schema-all / timer-subset.
3. **Snapshot size/complexity** — keep snapshot schema versioned (`snapshot_version: 1`).
4. **RLS bugs** — mandatory two-user tests every phase that adds tables.
5. **Design fidelity vs speed** — tokenized UI early prevents “generic Tailwind” drift.
6. **Benchmark identity** (“Fran”) — without a stable key, history charts are fuzzy.

### Assumptions

- Single athlete, private data only for MVP.
- Web-first (Vercel); mobile browser, not native.
- English UI initially.
- External demo videos only.

### Open questions *(need decisions before or during early phases)*

1. Email/password only for Phase 1, or Google OAuth too?
2. Is **Explore** in MVP or hide the tab until later?
3. Onboarding: persist full quiz in Phase 1, or minimal profile then enhance?
4. Default units: kg or lb?
5. After complete, are results editable or append-only?
6. Abandoned vs discard: soft-delete session or hard delete unsaved?
7. Multi-section workouts: auto-advance vs manual “next section”?
8. Curated system exercises vs user-created only at start?
9. Any compliance constraint on storing training data / account deletion timeline?

---

## 11. Recommended first implementation phase

**Phase 0 — Project foundation only.**

Concrete scope when approved:

1. Initialize Next.js (App Router, TypeScript, Tailwind, ESLint) in this repo **without** deleting design/docs.
2. Map design tokens into Tailwind theme / CSS variables.
3. Add Vitest + Testing Library; Playwright scaffold (smoke only).
4. Add `.env.example` placeholders (`NEXT_PUBLIC_SUPABASE_URL`, publishable key, etc.) — no real project required yet.
5. Optional: empty `docs/adr/` stub list (files only if docs are wanted in the same phase).
6. Verify scripts: lint, typecheck, unit test, dev server.

**Explicitly out of Phase 0:** Supabase connect, schema, auth pages, feature code, dependency sprawl (no state library, no UI kit restyle).

---

## 12. Exact approval needed before implementation

Please approve (and decide) on:

1. **Approve Phase 0** as described (initialize Next.js + tokens + tooling only)?
2. Confirm stack stays **Next.js + Supabase + Tailwind + Zod + Vitest + Playwright**.
3. Confirm **snapshot-on-start JSONB** approach for historical integrity.
4. Confirm **timer format wave**: schema for all 9 now; live timer first for AMRAP / For Time / Strength / Custom.
5. Answers to open questions that matter now — especially **OAuth**, **Explore in MVP**, and **default units**.
6. Confirm **AI Coach and notifications remain out** until a later approved phase.

---

## Recommended supporting documentation (create after plan approval)

| Document | Why |
|---|---|
| `docs/architecture-overview.md` | Short map of layers, routes, and feature boundaries |
| `docs/adr/` | Record decisions (snapshot strategy, auth cookies, timer clock, no Prisma) |
| `docs/domain-model.md` | Formats, invariants, lifecycle transitions |
| `docs/roadmap.md` | Living phase checklist with acceptance criteria |
| `docs/security-rls.md` | Per-table policy intent and test checklist |

Do not create these until the plan is approved, unless requested.

---

*End of plan. No implementation until Phase 0 is explicitly approved.*
