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
