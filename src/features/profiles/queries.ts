import type {
  ExperienceLevel,
  PreferredUnits,
  Profile,
  ProfileTheme,
  TrainingGoal,
} from "@/platform/supabase/database.types";
import { requireUser } from "@/platform/supabase/require-user";

const profileColumns =
  "id, display_name, preferred_units, theme, experience_level, disciplines, primary_discipline, goal, days_per_week, target_event, created_at, updated_at";

const legacyProfileColumns =
  "id, display_name, preferred_units, created_at, updated_at";

type LegacyProfileRow = {
  id: string;
  display_name: string;
  preferred_units: PreferredUnits;
  created_at: string;
  updated_at: string;
};

function withProfileDefaults(
  row: LegacyProfileRow & Partial<Profile>,
): Profile {
  return {
    id: row.id,
    display_name: row.display_name,
    preferred_units: row.preferred_units,
    theme: (row.theme as ProfileTheme | undefined) ?? "dark",
    experience_level:
      (row.experience_level as ExperienceLevel | null | undefined) ?? null,
    disciplines: row.disciplines ?? [],
    primary_discipline: row.primary_discipline ?? null,
    goal: (row.goal as TrainingGoal | null | undefined) ?? null,
    days_per_week: row.days_per_week ?? null,
    target_event: row.target_event ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getOwnProfile(): Promise<Profile | null> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(profileColumns)
    .eq("id", user.id)
    .maybeSingle();

  if (!error) {
    return data ? withProfileDefaults(data) : null;
  }

  // Temporary fallback until Phase 6 migration is applied on the linked project.
  const { data: legacy, error: legacyError } = await supabase
    .from("profiles")
    .select(legacyProfileColumns)
    .eq("id", user.id)
    .maybeSingle();

  if (legacyError) {
    throw new Error(error.message);
  }

  return legacy ? withProfileDefaults(legacy) : null;
}
