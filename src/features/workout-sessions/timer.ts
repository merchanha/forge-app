/**
 * Pure timer math. Display may refresh on an interval or rAF;
 * these functions remain the source of truth for elapsed/remaining.
 */

export type TimerClockState = {
  /** UTC ms when the active segment started (section or session). */
  startedAtMs: number;
  /** UTC ms when pause began; null when running. */
  pausedAtMs: number | null;
  /** Accumulated paused duration for the active segment, in ms. */
  totalPausedMs: number;
};

export function isTimerPaused(state: TimerClockState): boolean {
  return state.pausedAtMs != null;
}

/**
 * Elapsed active time at `nowMs`, excluding pauses.
 * When paused, freezes at the pause instant.
 */
export function elapsedMs(state: TimerClockState, nowMs: number): number {
  if (!Number.isFinite(state.startedAtMs) || state.startedAtMs <= 0) {
    return 0;
  }

  const endMs =
    state.pausedAtMs != null
      ? state.pausedAtMs
      : Number.isFinite(nowMs)
        ? nowMs
        : state.startedAtMs;

  const raw = endMs - state.startedAtMs - Math.max(0, state.totalPausedMs);
  return Math.max(0, Math.floor(raw));
}

/** Remaining time for a countdown of `durationMs`. Clamped at 0. */
export function remainingMs(
  state: TimerClockState,
  durationMs: number,
  nowMs: number,
): number {
  const duration = Math.max(0, Math.floor(durationMs));
  return Math.max(0, duration - elapsedMs(state, nowMs));
}

export function pauseTimer(
  state: TimerClockState,
  pauseAtMs: number,
): TimerClockState {
  if (state.pausedAtMs != null) {
    return state;
  }
  return {
    ...state,
    pausedAtMs: pauseAtMs,
  };
}

export function resumeTimer(
  state: TimerClockState,
  resumeAtMs: number,
): TimerClockState {
  if (state.pausedAtMs == null) {
    return state;
  }
  const pauseDuration = Math.max(0, resumeAtMs - state.pausedAtMs);
  return {
    ...state,
    pausedAtMs: null,
    totalPausedMs: state.totalPausedMs + pauseDuration,
  };
}

/** Start (or restart) a segment at `startAtMs` with a clean pause ledger. */
export function startSegment(startAtMs: number): TimerClockState {
  return {
    startedAtMs: startAtMs,
    pausedAtMs: null,
    totalPausedMs: 0,
  };
}

export function formatClockMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function wallClockMs(iso: string | null | undefined): number | null {
  if (!iso) {
    return null;
  }
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : null;
}

export function timerStateFromPersistence(input: {
  currentSectionStartedAt: string | null;
  pausedAt: string | null;
  totalPausedMs: number;
}): TimerClockState | null {
  const startedAtMs = wallClockMs(input.currentSectionStartedAt);
  if (startedAtMs == null) {
    return null;
  }
  return {
    startedAtMs,
    pausedAtMs: wallClockMs(input.pausedAt),
    totalPausedMs: Math.max(0, Math.floor(input.totalPausedMs)),
  };
}

export type IntervalPhaseKind = "work" | "rest" | "done";

export type EmomPhase = {
  kind: "work" | "done";
  /** 1-based interval index while working; totalIntervals when done. */
  intervalIndex: number;
  totalIntervals: number;
  /** Remaining ms in the current interval (0 when done). */
  remainingInIntervalMs: number;
  /** Remaining ms in the whole EMOM (0 when done). */
  remainingTotalMs: number;
};

export type WorkRestPhase = {
  kind: IntervalPhaseKind;
  /** 1-based round while working/resting; totalRounds when done. */
  round: number;
  totalRounds: number;
  remainingInPhaseMs: number;
  remainingTotalMs: number;
};

/**
 * Derive the current EMOM interval from active elapsed time.
 * Each interval is `intervalSeconds` long across `durationSeconds`.
 */
