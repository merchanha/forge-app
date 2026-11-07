"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteRoutineSchema,
  routineIdSchema,
  routineInputSchema,
  type RoutineInput,
} from "@/features/routines/validation";
import { createServerSupabaseClient } from "@/platform/supabase/server";
import type { Json } from "@/platform/supabase/database.types";

export type RoutineActionState = {
  error: string | null;
  success: boolean;
};

const savedState: RoutineActionState = { error: null, success: true };

function firstZodError(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid input";
}

async function requireActionUser() {
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

function toSavePayload(input: RoutineInput): Json {
  return {
    id: input.id ?? null,
    name: input.name,
    description: input.description,
    category: input.category,
    tags: input.tags,
    sections: input.sections.map((section) => ({
      name: section.name,
      format: section.format,
      formatConfig: section.formatConfig,
      exercises: section.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        quantity: exercise.quantity,
        quantityUnit: exercise.quantityUnit,
        loadValue: exercise.loadValue,
        loadUnit: exercise.loadUnit,
        notes: exercise.notes,
      })),
    })),
  };
}

function mapSaveError(message: string | undefined): string {
  if (!message) {
    return "Could not save this routine.";
  }
  if (message.includes("format_config") || message.includes("is_valid_format_config")) {
    return "One section has an invalid format config.";
  }
  if (message.includes("routine_exercises_exercise_owner_fkey")) {
    return "Pick exercises from your own library.";
  }
  if (message.includes("At least one section")) {
    return "Add at least one section.";
  }
  if (message.includes("Routine not found")) {
    return "Routine not found.";
  }
  return "Could not save this routine.";
}

export async function saveRoutineAction(
  _prev: RoutineActionState,
  formData: FormData,
): Promise<RoutineActionState> {
  const raw = formData.get("payload");
  if (typeof raw !== "string") {
    return { error: "Invalid routine payload.", success: false };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { error: "Invalid routine payload.", success: false };
  }

  const parsed = routineInputSchema.safeParse(json);
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return {
      error: "You must be signed in to save a routine.",
      success: false,
    };
  }

  const { data, error } = await supabase.rpc("save_routine", {
    payload: toSavePayload(parsed.data),
  });

  if (error || !data) {
    return { error: mapSaveError(error?.message), success: false };
  }

  revalidatePath("/app/routines");
  revalidatePath(`/app/routines/${data}`);
  redirect(`/app/routines/${data}`);
}

export async function duplicateRoutineAction(
  _prev: RoutineActionState,
  formData: FormData,
): Promise<RoutineActionState> {
  const parsedId = routineIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    return { error: "Routine not found.", success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return {
      error: "You must be signed in to duplicate a routine.",
      success: false,
    };
  }

  const { data, error } = await supabase.rpc("duplicate_routine", {
    source_id: parsedId.data,
  });

  if (error || !data) {
    return { error: "Could not duplicate this routine.", success: false };
  }

  revalidatePath("/app/routines");
  redirect(`/app/routines/${data}`);
}

export async function toggleFavoriteRoutineAction(
  _prev: RoutineActionState,
  formData: FormData,
): Promise<RoutineActionState> {
  const parsedId = routineIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    return { error: "Routine not found.", success: false };
  }

  const nextFavorite = formData.get("isFavorite") === "true";

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return {
      error: "You must be signed in to update a routine.",
      success: false,
    };
  }

  const { data, error } = await supabase
    .from("routines")
    .update({ is_favorite: nextFavorite })
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Could not update this routine.", success: false };
  }
  if (!data) {
    return { error: "Routine not found.", success: false };
  }

  revalidatePath("/app/routines");
  revalidatePath(`/app/routines/${data.id}`);
  return savedState;
}

export async function archiveRoutineAction(
  _prev: RoutineActionState,
  formData: FormData,
): Promise<RoutineActionState> {
  const parsedId = routineIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    return { error: "Routine not found.", success: false };
  }

  const restore = formData.get("restore") === "true";

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return {
      error: "You must be signed in to archive a routine.",
      success: false,
    };
  }

  const { data, error } = await supabase
    .from("routines")
    .update({ archived_at: restore ? null : new Date().toISOString() })
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Could not archive this routine.", success: false };
  }
  if (!data) {
    return { error: "Routine not found.", success: false };
  }

  revalidatePath("/app/routines");
  revalidatePath(`/app/routines/${data.id}`);
  return savedState;
}

export async function deleteRoutineAction(
  _prev: RoutineActionState,
  formData: FormData,
): Promise<RoutineActionState> {
  const parsed = deleteRoutineSchema.safeParse({
    id: formData.get("id"),
    confirmDelete: formData.get("confirmDelete") ?? "",
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return {
      error: "You must be signed in to delete a routine.",
      success: false,
    };
  }

  const { data, error } = await supabase
    .from("routines")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Could not delete this routine.", success: false };
  }
  if (!data) {
    return { error: "Routine not found.", success: false };
  }

  revalidatePath("/app/routines");
  redirect("/app/routines");
}
