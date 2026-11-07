import { describe, expect, it } from "vitest";

import {
  canTransitionSession,
  hasLiveTimerUx,
} from "@/features/workout-sessions/lifecycle";
import {
  amrapResultSchema,
  defaultSectionResult,
  forTimeResultSchema,
  routineSnapshotSchema,
} from "@/features/workout-sessions/validation";

describe("session lifecycle", () => {
  it("allows planned → in_progress → completed", () => {
    expect(canTransitionSession("planned", "in_progress")).toBe(true);
    expect(canTransitionSession("in_progress", "completed")).toBe(true);
    expect(canTransitionSession("completed", "abandoned")).toBe(false);
  });

  it("allows discarding unfinished work as abandoned", () => {
    expect(canTransitionSession("in_progress", "abandoned")).toBe(true);
    expect(canTransitionSession("planned", "abandoned")).toBe(true);
  });
});

describe("live timer formats", () => {
  it("enables all nine formats", () => {
    expect(hasLiveTimerUx("amrap")).toBe(true);
    expect(hasLiveTimerUx("for_time")).toBe(true);
    expect(hasLiveTimerUx("strength")).toBe(true);
    expect(hasLiveTimerUx("custom")).toBe(true);
    expect(hasLiveTimerUx("emom")).toBe(true);
    expect(hasLiveTimerUx("tabata")).toBe(true);
    expect(hasLiveTimerUx("intervals")).toBe(true);
    expect(hasLiveTimerUx("rounds_for_time")).toBe(true);
    expect(hasLiveTimerUx("running")).toBe(true);
  });
});

describe("section result schemas", () => {
  it("parses AMRAP and For Time results", () => {
    expect(
      amrapResultSchema.parse({
        format: "amrap",
        rounds: 7,
        additionalReps: 3,
      }),
    ).toMatchObject({ rounds: 7, additionalReps: 3, capped: true });

    expect(
      forTimeResultSchema.parse({
        format: "for_time",
        completionMs: 312_000,
        capped: false,
      }),
    ).toMatchObject({ completionMs: 312_000 });
  });

  it("defaults results per format", () => {
    expect(defaultSectionResult("amrap")).toEqual({
      format: "amrap",
      rounds: 0,
      additionalReps: 0,
      capped: true,
    });
  });

  it("rejects snapshots without version 1", () => {
    const parsed = routineSnapshotSchema.safeParse({
      snapshotVersion: 2,
      routineId: "11111111-1111-4111-8111-111111111111",
      name: "Fran",
      description: "",
      category: "crossfit",
      tags: [],
      sections: [],
    });
    expect(parsed.success).toBe(false);
  });
});
