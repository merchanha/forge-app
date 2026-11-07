import { connection } from "next/server";

import { createServerSupabaseClient } from "@/platform/supabase/server";

/**
 * Authenticated Supabase access for Server Components / Actions.
 *
 * Supabase Auth calls `Date.now()` while validating JWTs. That is request-bound
 * work (Solution 2 in Cache Components terms): await `connection()` before
 * `getUser()` so prerender never snapshots a wall clock. Prefer this over making
 * the header a Client Component — auth must stay on the server.
 */
export async function requireUser() {
  // Wait for a real request before JWT/session clock checks.
  await connection();

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null as null };
  }

  return { supabase, user };
}
