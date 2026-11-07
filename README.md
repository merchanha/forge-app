# FORGE

Fitness training application: create routines, execute format-aware workouts, and track progress.

**Tagline:** Build your training. Track your progress. Become stronger.

## Current status

**Phase 6 complete (profile prefs, theme, responsive desktop layouts).**  
Email/password auth, cookie sessions, profiles, exercises, routines, workout sessions, and history/compare are in place. Athletes can set units (kg/lb), dark/light theme, and basic training prefs; desktop hub/builder/progress layouts densify at large breakpoints while mobile stays compact. Explore, Google OAuth, AI Coach, and remaining live timer formats remain later.

Product requirements: [`product-overview.md`](./product-overview.md)  
Design source of truth: [`design/FORGE.html`](./design/FORGE.html)  
Implementation plan: [`docs/implementation-plan.md`](./docs/implementation-plan.md)  
Approved decisions: [`docs/approved-decisions.md`](./docs/approved-decisions.md)  
RLS checklist: [`docs/security-rls.md`](./docs/security-rls.md)

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + FORGE design tokens |
| Auth / DB | Supabase Auth + Postgres + RLS |
| Sessions | `@supabase/ssr` HttpOnly cookies |
| Package manager | npm |
| Node | 22 (see `.nvmrc` and `engines`) |
| Unit tests | Vitest + Testing Library |
| E2E | Playwright |

## Prerequisites

- Node.js 22.x
- npm 10+
- A Supabase project ([create one](https://supabase.com/dashboard))

```bash
nvm use   # or otherwise select Node 22
```

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` from **Supabase → Project Settings → API Keys**:

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (or legacy `anon` key) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for local |

Do **not** put the service role key in `NEXT_PUBLIC_*` or commit `.env.local`.

### Apply migrations once

Expected versions in `supabase_migrations.schema_migrations`:

- `20261104210000` / `profiles`
- `20261106193000` / `exercises`
- `20261106223000` / `routines`
- `20261107010000` / `workout_sessions`
- `20261107120000` / `performance_history` (Phase 5 index)
- `20261107140000` / `profile_prefs` (Phase 6 theme + onboarding fields)

If earlier Phase 3–5 versions are missing but tables/indexes already exist, push the repo (preferred) or run `npx supabase db push` once. Phase 3 and Phase 4 migrations are **idempotent** and will record themselves; then Phase 5/6 apply. Do not re-run `profiles` or `exercises` migrations. Do not paste migration SQL into the editor and also let the integration apply the same unrecorded file.

### Auth settings (local MVP)

In **Authentication → Providers**, keep Email enabled.

**URL configuration** (`Authentication → URL Configuration`):

- Site URL: `http://localhost:3000`
- Redirect URLs: include `http://localhost:3000/auth/confirm` and `http://localhost:3000/auth/callback`

**Confirm signup email template** (`Authentication → Email Templates → Confirm signup`):

Replace the default link with a token-hash link that hits the Next.js confirm route:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}"
  >Confirm email address</a
>
```

Without that template change (or an equivalent confirm route), clicking the email link will not mark the user confirmed.

For faster local testing you may disable “Confirm email”, but the routes above are the correct production path.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm run format:check` | Prettier check |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit/component tests |
| `npm run test:e2e` | Playwright smoke tests (starts dev server) |

## Project layout

```text
FORGE/
├── design/                 # Visual source of truth (do not replace)
├── docs/                   # Plans, ADRs, security notes
├── e2e/                    # Playwright tests
├── supabase/migrations/    # Versioned SQL
├── src/
│   ├── app/                # Next.js App Router
│   ├── features/
│   │   ├── auth/
│   │   ├── exercises/
│   │   ├── performance/    # History, compares, result edits
│   │   ├── profiles/       # Prefs, theme, app shell nav
│   │   ├── routines/
│   │   └── workout-sessions/
│   ├── platform/supabase/  # SSR clients + types
│   └── shared/             # Cross-cutting UI/theme
├── src/proxy.ts            # Session refresh + route guards (Next.js 16)
└── package.json
```

## Phase boundary

**In Phase 6:** Profile prefs (units/theme/onboarding fields), light theme via design tokens, responsive desktop Dashboard/Builder/Progress layouts, owner-only profile updates.  
**Out:** EMOM/Tabata/Intervals/Running/RFT live timers, Google OAuth, AI Coach, Explore, hosted video, social/payments.
