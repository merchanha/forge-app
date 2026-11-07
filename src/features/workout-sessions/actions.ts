"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOwnRoutine } from "@/features/routines/queries";
import { routineIdSchema } from "@/features/routines/validation";
import {
  assertSessionTransition,
  canTransitionSession,
} from "@/features/workout-sessions/lifecycle";
import { buildRoutineSnapshot } from "@/features/workout-sessions/snapshot";
import {
  resumeTimer,
  pauseTimer,
  wallClockMs,
  type TimerClockState,
} from "@/features/workout-sessions/timer";
import {
  abandonSessionInputSchema,
  advanceSectionInputSchema,
  completeSessionInputSchema,
  pauseResumeInputSchema,
  setScalingInputSchema,
  upsertSectionResultInputSchema,
  type SectionResult,
  type SessionStatus,
} from "@/features/workout-sessions/validation";
import type { Json } from "@/platform/supabase/database.types";
import { createServerSupabaseClient } from "@/platform/supabase/server";

export type SessionActionState = {
  error: string | null;
  success: boolean;
};

const okState: SessionActionState = { error: null, success: true };

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

type SessionRow = {
  id: string;
  status: SessionStatus;
  current_section_index: number;
  paused_at: string | null;
  total_paused_ms: number;
  current_section_started_at: string | null;
  routine_snapshot: Json;
};

async function loadOwnedInProgressSession(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  sessionId: string,
): Promise<{ session: SessionRow | null; error: string | null }> {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      "id, status, current_section_index, paused_at, total_paused_ms, current_section_started_at, routine_snapshot",
    )
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { session: null, error: "Could not load this session." };
  }
  if (!data) {
    return { session: null, error: "Session not found." };
  }

  return {
    session: {
      ...data,
      status: data.status as SessionStatus,
      total_paused_ms: Number(data.total_paused_ms),
    },
    error: null,
  };
}

function currentTimerState(session: SessionRow): TimerClockState | null {
  const startedAtMs = wallClockMs(session.current_section_started_at);
  if (startedAtMs == null) {
    return null;
  }
  return {
    startedAtMs,
    pausedAtMs: wallClockMs(session.paused_at),
    totalPausedMs: Math.max(0, Math.floor(session.total_paused_ms)),
  };
}

async function upsertSectionResult(args: {
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
  sessionId: string;
  sectionIndex: number;
  format: string;
  result: SectionResult;
  elapsedMs: number | null;
  sectionStartedAt: string | null;
  sectionEndedAt: string | null;
}) {
  const { error } = await args.supabase.from("session_section_results").upsert(
    {
      user_id: args.userId,
      session_id: args.sessionId,
      section_index: args.sectionIndex,
      format: args.format as SectionResult["format"],
      result: args.result as unknown as Json,
      elapsed_ms: args.elapsedMs,
      section_started_at: args.sectionStartedAt,
      section_ended_at: args.sectionEndedAt,
    },
    { onConflict: "session_id,section_index" },
  );

  return error;
}

export async function startWorkoutSessionAction(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const parsed = routineIdSchema.safeParse(formData.get("routineId"));
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return {
      error: "You must be signed in to start a workout.",
      success: false,
    };
  }

  const routine = await getOwnRoutine(parsed.data);
  if (!routine) {
    return { error: "Routine not found.", success: false };
  }
  if (routine.archivedAt) {
    return {
      error: "Restore this routine before starting it.",
      success: false,
    };
  }

  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("routine_id", routine.id)
    .eq("status", "in_progress")
    .maybeSingle();

  if (existing) {
    redirect(`/app/sessions/${existing.id}`);
  }

  let snapshot;
  try {
    snapshot = buildRoutineSnapshot(routine);
  } catch {
    return {
      error: "This routine has an invalid format config.",
      success: false,
    };
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      routine_id: routine.id,
      status: "in_progress",
      scaling: "rx",
      routine_snapshot: snapshot as unknown as Json,
      current_section_index: 0,
      started_at: nowIso,
      current_section_started_at: nowIso,
      total_paused_ms: 0,
      paused_at: null,
      notes: "",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Could not start this workout.", success: false };
  }

  revalidatePath("/app/routines");
  revalidatePath(`/app/sessions/${data.id}`);
  redirect(`/app/sessions/${data.id}`);
}

