import type { FormatConfigMap, WorkoutFormat } from "@/features/routines/validation";
import type {
  RoutineSnapshot,
  SectionResult,
  SessionScaling,
} from "@/features/workout-sessions/validation";

export type ComparableMetricFamily = "for_time" | "amrap" | "strength";

export type ComparisonDirection = "lower_is_better" | "higher_is_better";

export type MetricScore = {
  family: ComparableMetricFamily;
  direction: ComparisonDirection;
  /** Normalized numeric score used only within a compatible pair. */
  value: number;
  label: string;
  unitLabel: string;
};

export type CompatibilityReason =
  | "ok"
  | "unsupported_format"
  | "format_mismatch"
  | "context_mismatch"
  | "scaling_mismatch"
  | "missing_result"
  | "incomparable_units"
  | "empty_strength";

export type CompatibilityResult =
  | { compatible: true; reason: "ok" }
  | { compatible: false; reason: Exclude<CompatibilityReason, "ok"> };

export type SectionCompareInput = {
  sectionIndex: number;
  format: WorkoutFormat;
  formatConfig: FormatConfigMap[WorkoutFormat] | unknown;
  result: SectionResult | null;
  scaling: SessionScaling;
};

export type SectionComparison = {
  sectionIndex: number;
  format: WorkoutFormat;
  compatible: boolean;
  reason: CompatibilityReason;
  current: MetricScore | null;
  previous: MetricScore | null;
  /** Signed improvement in the metric's native units (positive = better). */
  delta: number | null;
  deltaLabel: string | null;
  isPersonalRecord: boolean;
};

function asAmrapConfig(config: unknown): FormatConfigMap["amrap"] | null {
  if (
    config &&
    typeof config === "object" &&
    "durationSeconds" in config &&
    typeof (config as { durationSeconds: unknown }).durationSeconds === "number"
  ) {
    return config as FormatConfigMap["amrap"];
  }
  return null;
}

function asForTimeConfig(config: unknown): FormatConfigMap["for_time"] | null {
  if (
    config &&
    typeof config === "object" &&
    "rounds" in config &&
    typeof (config as { rounds: unknown }).rounds === "number"
  ) {
    return config as FormatConfigMap["for_time"];
  }
  return null;
}

function asStrengthConfig(config: unknown): FormatConfigMap["strength"] | null {
  if (
    config &&
    typeof config === "object" &&
    "sets" in config &&
    "reps" in config &&
    typeof (config as { sets: unknown }).sets === "number" &&
    typeof (config as { reps: unknown }).reps === "number"
  ) {
    return config as FormatConfigMap["strength"];
  }
  return null;
}

export function formatClockMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Encode rounds + reps so higher work always sorts correctly. */
export function amrapWorkScore(rounds: number, additionalReps: number): number {
  return Math.max(0, rounds) * 10_000 + Math.max(0, additionalReps);
}

export function decodeAmrapWorkScore(value: number): {
  rounds: number;
  additionalReps: number;
} {
  const rounds = Math.floor(value / 10_000);
  const additionalReps = value % 10_000;
  return { rounds, additionalReps };
}

export function strengthVolume(
  result: Extract<SectionResult, { format: "strength" }>,
): {
  volume: number;
  loadUnit: "kg" | "lb" | null;
  reason: CompatibilityReason;
} {
  const completed = result.sets.filter((set) => set.completed);
  if (completed.length === 0) {
    return { volume: 0, loadUnit: null, reason: "empty_strength" };
  }

  const units = new Set(
    completed
      .map((set) => set.loadUnit)
      .filter((unit): unit is "kg" | "lb" => unit === "kg" || unit === "lb"),
  );

  if (units.size !== 1) {
    return { volume: 0, loadUnit: null, reason: "incomparable_units" };
  }

  const loadUnit = [...units][0]!;
  let volume = 0;
  for (const set of completed) {
    if (set.loadUnit !== loadUnit || set.loadValue == null) {
      return { volume: 0, loadUnit: null, reason: "incomparable_units" };
    }
    volume += set.loadValue * set.reps;
  }

  return { volume, loadUnit, reason: "ok" };
}

function formatVolume(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(1);
}

