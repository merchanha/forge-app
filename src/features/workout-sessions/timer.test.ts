import { describe, expect, it } from "vitest";

import {
  elapsedMs,
  formatClockMs,
  pauseTimer,
  remainingMs,
  resumeTimer,
  startSegment,
  timerStateFromPersistence,
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
