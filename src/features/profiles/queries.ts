import type { Profile } from "@/platform/supabase/database.types";
import { requireUser } from "@/platform/supabase/require-user";

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
