import { requireUser } from "@/platform/supabase/require-user";
import type { Json } from "@/platform/supabase/database.types";
import {
  routineSnapshotSchema,
  sectionResultSchema,
  sessionIdSchema,
  sessionScalingSchema,
  sessionStatusSchema,
  type RoutineSnapshot,
  type SectionResult,
  type SessionScaling,
  type SessionStatus,
} from "@/features/workout-sessions/validation";

export type SessionSectionResultRow = {
  id: string;
  sectionIndex: number;
  format: RoutineSnapshot["sections"][number]["format"];
  result: SectionResult;
  sectionStartedAt: string | null;
  sectionEndedAt: string | null;
  elapsedMs: number | null;
};

export type WorkoutSessionDetail = {
  id: string;
  routineId: string | null;
  status: SessionStatus;
  scaling: SessionScaling;
  notes: string;
  currentSectionIndex: number;
  startedAt: string | null;
  pausedAt: string | null;
  totalPausedMs: number;
  currentSectionStartedAt: string | null;
  completedAt: string | null;
  abandonedAt: string | null;
  createdAt: string;
  updatedAt: string;
  snapshot: RoutineSnapshot;
  sectionResults: SessionSectionResultRow[];
};

function parseSnapshot(value: Json): RoutineSnapshot {
  return routineSnapshotSchema.parse(value);
}

function parseResult(value: Json): SectionResult {
  return sectionResultSchema.parse(value);
}

export async function getOwnSession(
  id: string,
): Promise<WorkoutSessionDetail | null> {
  const parsedId = sessionIdSchema.safeParse(id);
  if (!parsedId.success) {
    return null;
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return null;
  }

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .select(
      "id, routine_id, status, scaling, notes, current_section_index, started_at, paused_at, total_paused_ms, current_section_started_at, completed_at, abandoned_at, created_at, updated_at, routine_snapshot",
    )
    .eq("id", parsedId.data)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load this session.");
  }
  if (!session) {
    return null;
  }

  const { data: results, error: resultsError } = await supabase
    .from("session_section_results")
    .select(
      "id, section_index, format, result, section_started_at, section_ended_at, elapsed_ms",
    )
    .eq("session_id", parsedId.data)
    .eq("user_id", user.id)
    .order("section_index", { ascending: true });

  if (resultsError) {
    throw new Error("Could not load this session.");
  }

  return {
    id: session.id,
    routineId: session.routine_id,
    status: sessionStatusSchema.parse(session.status),
    scaling: sessionScalingSchema.parse(session.scaling),
    notes: session.notes,
    currentSectionIndex: session.current_section_index,
    startedAt: session.started_at,
    pausedAt: session.paused_at,
    totalPausedMs: Number(session.total_paused_ms),
    currentSectionStartedAt: session.current_section_started_at,
    completedAt: session.completed_at,
    abandonedAt: session.abandoned_at,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    snapshot: parseSnapshot(session.routine_snapshot),
    sectionResults: (results ?? []).map((row) => ({
      id: row.id,
      sectionIndex: row.section_index,
      format: row.format,
      result: parseResult(row.result),
      sectionStartedAt: row.section_started_at,
      sectionEndedAt: row.section_ended_at,
      elapsedMs: row.elapsed_ms == null ? null : Number(row.elapsed_ms),
    })),
  };
}

export async function getActiveOwnSessionForRoutine(
  routineId: string,
): Promise<{ id: string } | null> {
  const { supabase, user } = await requireUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("routine_id", routineId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error("Could not check for an active session.");
  }

  return data;
}
