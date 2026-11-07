"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  deleteExerciseSchema,
  exerciseIdSchema,
  exerciseInputSchema,
} from "@/features/exercises/validation";
import { createServerSupabaseClient } from "@/platform/supabase/server";

export type ExerciseActionState = {
  error: string | null;
  success: boolean;
};

const savedState: ExerciseActionState = { error: null, success: true };

function firstZodError(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid input";
}

function readExerciseFields(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    movementCategory: formData.get("movementCategory"),
    equipment: formData.get("equipment"),
    demoUrl: formData.get("demoUrl") ?? "",
  };
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

export async function createExerciseAction(
  _prev: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const parsed = exerciseInputSchema.safeParse(readExerciseFields(formData));
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return {
      error: "You must be signed in to save an exercise.",
      success: false,
    };
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      movement_category: parsed.data.movementCategory,
      equipment: parsed.data.equipment,
      demo_url: parsed.data.demoUrl,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not save this exercise.", success: false };
  }

  revalidatePath("/app/exercises");
  redirect(`/app/exercises/${data.id}`);
}

export async function updateExerciseAction(
  _prev: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const parsed = exerciseInputSchema.safeParse(readExerciseFields(formData));
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const parsedId = exerciseIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    return { error: "Exercise not found.", success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return {
      error: "You must be signed in to save an exercise.",
      success: false,
    };
  }

  const { data, error } = await supabase
    .from("exercises")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      movement_category: parsed.data.movementCategory,
      equipment: parsed.data.equipment,
      demo_url: parsed.data.demoUrl,
    })
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Could not save this exercise.", success: false };
  }
  if (!data) {
    return { error: "Exercise not found.", success: false };
  }

  revalidatePath("/app/exercises");
  revalidatePath(`/app/exercises/${data.id}`);
  return savedState;
}

export async function deleteExerciseAction(
  _prev: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const parsed = deleteExerciseSchema.safeParse({
    id: formData.get("id"),
    confirmDelete: formData.get("confirmDelete") ?? "",
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return {
      error: "You must be signed in to delete an exercise.",
      success: false,
    };
  }

  const { data, error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (
      error.code === "23503" ||
      error.message.includes("routine_exercises_exercise_owner_fkey")
    ) {
      return {
        error:
          "This exercise is used in a routine. Remove it from your routines first.",
        success: false,
      };
    }
    return { error: "Could not delete this exercise.", success: false };
  }
  if (!data) {
    return { error: "Exercise not found.", success: false };
  }

  revalidatePath("/app/exercises");
  redirect("/app/exercises");
}
