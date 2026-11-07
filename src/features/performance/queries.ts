import {
  areSectionContextsCompatible,
  buildSectionCompareInput,
  compareSections,
  deltaLabelForScores,
  isPersonalRecordScore,
  primaryComparableSectionIndex,
  scoreSectionResult,
  type MetricScore,
  type SectionComparison,
  type SectionCompareInput,
} from "@/features/performance/compare";
import {
  listHistoryInputSchema,
  type HistoryRange,
} from "@/features/performance/validation";
import {
  getOwnSession,
  type SessionSectionResultRow,
  type WorkoutSessionDetail,
} from "@/features/workout-sessions/queries";
import {
  routineSnapshotSchema,
  sessionScalingSchema,
  type RoutineSnapshot,
  type SectionResult,
  type SessionScaling,
} from "@/features/workout-sessions/validation";
import type { Json } from "@/platform/supabase/database.types";
import { requireUser } from "@/platform/supabase/require-user";
import {
  requestWallClockMs,
  wallClockToIso,
} from "@/shared/datetime/format";

export type HistorySessionSummary = {
  id: string;
  routineId: string | null;
  name: string;
  scaling: SessionScaling;
  completedAt: string;
  primaryLabel: string | null;
  /** Numeric primary score for sparklines; same family/direction as peers. */
  primaryValue: number | null;
  primaryDirection: MetricScore["direction"] | null;
  isPersonalRecord: boolean;
  deltaLabel: string | null;
};

export type SessionCompareView = {
  session: WorkoutSessionDetail;
  previousSession: WorkoutSessionDetail | null;
  sectionComparisons: SectionComparison[];
  sessionIsPersonalRecord: boolean;
};

type HistoryRow = {
  id: string;
  routineId: string | null;
  name: string;
  scaling: SessionScaling;
  completedAt: string;
  snapshot: RoutineSnapshot;
  results: Map<number, SectionResult>;
  primary: {
    sectionIndex: number;
    score: MetricScore;
    input: SectionCompareInput;
  } | null;
};

function rangeStartIso(range: HistoryRange, nowMs: number): string | null {
  if (range === "all") {
    return null;
  }
  const days = range === "30d" ? 30 : 90;
  return wallClockToIso(nowMs - days * 86_400_000);
}

function parseSnapshot(value: Json): RoutineSnapshot {
  return routineSnapshotSchema.parse(value);
}

function primaryScoreForSession(
  snapshot: RoutineSnapshot,
  results: Map<number, SectionResult>,
  scaling: SessionScaling,
): HistoryRow["primary"] {
  const sectionIndex = primaryComparableSectionIndex(snapshot);
  if (sectionIndex == null) {
    return null;
  }
  const input = buildSectionCompareInput({
    sectionIndex,
    snapshot,
    result: results.get(sectionIndex) ?? null,
    scaling,
  });
  if (!input) {
    return null;
  }
  const score = scoreSectionResult(input.format, input.result);
  if (!score) {
    return null;
  }
  return { sectionIndex, score, input };
}

function annotateHistory(rows: HistoryRow[]): HistorySessionSummary[] {
  return rows.map((row) => {
    if (!row.primary) {
      return {
        id: row.id,
        routineId: row.routineId,
        name: row.name,
        scaling: row.scaling,
        completedAt: row.completedAt,
        primaryLabel: null,
        primaryValue: null,
        primaryDirection: null,
        isPersonalRecord: false,
        deltaLabel: null,
      };
    }

    const peers = rows.filter((peer) => {
      if (peer.id === row.id || !peer.primary) {
        return false;
      }
      if (row.routineId && peer.routineId) {
        return peer.routineId === row.routineId;
      }
      return peer.name === row.name;
    });

    const compatiblePeers = peers.filter((peer) => {
      if (!peer.primary) {
        return false;
      }
      return areSectionContextsCompatible(row.primary!.input, peer.primary.input)
        .compatible;
    });

    const historyScores = compatiblePeers.map((peer) => peer.primary!.score);
    const olderCompatible = compatiblePeers
      .filter((peer) => peer.completedAt < row.completedAt)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

    const previous = olderCompatible[0]?.primary ?? null;
    const deltaLabel = previous
      ? deltaLabelForScores(row.primary.score, previous.score)
      : null;

    return {
      id: row.id,
      routineId: row.routineId,
      name: row.name,
      scaling: row.scaling,
      completedAt: row.completedAt,
      primaryLabel: row.primary.score.label,
      primaryValue: row.primary.score.value,
      primaryDirection: row.primary.score.direction,
      isPersonalRecord: isPersonalRecordScore(row.primary.score, historyScores),
      deltaLabel,
    };
  });
}

