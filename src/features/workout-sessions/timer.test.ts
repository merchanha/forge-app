import { describe, expect, it } from "vitest";

import {
  deriveEmomPhase,
  deriveWorkRestPhase,
  elapsedMs,
  formatClockMs,
  formatPaceSecondsPerKm,
  pauseTimer,
  remainingMs,
  resumeTimer,
  startSegment,
  timerStateFromPersistence,
  workRestTotalMs,
} from "@/features/workout-sessions/timer";

describe("timer elapsed/remaining", () => {
  it("counts elapsed while running", () => {
    const state = startSegment(1_000_000);
    expect(elapsedMs(state, 1_000_000 + 12_500)).toBe(12_500);
  });

  it("freezes elapsed while paused", () => {
    const running = startSegment(1_000_000);
    const paused = pauseTimer(running, 1_000_000 + 30_000);
    expect(elapsedMs(paused, 1_000_000 + 90_000)).toBe(30_000);
    expect(remainingMs(paused, 60_000, 1_000_000 + 90_000)).toBe(30_000);
  });

  it("excludes pause duration after resume", () => {
    const started = startSegment(1_000_000);
    const paused = pauseTimer(started, 1_000_000 + 20_000);
    const resumed = resumeTimer(paused, 1_000_000 + 50_000);
    // 20s active before pause + 10s after resume = 30s
    expect(elapsedMs(resumed, 1_000_000 + 60_000)).toBe(30_000);
  });

  it("restores correct remaining after refresh mid-AMRAP", () => {
    // Persisted: started 5 minutes ago, paused for 30s total, currently running.
    const startedAt = "2026-11-06T12:00:00.000Z";
    const now = Date.parse("2026-11-06T12:05:00.000Z");
    const state = timerStateFromPersistence({
      currentSectionStartedAt: startedAt,
      pausedAt: null,
      totalPausedMs: 30_000,
    });

    expect(state).not.toBeNull();
    // 5 min wall - 30s paused = 4m30s elapsed; 12 min AMRAP → 7m30s remaining
    expect(elapsedMs(state!, now)).toBe(270_000);
    expect(remainingMs(state!, 720_000, now)).toBe(450_000);
    expect(formatClockMs(remainingMs(state!, 720_000, now))).toBe("7:30");
  });

  it("formats clocks without hours under 60 minutes", () => {
    expect(formatClockMs(0)).toBe("0:00");
    expect(formatClockMs(65_000)).toBe("1:05");
    expect(formatClockMs(3_661_000)).toBe("1:01:01");
  });
});

describe("EMOM phase derivation", () => {
  const config = { durationSeconds: 600, intervalSeconds: 60 };

  it("starts in minute 1 with a full interval remaining", () => {
    expect(deriveEmomPhase(0, config)).toMatchObject({
      kind: "work",
      intervalIndex: 1,
      totalIntervals: 10,
      remainingInIntervalMs: 60_000,
      remainingTotalMs: 600_000,
    });
  });

  it("advances interval at exact boundaries", () => {
    expect(deriveEmomPhase(60_000, config)).toMatchObject({
      kind: "work",
      intervalIndex: 2,
      remainingInIntervalMs: 60_000,
    });
    expect(deriveEmomPhase(59_999, config)).toMatchObject({
      intervalIndex: 1,
      remainingInIntervalMs: 1,
    });
  });

  it("marks done at and beyond duration", () => {
    expect(deriveEmomPhase(600_000, config).kind).toBe("done");
    expect(deriveEmomPhase(601_000, config).remainingTotalMs).toBe(0);
  });

  it("survives pause via elapsed freeze (caller supplies frozen elapsed)", () => {
    const started = startSegment(1_000_000);
    const paused = pauseTimer(started, 1_000_000 + 90_000);
    const frozen = elapsedMs(paused, 1_000_000 + 200_000);
    expect(deriveEmomPhase(frozen, config)).toMatchObject({
      intervalIndex: 2,
      remainingInIntervalMs: 30_000,
    });
  });
});

describe("Tabata / Intervals phase derivation", () => {
  const tabata = { workSeconds: 20, restSeconds: 10, rounds: 8 };

  it("computes total without trailing rest", () => {
    // 8×20 work + 7×10 rest = 230s
    expect(workRestTotalMs(tabata)).toBe(230_000);
  });

  it("starts in work round 1", () => {
    expect(deriveWorkRestPhase(0, tabata)).toMatchObject({
      kind: "work",
      round: 1,
      totalRounds: 8,
      remainingInPhaseMs: 20_000,
    });
  });

  it("switches to rest after work", () => {
    expect(deriveWorkRestPhase(20_000, tabata)).toMatchObject({
      kind: "rest",
      round: 1,
      remainingInPhaseMs: 10_000,
    });
    expect(deriveWorkRestPhase(29_999, tabata)).toMatchObject({
      kind: "rest",
      round: 1,
      remainingInPhaseMs: 1,
    });
  });

  it("enters work round 2 after a full cycle", () => {
    expect(deriveWorkRestPhase(30_000, tabata)).toMatchObject({
      kind: "work",
      round: 2,
      remainingInPhaseMs: 20_000,
    });
  });

  it("ends after last work with no trailing rest", () => {
    // After 7 full cycles (210s) + 20s work = 230s → done
    expect(deriveWorkRestPhase(229_999, tabata)).toMatchObject({
      kind: "work",
      round: 8,
      remainingInPhaseMs: 1,
    });
    expect(deriveWorkRestPhase(230_000, tabata).kind).toBe("done");
  });

  it("handles zero rest as continuous work rounds", () => {
    const config = { workSeconds: 30, restSeconds: 0, rounds: 3 };
    expect(workRestTotalMs(config)).toBe(90_000);
    expect(deriveWorkRestPhase(30_000, config)).toMatchObject({
      kind: "work",
      round: 2,
    });
    expect(deriveWorkRestPhase(90_000, config).kind).toBe("done");
  });
});

describe("pace formatting", () => {
  it("formats seconds per km", () => {
    expect(formatPaceSecondsPerKm(300)).toBe("5:00/km");
    expect(formatPaceSecondsPerKm(275)).toBe("4:35/km");
  });
});
