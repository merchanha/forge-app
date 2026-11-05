# ADR 001 — Supabase cookie auth with `@supabase/ssr`

## Status

Accepted (Phase 1)

## Context

FORGE needs authenticated athletes with secure browser sessions. Product and security rules forbid storing access/refresh tokens in `localStorage` or `sessionStorage`.

## Decision

- Use Supabase Auth with email/password for MVP.
- Use `@supabase/ssr` cookie sessions (`createBrowserClient` / `createServerClient`).
- Refresh sessions in Next.js 16 `proxy.ts` via `getClaims()`.
- Authorize mutations with `getUser()` inside Server Actions; enforce ownership with Postgres RLS.
- Create a `profiles` row with a security-definer trigger on `auth.users` insert.

## Consequences

- Sessions travel as HttpOnly cookies; proxy must return the response that carries refreshed cookies.
- Email confirmation is a Supabase project setting; local MVP may disable it.
- Google OAuth remains deferred.