export function deriveEmomPhase(
  elapsedActiveMs: number,
  config: { durationSeconds: number; intervalSeconds: number },
): EmomPhase {
  const durationMs = Math.max(0, Math.floor(config.durationSeconds) * 1000);
  const intervalMs = Math.max(1, Math.floor(config.intervalSeconds) * 1000);
  const totalIntervals = Math.max(1, Math.floor(durationMs / intervalMs));
  const elapsed = Math.max(0, Math.floor(elapsedActiveMs));

  if (elapsed >= durationMs) {
    return {
      kind: "done",
      intervalIndex: totalIntervals,
      totalIntervals,
      remainingInIntervalMs: 0,
      remainingTotalMs: 0,
    };
  }

  const intervalIndex = Math.min(
    totalIntervals,
    Math.floor(elapsed / intervalMs) + 1,
  );
  const intoInterval = elapsed % intervalMs;
  const remainingInIntervalMs = intervalMs - intoInterval;
  const remainingTotalMs = durationMs - elapsed;

  return {
    kind: "work",
    intervalIndex,
    totalIntervals,
    remainingInIntervalMs,
    remainingTotalMs,
  };
}

/**
 * Derive WORK / REST / DONE for Tabata or Intervals from active elapsed time.
 * Cycle is work then rest; the final rest after the last work round is omitted
 * from the total duration (common gym timer behavior).
 */
export function deriveWorkRestPhase(
  elapsedActiveMs: number,
  config: { workSeconds: number; restSeconds: number; rounds: number },
): WorkRestPhase {
  const workMs = Math.max(0, Math.floor(config.workSeconds) * 1000);
  const restMs = Math.max(0, Math.floor(config.restSeconds) * 1000);
  const totalRounds = Math.max(1, Math.floor(config.rounds));
  const cycleMs = workMs + restMs;
  const totalMs =
    workMs * totalRounds + restMs * Math.max(0, totalRounds - 1);
  const elapsed = Math.max(0, Math.floor(elapsedActiveMs));

  if (totalMs === 0 || elapsed >= totalMs) {
    return {
      kind: "done",
      round: totalRounds,
      totalRounds,
      remainingInPhaseMs: 0,
      remainingTotalMs: 0,
    };
  }

  // Last round has work only (no trailing rest).
  if (restMs === 0 || cycleMs === 0) {
    const round = Math.min(totalRounds, Math.floor(elapsed / Math.max(1, workMs)) + 1);
    const intoWork = workMs === 0 ? 0 : elapsed % workMs;
    return {
      kind: "work",
      round,
      totalRounds,
      remainingInPhaseMs: Math.max(0, workMs - intoWork),
      remainingTotalMs: totalMs - elapsed,
    };
  }

  const fullCycles = Math.floor(elapsed / cycleMs);
  if (fullCycles >= totalRounds) {
    return {
      kind: "done",
      round: totalRounds,
      totalRounds,
      remainingInPhaseMs: 0,
      remainingTotalMs: 0,
    };
  }

  const intoCycle = elapsed % cycleMs;
  const round = fullCycles + 1;

  if (intoCycle < workMs) {
    return {
      kind: "work",
      round,
      totalRounds,
      remainingInPhaseMs: workMs - intoCycle,
      remainingTotalMs: totalMs - elapsed,
    };
  }

  // In rest after work for this round (not possible on last round by totalMs).
  return {
    kind: "rest",
    round,
    totalRounds,
    remainingInPhaseMs: cycleMs - intoCycle,
    remainingTotalMs: totalMs - elapsed,
  };
}

/** Total planned duration for a work/rest format (excludes trailing rest). */
export function workRestTotalMs(config: {
  workSeconds: number;
  restSeconds: number;
  rounds: number;
}): number {
  const workMs = Math.max(0, Math.floor(config.workSeconds) * 1000);
  const restMs = Math.max(0, Math.floor(config.restSeconds) * 1000);
  const rounds = Math.max(1, Math.floor(config.rounds));
  return workMs * rounds + restMs * Math.max(0, rounds - 1);
}

/** Format seconds-per-km pace as m:ss /km. */
export function formatPaceSecondsPerKm(secondsPerKm: number): string {
  const total = Math.max(0, Math.floor(secondsPerKm));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}
