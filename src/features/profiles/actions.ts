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
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/app");
  revalidatePath("/app/profile");
  return { error: null, success: true };
}