export async function listOwnCompletedSessions(input?: {
  range?: HistoryRange;
  routineId?: string | null;
  limit?: number;
}): Promise<HistorySessionSummary[]> {
  const parsed = listHistoryInputSchema.safeParse({
    range: input?.range ?? "all",
    routineId: input?.routineId ?? null,
    limit: input?.limit ?? 40,
  });
  if (!parsed.success) {
    return [];
  }

  const { supabase, user } = await requireUser();
  if (!user) {
    return [];
  }

  let query = supabase
    .from("workout_sessions")
    .select("id, routine_id, scaling, completed_at, routine_snapshot")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(parsed.data.limit);

  if (parsed.data.range !== "all") {
    // requireUser() already awaited connection(); wall clock is request-time.
    const startIso = rangeStartIso(parsed.data.range, requestWallClockMs());
    if (startIso) {
      query = query.gte("completed_at", startIso);
    }
  }
  if (parsed.data.routineId) {
    query = query.eq("routine_id", parsed.data.routineId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Could not load workout history.");
  }

  const sessions = data ?? [];
  const sessionIds = sessions.map((row) => row.id);
  const resultsBySessionId = new Map<
    string,
    Array<{ section_index: number; result: Json }>
  >();

  if (sessionIds.length > 0) {
    const { data: resultRows, error: resultsError } = await supabase
      .from("session_section_results")
      .select("session_id, section_index, result")
      .eq("user_id", user.id)
      .in("session_id", sessionIds);

    if (resultsError) {
      throw new Error("Could not load workout history.");
    }

    for (const resultRow of resultRows ?? []) {
      const list = resultsBySessionId.get(resultRow.session_id) ?? [];
      list.push({
        section_index: resultRow.section_index,
        result: resultRow.result,
      });
      resultsBySessionId.set(resultRow.session_id, list);
    }
  }

  const rows: HistoryRow[] = sessions.map((row) => {
    const snapshot = parseSnapshot(row.routine_snapshot);
    const scaling = sessionScalingSchema.parse(row.scaling);
    const results = new Map<number, SectionResult>();
    for (const resultRow of resultsBySessionId.get(row.id) ?? []) {
      results.set(
        resultRow.section_index,
        resultRow.result as unknown as SectionResult,
      );
    }
    return {
      id: row.id,
      routineId: row.routine_id,
      name: snapshot.name,
      scaling,
      completedAt: row.completed_at as string,
      snapshot,
      results,
      primary: primaryScoreForSession(snapshot, results, scaling),
    };
  });

  return annotateHistory(rows);
}

async function listCompatiblePriorSessions(args: {
  userId: string;
  session: WorkoutSessionDetail;
  limit?: number;
}): Promise<WorkoutSessionDetail[]> {
  const { supabase } = await requireUser();
  if (!args.session.routineId) {
    return [];
  }

  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id")
    .eq("user_id", args.userId)
    .eq("status", "completed")
    .eq("routine_id", args.session.routineId)
    .neq("id", args.session.id)
    .order("completed_at", { ascending: false })
    .limit(args.limit ?? 20);

  if (error) {
    throw new Error("Could not load comparison history.");
  }

  const details: WorkoutSessionDetail[] = [];
  for (const row of data ?? []) {
    const detail = await getOwnSession(row.id);
    if (detail && detail.status === "completed") {
      details.push(detail);
    }
  }
  return details;
}

function sectionResultsMap(
  session: WorkoutSessionDetail,
): Map<number, SectionResult> {
  return new Map(
    session.sectionResults.map((row: SessionSectionResultRow) => [
      row.sectionIndex,
      row.result,
    ]),
  );
}

export async function getSessionCompareView(
  sessionId: string,
): Promise<SessionCompareView | null> {
  const session = await getOwnSession(sessionId);
  if (!session || session.status !== "completed") {
    return null;
  }

  const { user } = await requireUser();
  if (!user) {
    return null;
  }

  const priors = await listCompatiblePriorSessions({
    userId: user.id,
    session,
  });

  const currentResults = sectionResultsMap(session);
  const sectionComparisons: SectionComparison[] = [];
  let previousSession: WorkoutSessionDetail | null = null;
  let sessionIsPersonalRecord = false;

  const primaryIndex = primaryComparableSectionIndex(session.snapshot);

  for (let index = 0; index < session.snapshot.sections.length; index += 1) {
    const currentInput = buildSectionCompareInput({
      sectionIndex: index,
      snapshot: session.snapshot,
      result: currentResults.get(index) ?? null,
      scaling: session.scaling,
    });
    if (!currentInput) {
      continue;
    }

    let previousInput: SectionCompareInput | null = null;
    const historyScores: MetricScore[] = [];

    for (const prior of priors) {
      const priorResults = sectionResultsMap(prior);
      const candidate = buildSectionCompareInput({
        sectionIndex: index,
        snapshot: prior.snapshot,
        result: priorResults.get(index) ?? null,
        scaling: prior.scaling,
      });
      if (!candidate) {
        continue;
      }
      if (!areSectionContextsCompatible(currentInput, candidate).compatible) {
        continue;
      }
      const score = scoreSectionResult(candidate.format, candidate.result);
      if (score) {
        historyScores.push(score);
      }
      if (!previousInput) {
        previousInput = candidate;
        if (!previousSession) {
          previousSession = prior;
        }
      }
    }

    const comparison = compareSections({
      current: currentInput,
      previous: previousInput,
      historyScores,
    });
    sectionComparisons.push(comparison);

    if (index === primaryIndex) {
      sessionIsPersonalRecord = comparison.isPersonalRecord;
    }
  }

  return {
    session,
    previousSession,
    sectionComparisons,
    sessionIsPersonalRecord,
  };
}