export async function pauseSessionAction(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const parsed = pauseResumeInputSchema.safeParse({
    sessionId: formData.get("sessionId"),
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { error: "You must be signed in.", success: false };
  }

  const { session, error } = await loadOwnedInProgressSession(
    supabase,
    user.id,
    parsed.data.sessionId,
  );
  if (error || !session) {
    return { error: error ?? "Session not found.", success: false };
  }
  if (session.status !== "in_progress") {
    return { error: "Only an in-progress workout can be paused.", success: false };
  }

  const state = currentTimerState(session);
  if (!state) {
    return { error: "Timer has not started.", success: false };
  }
  if (state.pausedAtMs != null) {
    return okState;
  }

  const nowMs = Date.now();
  const paused = pauseTimer(state, nowMs);
  const { error: updateError } = await supabase
    .from("workout_sessions")
    .update({
      paused_at: new Date(paused.pausedAtMs!).toISOString(),
    })
    .eq("id", session.id)
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  if (updateError) {
    return { error: "Could not pause this workout.", success: false };
  }

  revalidatePath(`/app/sessions/${session.id}`);
  return okState;
}

export async function resumeSessionAction(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const parsed = pauseResumeInputSchema.safeParse({
    sessionId: formData.get("sessionId"),
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { error: "You must be signed in.", success: false };
  }

  const { session, error } = await loadOwnedInProgressSession(
    supabase,
    user.id,
    parsed.data.sessionId,
  );
  if (error || !session) {
    return { error: error ?? "Session not found.", success: false };
  }
  if (session.status !== "in_progress") {
    return {
      error: "Only an in-progress workout can be resumed.",
      success: false,
    };
  }

  const state = currentTimerState(session);
  if (!state || state.pausedAtMs == null) {
    return okState;
  }

  const resumed = resumeTimer(state, Date.now());
  const { error: updateError } = await supabase
    .from("workout_sessions")
    .update({
      paused_at: null,
      total_paused_ms: resumed.totalPausedMs,
    })
    .eq("id", session.id)
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  if (updateError) {
    return { error: "Could not resume this workout.", success: false };
  }

  revalidatePath(`/app/sessions/${session.id}`);
  return okState;
}

export async function setSessionScalingAction(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const parsed = setScalingInputSchema.safeParse({
    sessionId: formData.get("sessionId"),
    scaling: formData.get("scaling"),
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { error: "You must be signed in.", success: false };
  }

  const { session, error } = await loadOwnedInProgressSession(
    supabase,
    user.id,
    parsed.data.sessionId,
  );
  if (error || !session) {
    return { error: error ?? "Session not found.", success: false };
  }
  if (session.status !== "in_progress") {
    return { error: "Scaling can only change during a workout.", success: false };
  }

  const { error: updateError } = await supabase
    .from("workout_sessions")
    .update({ scaling: parsed.data.scaling })
    .eq("id", session.id)
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  if (updateError) {
    return { error: "Could not update scaling.", success: false };
  }

  revalidatePath(`/app/sessions/${session.id}`);
  return okState;
}

export async function saveSectionProgressAction(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const rawResult = formData.get("result");
  if (typeof rawResult !== "string") {
    return { error: "Invalid result payload.", success: false };
  }

  let resultJson: unknown;
  try {
    resultJson = JSON.parse(rawResult);
  } catch {
    return { error: "Invalid result payload.", success: false };
  }

  const parsed = upsertSectionResultInputSchema.safeParse({
    sessionId: formData.get("sessionId"),
    sectionIndex: formData.get("sectionIndex"),
    result: resultJson,
    elapsedMs: formData.get("elapsedMs") || null,
    sectionStartedAt: formData.get("sectionStartedAt") || null,
    sectionEndedAt: formData.get("sectionEndedAt") || null,
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { error: "You must be signed in.", success: false };
  }

  const { session, error } = await loadOwnedInProgressSession(
    supabase,
    user.id,
    parsed.data.sessionId,
  );
  if (error || !session) {
    return { error: error ?? "Session not found.", success: false };
  }
  if (session.status !== "in_progress") {
    return { error: "Results can only update during a workout.", success: false };
  }
  if (session.current_section_index !== parsed.data.sectionIndex) {
    return { error: "This section is not active.", success: false };
  }

  const upsertError = await upsertSectionResult({
    supabase,
    userId: user.id,
    sessionId: session.id,
    sectionIndex: parsed.data.sectionIndex,
    format: parsed.data.result.format,
    result: parsed.data.result,
    elapsedMs: parsed.data.elapsedMs ?? null,
    sectionStartedAt:
      parsed.data.sectionStartedAt ?? session.current_section_started_at,
    sectionEndedAt: parsed.data.sectionEndedAt ?? null,
  });

  if (upsertError) {
    return { error: "Could not save progress.", success: false };
  }

  revalidatePath(`/app/sessions/${session.id}`);
  return okState;
}

export async function advanceSectionAction(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const rawResult = formData.get("result");
  if (typeof rawResult !== "string") {
    return { error: "Invalid result payload.", success: false };
  }

  let resultJson: unknown;
  try {
    resultJson = JSON.parse(rawResult);
  } catch {
    return { error: "Invalid result payload.", success: false };
  }

  const parsed = advanceSectionInputSchema.safeParse({
    sessionId: formData.get("sessionId"),
    fromSectionIndex: formData.get("fromSectionIndex"),
    result: resultJson,
    elapsedMs: formData.get("elapsedMs"),
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { error: "You must be signed in.", success: false };
  }

  const { session, error } = await loadOwnedInProgressSession(
    supabase,
    user.id,
    parsed.data.sessionId,
  );
  if (error || !session) {
    return { error: error ?? "Session not found.", success: false };
  }
  if (session.status !== "in_progress") {
    return { error: "Only an in-progress workout can advance.", success: false };
  }
  if (session.current_section_index !== parsed.data.fromSectionIndex) {
    return { error: "This section is not active.", success: false };
  }

  const snapshot = session.routine_snapshot as {
    sections?: unknown[];
  };
  const sectionCount = Array.isArray(snapshot.sections)
    ? snapshot.sections.length
    : 0;
  if (parsed.data.fromSectionIndex >= sectionCount - 1) {
    return {
      error: "This is the last section. End the workout instead.",
      success: false,
    };
  }

  const sectionStartedAt = session.current_section_started_at;
  const nowIso = new Date().toISOString();

  const upsertError = await upsertSectionResult({
    supabase,
    userId: user.id,
    sessionId: session.id,
    sectionIndex: parsed.data.fromSectionIndex,
    format: parsed.data.result.format,
    result: parsed.data.result,
    elapsedMs: parsed.data.elapsedMs,
    sectionStartedAt,
    sectionEndedAt: nowIso,
  });

  if (upsertError) {
    return { error: "Could not save this section.", success: false };
  }

  const { error: updateError } = await supabase
    .from("workout_sessions")
    .update({
      current_section_index: parsed.data.fromSectionIndex + 1,
      current_section_started_at: nowIso,
      paused_at: null,
      total_paused_ms: 0,
    })
    .eq("id", session.id)
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  if (updateError) {
    return { error: "Could not advance to the next section.", success: false };
  }

  revalidatePath(`/app/sessions/${session.id}`);
  return okState;
}

export async function completeSessionAction(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const rawFinal = formData.get("finalResult");
  let finalResult: unknown = undefined;
  if (typeof rawFinal === "string" && rawFinal.length > 0) {
    try {
      finalResult = JSON.parse(rawFinal);
    } catch {
      return { error: "Invalid result payload.", success: false };
    }
  }

  const parsed = completeSessionInputSchema.safeParse({
    sessionId: formData.get("sessionId"),
    notes: formData.get("notes") ?? "",
    finalResult,
    finalElapsedMs: formData.get("finalElapsedMs") || null,
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { error: "You must be signed in.", success: false };
  }

  const { session, error } = await loadOwnedInProgressSession(
    supabase,
    user.id,
    parsed.data.sessionId,
  );
  if (error || !session) {
    return { error: error ?? "Session not found.", success: false };
  }
  if (!canTransitionSession(session.status, "completed")) {
    return { error: "This workout cannot be completed.", success: false };
  }

  const nowIso = new Date().toISOString();

  if (parsed.data.finalResult) {
    const upsertError = await upsertSectionResult({
      supabase,
      userId: user.id,
      sessionId: session.id,
      sectionIndex: session.current_section_index,
      format: parsed.data.finalResult.format,
      result: parsed.data.finalResult,
      elapsedMs: parsed.data.finalElapsedMs ?? null,
      sectionStartedAt: session.current_section_started_at,
      sectionEndedAt: nowIso,
    });
    if (upsertError) {
      return { error: "Could not save the final section.", success: false };
    }
  }

  assertSessionTransition(session.status, "completed");

  const { error: updateError } = await supabase
    .from("workout_sessions")
    .update({
      status: "completed",
      notes: parsed.data.notes,
      paused_at: null,
      completed_at: nowIso,
      abandoned_at: null,
    })
    .eq("id", session.id)
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  if (updateError) {
    return { error: "Could not complete this workout.", success: false };
  }

  revalidatePath(`/app/sessions/${session.id}`);
  revalidatePath(`/app/sessions/${session.id}/review`);
  redirect(`/app/sessions/${session.id}/review`);
}

export async function abandonSessionAction(
  _prev: SessionActionState,
  formData: FormData,
): Promise<SessionActionState> {
  const parsed = abandonSessionInputSchema.safeParse({
    sessionId: formData.get("sessionId"),
  });
  if (!parsed.success) {
    return { error: firstZodError(parsed.error), success: false };
  }

  const { supabase, user } = await requireActionUser();
  if (!user) {
    return { error: "You must be signed in.", success: false };
  }

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .select("id, status")
    .eq("id", parsed.data.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !session) {
    return { error: "Session not found.", success: false };
  }

  const status = session.status as SessionStatus;
  if (!canTransitionSession(status, "abandoned")) {
    return { error: "This workout cannot be discarded.", success: false };
  }

  const nowIso = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("workout_sessions")
    .update({
      status: "abandoned",
      paused_at: null,
      abandoned_at: nowIso,
      completed_at: null,
    })
    .eq("id", session.id)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: "Could not discard this workout.", success: false };
  }

  revalidatePath("/app/routines");
  redirect("/app/routines");
}
