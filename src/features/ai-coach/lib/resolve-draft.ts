import type { SupabaseClient } from "@supabase/supabase-js";

import type { AiRoutineDraft } from "@/features/ai-coach/validation";
import type { RoutineBuilderInitial } from "@/features/routines/components/routine-builder";
import type { RoutineInput } from "@/features/routines/validation";
import { routineInputSchema } from "@/features/routines/validation";
import type { Database, ExerciseMovementCategory } from "@/platform/supabase/database.types";

function guessMovementCategory(name: string): ExerciseMovementCategory {
  const lower = name.toLowerCase();
  if (/run|jog|row|ski|bike|echo|assault|walk/.test(lower)) {
    return "monostructural";
  }
  if (/squat|deadlift|press|clean|snatch|bench|lunge/.test(lower)) {
    return "strength";
  }
  if (/pull-?up|muscle-?up|handstand|toes.?to|pistol/.test(lower)) {
    return "gymnastics";
  }
  if (/wall.?ball|thruster|burpee|box.?jump|kb|kettle/.test(lower)) {
    return "conditioning";
  }
  return "other";
}

/** DB requires equipment length 1–40 (not empty). */
function guessEquipment(name: string, category: ExerciseMovementCategory): string {
  const lower = name.toLowerCase();
  if (/run|jog|walk/.test(lower)) {
    return "None";
  }
  if (/row|ski|bike|echo|assault/.test(lower)) {
    return "Machine";
  }
  if (/barbell|clean|snatch|squat|deadlift|press/.test(lower)) {
    return "Barbell";
  }
  if (/pull-?up|muscle-?up|toes/.test(lower)) {
    return "Rig";
  }
  if (/box/.test(lower)) {
    return "Box";
  }
  if (/wall.?ball/.test(lower)) {
    return "Medicine ball";
  }
  if (category === "monostructural") {
    return "None";
  }
  if (category === "gymnastics" || category === "conditioning") {
    return "Bodyweight";
  }
  return "Other";
}

async function ensureExerciseId(
  supabase: SupabaseClient<Database>,
  userId: string,
  name: string,
  cache: Map<string, { id: string; name: string; demoUrl: string | null }>,
): Promise<{ id: string; name: string; demoUrl: string | null }> {
  const key = name.trim();
  const cached = cache.get(key.toLowerCase());
  if (cached) {
    return cached;
  }

  // Prefer exact name, then case-insensitive match against the athlete library.
  const { data: exact, error: exactError } = await supabase
    .from("exercises")
    .select("id, name, demo_url")
    .eq("user_id", userId)
    .eq("name", key)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (exactError) {
    throw new Error("Could not look up exercises.");
  }

  let existing = exact;
  if (!existing) {
    const { data: fuzzy, error: fuzzyError } = await supabase
      .from("exercises")
      .select("id, name, demo_url")
      .eq("user_id", userId)
      .ilike("name", key)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fuzzyError) {
      throw new Error("Could not look up exercises.");
    }
    existing = fuzzy;
  }

  if (existing) {
    const value = {
      id: existing.id,
      name: existing.name,
      demoUrl: existing.demo_url,
    };
    cache.set(key.toLowerCase(), value);
    return value;
  }

  const movementCategory = guessMovementCategory(key);
  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: userId,
      name: key,
      description: "",
      movement_category: movementCategory,
      equipment: guessEquipment(key, movementCategory),
      demo_url: null,
    })
    .select("id, name, demo_url")
    .single();

  if (error || !data) {
    throw new Error(`Could not create exercise “${key}”.`);
  }

  const value = {
    id: data.id,
    name: data.name,
    demoUrl: data.demo_url,
  };
  cache.set(key.toLowerCase(), value);
  return value;
}

export async function resolveDraftToRoutineInput(
  supabase: SupabaseClient<Database>,
  userId: string,
  draft: AiRoutineDraft,
): Promise<
  | { ok: true; input: RoutineInput; builderInitial: RoutineBuilderInitial }
  | { ok: false; error: string }
> {
  try {
    const cache = new Map<
      string,
      { id: string; name: string; demoUrl: string | null }
    >();

    const sections = [];
    for (const section of draft.sections) {
      const exercises = [];
      for (const movement of section.exercises) {
        const resolved = await ensureExerciseId(
          supabase,
          userId,
          movement.exerciseName,
          cache,
        );
        exercises.push({
          exerciseId: resolved.id,
          exerciseName: resolved.name,
          demoUrl: resolved.demoUrl,
          quantity: movement.quantity,
          quantityUnit: movement.quantityUnit,
          loadValue: movement.loadValue,
          loadUnit: movement.loadUnit,
          targetPaceSecondsPerKm: movement.targetPaceSecondsPerKm,
          hrZone: movement.hrZone,
          segmentRepeats: movement.segmentRepeats,
          notes: movement.notes,
        });
      }
      sections.push({
        name: section.name,
        format: section.format,
        formatConfig: section.formatConfig,
        exercises,
      });
    }

    const builderInitial: RoutineBuilderInitial = {
      name: draft.name,
      description: draft.description,
      category: draft.category,
      tags: draft.tags,
      objective: draft.objective,
      equipment: draft.equipment,
      scaling: draft.scaling,
      effortRpe: draft.effortRpe,
      sections,
    };

    const parsed = routineInputSchema.safeParse({
      name: draft.name,
      description: draft.description,
      category: draft.category,
      tags: draft.tags,
      objective: draft.objective,
      equipment: draft.equipment,
      scaling: draft.scaling,
      effortRpe: draft.effortRpe,
      sections: sections.map((section) => ({
        name: section.name,
        format: section.format,
        formatConfig: section.formatConfig,
        exercises: section.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          quantity: exercise.quantity,
          quantityUnit: exercise.quantityUnit,
          loadValue: exercise.loadValue,
          loadUnit: exercise.loadUnit,
          targetPaceSecondsPerKm: exercise.targetPaceSecondsPerKm,
          hrZone: exercise.hrZone,
          segmentRepeats: exercise.segmentRepeats,
          notes: exercise.notes,
        })),
      })),
    });

    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Draft failed validation.",
      };
    }

    return { ok: true, input: parsed.data, builderInitial };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Could not resolve draft.",
    };
  }
}
