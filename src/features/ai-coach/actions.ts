"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildAiCoachContext } from "@/features/ai-coach/lib/context";
import { resolveDraftToRoutineInput } from "@/features/ai-coach/lib/resolve-draft";
import { generateAiCoachDraft } from "@/features/ai-coach/provider/generate-draft";
import { consumeAiCoachRequest } from "@/features/ai-coach/rate-limit";
import {
  aiCoachPromptSchema,
  type AiCoachDraftResult,
  type AiRoutineDraft,
} from "@/features/ai-coach/validation";
import type { RoutineBuilderInitial } from "@/features/routines/components/routine-builder";
import type { RoutineInput } from "@/features/routines/validation";
import { createServerSupabaseClient } from "@/platform/supabase/server";
import type { Json } from "@/platform/supabase/database.types";

export type AskCoachResult =
  | {
      ok: true;
      coachMessage: string;
      draft: AiRoutineDraft | null;
      remaining: number;
    }
  | { ok: false; error: string; code?: string };

export type ConfirmDraftResult =
  | { ok: true }
  | { ok: false; error: string };

export type ResolveDraftResult =
  | { ok: true; initial: RoutineBuilderInitial }
  | { ok: false; error: string };

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
    id: null,
    name: input.name,
    description: input.description,
    category: input.category,
    tags: input.tags,
    objective: input.objective,
    equipment: input.equipment,
    scaling: input.scaling,
    effortRpe: input.effortRpe,
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
        targetPaceSecondsPerKm: exercise.targetPaceSecondsPerKm,
        hrZone: exercise.hrZone,
        segmentRepeats: exercise.segmentRepeats,
        notes: exercise.notes,
      })),
    })),
  };
}

export async function askAiCoachAction(prompt: string): Promise<AskCoachResult> {
  const parsedPrompt = aiCoachPromptSchema.safeParse(prompt);
  if (!parsedPrompt.success) {
    return {
      ok: false,
      error: parsedPrompt.error.issues[0]?.message ?? "Invalid prompt.",
    };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const rate = await consumeAiCoachRequest(supabase, 0);
  if (!rate.ok) {
    return { ok: false, error: rate.error, code: rate.code };
  }

  let context;
  try {
    context = await buildAiCoachContext();
  } catch {
    return { ok: false, error: "Could not load your training context." };
  }

  const generated = await generateAiCoachDraft({
    prompt: parsedPrompt.data,
    context,
  });

  if (!generated.ok) {
    return {
      ok: false,
      error: generated.error,
      code: generated.code,
    };
  }

  const value: AiCoachDraftResult = generated.value;
  return {
    ok: true,
    coachMessage: value.coachMessage,
    draft: value.draft,
    remaining: rate.remaining,
  };
}

export async function resolveAiDraftForBuilderAction(
  draft: AiRoutineDraft,
): Promise<ResolveDraftResult> {
  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const resolved = await resolveDraftToRoutineInput(supabase, user.id, draft);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  return { ok: true, initial: resolved.builderInitial };
}

export async function confirmAiDraftAction(
  draft: AiRoutineDraft,
): Promise<ConfirmDraftResult> {
  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const resolved = await resolveDraftToRoutineInput(supabase, user.id, draft);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const { data, error } = await supabase.rpc("save_routine", {
    payload: toSavePayload(resolved.input),
  });

  if (error || !data) {
    return { ok: false, error: "Could not save this routine." };
  }

  revalidatePath("/app/routines");
  revalidatePath("/app/ai-coach");
  revalidatePath(`/app/routines/${data}`);
  // Persist is complete — send athletes to My Training, not the editor.
  redirect("/app/routines");
}