export function scoreSectionResult(
  format: WorkoutFormat,
  result: SectionResult | null,
): MetricScore | null {
  if (!result || result.format !== format) {
    return null;
  }

  switch (result.format) {
    case "for_time": {
      if (result.completionMs == null || result.capped) {
        return null;
      }
      return {
        family: "for_time",
        direction: "lower_is_better",
        value: result.completionMs,
        label: formatClockMs(result.completionMs),
        unitLabel: "time",
      };
    }
    case "amrap": {
      const value = amrapWorkScore(result.rounds, result.additionalReps);
      return {
        family: "amrap",
        direction: "higher_is_better",
        value,
        label: `${result.rounds} + ${result.additionalReps}`,
        unitLabel: "rounds+reps",
      };
    }
    case "strength": {
      const { volume, loadUnit, reason } = strengthVolume(result);
      if (reason !== "ok" || loadUnit == null) {
        return null;
      }
      return {
        family: "strength",
        direction: "higher_is_better",
        value: volume,
        label: `${formatVolume(volume)} ${loadUnit}`,
        unitLabel: loadUnit,
      };
    }
    default:
      return null;
  }
}

export function areSectionContextsCompatible(
  current: SectionCompareInput,
  previous: SectionCompareInput,
): CompatibilityResult {
  if (current.format !== previous.format) {
    return { compatible: false, reason: "format_mismatch" };
  }

  if (
    current.format !== "amrap" &&
    current.format !== "for_time" &&
    current.format !== "strength"
  ) {
    return { compatible: false, reason: "unsupported_format" };
  }

  if (current.scaling !== previous.scaling) {
    return { compatible: false, reason: "scaling_mismatch" };
  }

  if (!current.result || !previous.result) {
    return { compatible: false, reason: "missing_result" };
  }

  if (current.format === "amrap") {
    const a = asAmrapConfig(current.formatConfig);
    const b = asAmrapConfig(previous.formatConfig);
    if (!a || !b || a.durationSeconds !== b.durationSeconds) {
      return { compatible: false, reason: "context_mismatch" };
    }
    return { compatible: true, reason: "ok" };
  }

  if (current.format === "for_time") {
    const a = asForTimeConfig(current.formatConfig);
    const b = asForTimeConfig(previous.formatConfig);
    if (!a || !b || a.rounds !== b.rounds) {
      return { compatible: false, reason: "context_mismatch" };
    }
    if ((a.timeCapSeconds ?? null) !== (b.timeCapSeconds ?? null)) {
      return { compatible: false, reason: "context_mismatch" };
    }
    return { compatible: true, reason: "ok" };
  }

  const a = asStrengthConfig(current.formatConfig);
  const b = asStrengthConfig(previous.formatConfig);
  if (!a || !b || a.sets !== b.sets || a.reps !== b.reps) {
    return { compatible: false, reason: "context_mismatch" };
  }

  const currentScore = scoreSectionResult("strength", current.result);
  const previousScore = scoreSectionResult("strength", previous.result);
  if (!currentScore || !previousScore) {
    const currentVol = strengthVolume(
      current.result as Extract<SectionResult, { format: "strength" }>,
    );
    if (currentVol.reason !== "ok") {
      return { compatible: false, reason: currentVol.reason };
    }
    const previousVol = strengthVolume(
      previous.result as Extract<SectionResult, { format: "strength" }>,
    );
    if (previousVol.reason !== "ok") {
      return { compatible: false, reason: previousVol.reason };
    }
    return { compatible: false, reason: "incomparable_units" };
  }
  if (currentScore.unitLabel !== previousScore.unitLabel) {
    return { compatible: false, reason: "incomparable_units" };
  }

  return { compatible: true, reason: "ok" };
}

export function deltaLabelForScores(
  current: MetricScore,
  previous: MetricScore,
): string {
  if (current.family !== previous.family) {
    return "n/a";
  }

  if (current.family === "for_time") {
    const deltaMs = previous.value - current.value;
    if (deltaMs === 0) {
      return "same";
    }
    const abs = formatClockMs(Math.abs(deltaMs));
    return deltaMs > 0 ? `−${abs}` : `+${abs}`;
  }

  if (current.family === "amrap") {
    const encodedDelta = current.value - previous.value;
    if (encodedDelta === 0) {
      return "same";
    }
    const roundDelta = Math.trunc(encodedDelta / 10_000);
    const repDelta = encodedDelta - roundDelta * 10_000;
    if (roundDelta === 0) {
      return repDelta > 0 ? `+${repDelta} reps` : `${repDelta} reps`;
    }
    if (repDelta === 0) {
      return roundDelta > 0 ? `+${roundDelta} rounds` : `${roundDelta} rounds`;
    }
    const sign = encodedDelta > 0 ? "+" : "";
    const { rounds, additionalReps } = decodeAmrapWorkScore(
      Math.abs(encodedDelta),
    );
    return `${sign}${encodedDelta < 0 ? "−" : ""}${rounds} + ${additionalReps}`;
  }

  const delta = current.value - previous.value;
  if (delta === 0) {
    return "same";
  }
  const signed = delta > 0 ? `+${formatVolume(delta)}` : formatVolume(delta);
  return `${signed} ${current.unitLabel}`;
}

