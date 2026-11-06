# FORGE

Fitness training application: create routines, execute format-aware workouts, and track progress.

**Tagline:** Build your training. Track your progress. Become stronger.

## Current status

**Phase 2 complete (exercise library).**  
Email/password auth, cookie sessions, profiles, and a protected `/app` shell are in place. Athletes can create, list, edit, and delete their own exercises, including a private starter set. Routines and workout sessions start in Phase 3+.

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

`supabase/migrations/20261104210000_profiles.sql` is already applied and recorded as version `20261104210000`. Do not run it again.

Phase 2 adds `supabase/migrations/20261106193000_exercises.sql`. Apply that new file once:

- Push the migration and let the Supabase GitHub integration apply it. The integration records the version in `supabase_migrations.schema_migrations` and skips versions that are already recorded.
- Or, with the CLI linked to this project, run `npx supabase db push` once. A later GitHub sync skips that recorded version.

Do not paste the exercises SQL into the SQL editor and also let the integration apply the same unrecorded file. That applies it twice. Do not re-run the profiles migration.

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
│   │   └── profiles/
│   ├── platform/supabase/  # SSR clients + types
│   └── shared/             # Cross-cutting UI/theme
├── src/proxy.ts            # Session refresh + route guards (Next.js 16)
└── package.json
```

## Phase boundary

**In Phase 2:** User-owned exercise CRUD, https YouTube/Vimeo demo links, owner-only RLS, and a private eight-exercise starter set at `/app/exercises`.  
**Out:** Google OAuth, routines, sessions/timers, AI Coach, Explore, hosted video.
