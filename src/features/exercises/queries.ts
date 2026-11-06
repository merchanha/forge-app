import type { Exercise } from "@/platform/supabase/database.types";
import { requireUser } from "@/platform/supabase/require-user";
import { exerciseIdSchema } from "@/features/exercises/validation";

const exerciseColumns =
  "id, user_id, name, description, movement_category, equipment, demo_url, created_at, updated_at";

export async function listOwnExercises(): Promise<Exercise[]> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("exercises")
    .select(exerciseColumns)
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Could not load exercises.");
  }

  return data ?? [];
}

export async function getOwnExercise(id: string): Promise<Exercise | null> {
  const parsedId = exerciseIdSchema.safeParse(id);
  if (!parsedId.success) {
    return null;
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("exercises")
    .select(exerciseColumns)
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load this exercise.");
  }

  return data;
}
