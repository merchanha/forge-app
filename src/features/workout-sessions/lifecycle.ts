export const sessionStatuses = [
  "planned",
  "in_progress",
  "completed",
  "abandoned",
] as const;

export type SessionStatus = (typeof sessionStatuses)[number];

const allowedTransitions: Record<SessionStatus, readonly SessionStatus[]> = {
  planned: ["in_progress", "abandoned"],
  in_progress: ["completed", "abandoned"],
  completed: [],
  abandoned: [],
};

export function canTransitionSession(
  from: SessionStatus,
  to: SessionStatus,
): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertSessionTransition(
  from: SessionStatus,
  to: SessionStatus,
): void {
  if (!canTransitionSession(from, to)) {
    throw new Error(`Invalid session transition: ${from} → ${to}`);
  }
}

/** Formats with full live timer UX (Phase 4 + Phase 7). */
export const liveTimerFormats = [
  "amrap",
  "for_time",
  "strength",
  "custom",
  "emom",
  "tabata",
  "intervals",
  "rounds_for_time",
  "running",
] as const;

export type LiveTimerFormat = (typeof liveTimerFormats)[number];

export function hasLiveTimerUx(format: string): format is LiveTimerFormat {
  return (liveTimerFormats as readonly string[]).includes(format);
}
