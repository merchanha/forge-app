"use server";

import { revalidatePath } from "next/cache";

import { updateProfileSchema } from "@/features/profiles/validation";
import { createServerSupabaseClient } from "@/platform/supabase/server";

export type ProfileActionState = {
  error: string | null;
  success: boolean;
};

function firstZodError(error: {
  issues: Array<{ message: string }>;
}): string {
  return error.issues[0]?.message ?? "Invalid input";
}

export async function updateProfileAction(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = updateProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    preferredUnits: formData.get("preferredUnits"),
    theme: formData.get("theme"),
    experienceLevel: formData.get("experienceLevel"),
    disciplines: formData.getAll("disciplines"),
    primaryDiscipline: formData.get("primaryDiscipline"),
    goal: formData.get("goal"),
    daysPerWeek: formData.get("daysPerWeek"),
    targetEvent: formData.get("targetEvent") ?? "",
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be signed in to update your profile.", success: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      preferred_units: parsed.data.preferredUnits,
      theme: parsed.data.theme,
      experience_level: parsed.data.experienceLevel,
      disciplines: parsed.data.disciplines,
      primary_discipline: parsed.data.primaryDiscipline,
      goal: parsed.data.goal,
      days_per_week: parsed.data.daysPerWeek,
      target_event: parsed.data.targetEvent,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/profile");
  revalidatePath("/app/routines");
  revalidatePath("/app/history");
  return { error: null, success: true };
}
