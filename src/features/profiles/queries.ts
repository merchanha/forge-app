import type { Profile } from "@/platform/supabase/database.types";
import { createServerSupabaseClient } from "@/platform/supabase/server";

export async function requireUser() {
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

export async function getOwnProfile(): Promise<Profile | null> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, preferred_units, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
