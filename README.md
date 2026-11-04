# FORGE

Fitness training application: create routines, execute format-aware workouts, and track progress.

**Tagline:** Build your training. Track your progress. Become stronger.

## Current status

**Phase 0 complete (foundation only).**  
Next.js app scaffolding, design tokens, lint/format/typecheck, and test tooling are in place. Supabase, auth, schema, and product features are **not** started yet.

Product requirements: [`product-overview.md`](./product-overview.md)  
Design source of truth: [`design/FORGE.html`](./design/FORGE.html)  
Implementation plan: [`docs/implementation-plan.md`](./docs/implementation-plan.md)  
Approved decisions: [`docs/approved-decisions.md`](./docs/approved-decisions.md)

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 + FORGE design tokens |
| Package manager | npm |
| Node | 22 (see `.nvmrc` and `engines`) |
| Unit tests | Vitest + Testing Library |
| E2E | Playwright |
| Backend (Phase 1+) | Supabase (Auth, Postgres, RLS) |

## Prerequisites

- Node.js 22.x
- npm 10+

```bash
nvm use   # or otherwise select Node 22
```

## Setup

```bash
npm install
cp .env.example .env.local   # placeholders only for now; Supabase not connected
```

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
├── docs/                   # Plans and decisions
├── e2e/                    # Playwright tests
├── src/
│   ├── app/                # Next.js App Router
│   └── shared/             # Cross-cutting UI/theme primitives
├── product-overview.md
├── START-HERE-PROMPT.md
└── package.json
```

Feature folders (`auth`, `routines`, `workout-sessions`, …) will be introduced in later phases when real functionality lands.

## Phase 0 scope boundary

Included: app bootstrap, tokens, tooling, smoke page, `.env.example`.  
Excluded: Supabase connection, database schema, authentication, product features.
