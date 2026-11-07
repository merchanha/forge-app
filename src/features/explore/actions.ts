"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exploreTemplateIdSchema } from "@/features/explore/validation";
import { createServerSupabaseClient } from "@/platform/supabase/server";

export type ExploreActionState = {
  error: string | null;
  success: boolean;
};

const savedState: ExploreActionState = { error: null, success: true };

function mapCopyError(message: string | undefined): string {
  if (!message) {
    return "Could not save this template.";
  }
  if (message.includes("Explore template not found")) {
    return "Explore template not found.";
  }
  if (message.includes("no sections")) {
    return "This template is incomplete.";
  }
  if (message.includes("format_config") || message.includes("is_valid_format_config")) {
    return "This template has an invalid format config.";
  }
  return "Could not save this template.";
}

export async function copyExploreTemplateAction(
  _prev: ExploreActionState,
  formData: FormData,
): Promise<ExploreActionState> {
  const parsedId = exploreTemplateIdSchema.safeParse(formData.get("id"));
  if (!parsedId.success) {
    return { error: "Explore template not found.", success: false };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: "You must be signed in to save a template.",
      success: false,
    };
  }

  const { data, error } = await supabase.rpc("copy_explore_template", {
    template_id: parsedId.data,
  });

  if (error || !data) {
    return { error: mapCopyError(error?.message), success: false };
  }

  revalidatePath("/app/explore");
  revalidatePath("/app/routines");
  revalidatePath(`/app/routines/${data}`);
  redirect(`/app/routines/${data}`);

  return savedState;
}
