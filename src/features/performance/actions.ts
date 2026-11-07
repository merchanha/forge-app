"use server";

import { revalidatePath } from "next/cache";

import { editCompletedSessionInputSchema } from "@/features/performance/validation";
import type { Json } from "@/platform/supabase/database.types";
import { createServerSupabaseClient } from "@/platform/supabase/server";

export type PerformanceActionState = {
  error: string | null;
  success: boolean;
};

const okState: PerformanceActionState = { error: null, success: true };

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

export async function updateCompletedSessionResultsAction(
  _prev: PerformanceActionState,
  formData: FormData,
): Promise<PerformanceActionState> {
  const rawSections = formData.get("sectionResults");
  if (typeof rawSections !== "string") {
    return { error: "Invalid result payload.", success: false };
  }

  let sectionResultsJson: unknown;
  try {
    sectionResultsJson = JSON.parse(rawSections);
  } catch {
    return { error: "Invalid result payload.", success: false };
  }

  const parsed = editCompletedSessionInputSchema.safeParse({
    sessionId: formData.get("sessionId"),
    notes: formData.get("notes") ?? "",
    sectionResults: sectionResultsJson,
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { error: "You must be signed in.", success: false };
  }

  const { data: session, error: sessionError } = await supabase
    .from("workout_sessions")
    .select("id, status, routine_id, routine_snapshot")
    .eq("id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionError || !session) {
    return { error: "Session not found.", success: false };
  }
  if (session.status !== "completed") {
    return {
      error: "Only completed workouts can be edited here.",
      success: false,
    };
  }

  const snapshot = session.routine_snapshot as {
    sections?: Array<{ format?: string }>;
  };
  const sectionCount = Array.isArray(snapshot.sections)
    ? snapshot.sections.length
    : 0;

  for (const entry of parsed.data.sectionResults) {
    if (entry.sectionIndex >= sectionCount) {
      return { error: "Section index is out of range.", success: false };
    }
    const expectedFormat = snapshot.sections?.[entry.sectionIndex]?.format;
    if (expectedFormat && entry.result.format !== expectedFormat) {
      return {
        error: "Result format must match the frozen snapshot section.",
        success: false,
      };
    }
  }

  const { error: notesError } = await supabase
    .from("workout_sessions")
    .update({ notes: parsed.data.notes })
    .eq("id", session.id)
    .eq("user_id", user.id)
    .eq("status", "completed");

  if (notesError) {
    return { error: "Could not update notes.", success: false };
  }

  for (const entry of parsed.data.sectionResults) {
    const { error: upsertError } = await supabase
      .from("session_section_results")
      .upsert(
        {
          user_id: user.id,
          session_id: session.id,
          section_index: entry.sectionIndex,
          format: entry.result.format,
          result: entry.result as unknown as Json,
        },
        { onConflict: "session_id,section_index" },
      );

    if (upsertError) {
      return { error: "Could not update results.", success: false };
    }
  }

  revalidatePath(`/app/sessions/${session.id}/review`);
  revalidatePath("/app/history");
  if (session.routine_id) {
    revalidatePath(`/app/history?routineId=${session.routine_id}`);
    revalidatePath(`/app/routines/${session.routine_id}`);
  }

  return okState;
}