export function isBetterScore(
  current: MetricScore,
  previous: MetricScore,
): boolean {
  if (current.family !== previous.family) {
    return false;
  }
  if (current.direction === "lower_is_better") {
    return current.value < previous.value;
  }
  return current.value > previous.value;
}

/** True when current is strictly best, or tied for best among others. */
export function isPersonalRecordScore(
  current: MetricScore,
  historyScores: MetricScore[],
): boolean {
  const peers = historyScores.filter((score) => score.family === current.family);
  if (peers.length === 0) {
    return true;
  }
  return !peers.some((score) => isBetterScore(score, current));
}

export function resolveBestScore(scores: MetricScore[]): MetricScore | null {
  if (scores.length === 0) {
    return null;
  }
  return scores.reduce((best, score) =>
    isBetterScore(score, best) ? score : best,
  );
}

export function compareSections(args: {
  current: SectionCompareInput;
  previous: SectionCompareInput | null;
  historyScores: MetricScore[];
}): SectionComparison {
  const { current, previous, historyScores } = args;
  const currentScore = scoreSectionResult(current.format, current.result);

  if (!previous) {
    return {
      sectionIndex: current.sectionIndex,
      format: current.format,
      compatible: false,
      reason: "missing_result",
      current: currentScore,
      previous: null,
      delta: null,
      deltaLabel: null,
      isPersonalRecord: currentScore
        ? isPersonalRecordScore(currentScore, historyScores)
        : false,
    };
  }

  const compatibility = areSectionContextsCompatible(current, previous);
  if (!compatibility.compatible) {
    return {
      sectionIndex: current.sectionIndex,
      format: current.format,
      compatible: false,
      reason: compatibility.reason,
      current: currentScore,
      previous: scoreSectionResult(previous.format, previous.result),
      delta: null,
      deltaLabel: null,
      isPersonalRecord: false,
    };
  }

  const previousScore = scoreSectionResult(previous.format, previous.result);
  if (!currentScore || !previousScore) {
    return {
      sectionIndex: current.sectionIndex,
      format: current.format,
      compatible: false,
      reason: "missing_result",
      current: currentScore,
      previous: previousScore,
      delta: null,
      deltaLabel: null,
      isPersonalRecord: false,
    };
  }

  const delta =
    currentScore.direction === "lower_is_better"
      ? previousScore.value - currentScore.value
      : currentScore.value - previousScore.value;

  return {
    sectionIndex: current.sectionIndex,
    format: current.format,
    compatible: true,
    reason: "ok",
    current: currentScore,
    previous: previousScore,
    delta,
    deltaLabel: deltaLabelForScores(currentScore, previousScore),
    isPersonalRecord: isPersonalRecordScore(currentScore, historyScores),
  };
}

export function buildSectionCompareInput(args: {
  sectionIndex: number;
  snapshot: RoutineSnapshot;
  result: SectionResult | null;
  scaling: SessionScaling;
}): SectionCompareInput | null {
  const section = args.snapshot.sections[args.sectionIndex];
  if (!section) {
    return null;
  }
  return {
    sectionIndex: args.sectionIndex,
    format: section.format,
    formatConfig: section.formatConfig,
    result: args.result,
    scaling: args.scaling,
  };
}

/** Prefer a primary comparable section for session-level PR (first matching). */
export function primaryComparableSectionIndex(
  snapshot: RoutineSnapshot,
): number | null {
  const preferred: WorkoutFormat[] = ["for_time", "amrap", "strength"];
  for (const format of preferred) {
    const index = snapshot.sections.findIndex(
      (section) => section.format === format,
    );
    if (index >= 0) {
      return index;
    }
  }
  return null;
}
