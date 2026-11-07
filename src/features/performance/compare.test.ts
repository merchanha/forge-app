import { describe, expect, it } from "vitest";

import {
  amrapWorkScore,
  areSectionContextsCompatible,
  compareSections,
  deltaLabelForScores,
  isBetterScore,
  isPersonalRecordScore,
  scoreSectionResult,
  strengthVolume,
  type SectionCompareInput,
} from "@/features/performance/compare";
import type { SectionResult } from "@/features/workout-sessions/validation";

function forTimeInput(
  overrides: Partial<SectionCompareInput> & {
    completionMs?: number | null;
    capped?: boolean;
    rounds?: number;
    timeCapSeconds?: number;
  } = {},
): SectionCompareInput {
  const {
    completionMs = 480_000,
    capped = false,
    rounds = 21,
    timeCapSeconds,
    ...rest
  } = overrides;
  return {
    sectionIndex: 0,
    format: "for_time",
    formatConfig: {
      rounds,
      ...(timeCapSeconds != null ? { timeCapSeconds } : {}),
    },
    result: {
      format: "for_time",
      completionMs,
      capped,
    },
    scaling: "rx",
    ...rest,
  };
}

function amrapInput(
  overrides: Partial<SectionCompareInput> & {
    rounds?: number;
    additionalReps?: number;
    durationSeconds?: number;
  } = {},
): SectionCompareInput {
  const {
    rounds = 5,
    additionalReps = 3,
    durationSeconds = 720,
    ...rest
  } = overrides;
  return {
    sectionIndex: 0,
    format: "amrap",
    formatConfig: { durationSeconds },
    result: {
      format: "amrap",
      rounds,
      additionalReps,
      capped: true,
    },
    scaling: "rx",
    ...rest,
  };
}

function strengthInput(
  overrides: Partial<SectionCompareInput> & {
    sets?: Array<{
      setIndex: number;
      reps: number;
      loadValue: number | null;
      loadUnit: "kg" | "lb" | null;
      completed: boolean;
    }>;
    prescriptionSets?: number;
    prescriptionReps?: number;
  } = {},
): SectionCompareInput {
  const {
    sets = [
      {
        setIndex: 0,
        reps: 5,
        loadValue: 80,
        loadUnit: "kg",
        completed: true,
      },
    ],
    prescriptionSets = 5,
    prescriptionReps = 5,
    ...rest
  } = overrides;
  return {
    sectionIndex: 0,
    format: "strength",
    formatConfig: {
      sets: prescriptionSets,
      reps: prescriptionReps,
      restSeconds: 120,
    },
    result: {
      format: "strength",
      sets,
    },
    scaling: "rx",
    ...rest,
  };
}

describe("scoreSectionResult", () => {
  it("scores for time as completion ms and rejects capped", () => {
    const score = scoreSectionResult("for_time", {
      format: "for_time",
      completionMs: 478_000,
      capped: false,
    });
    expect(score?.value).toBe(478_000);
    expect(score?.label).toBe("7:58");

    expect(
      scoreSectionResult("for_time", {
        format: "for_time",
        completionMs: 600_000,
        capped: true,
      }),
    ).toBeNull();
  });

  it("scores amrap as rounds then reps", () => {
    expect(amrapWorkScore(5, 3)).toBe(50_003);
    const score = scoreSectionResult("amrap", {
      format: "amrap",
      rounds: 5,
      additionalReps: 3,
      capped: true,
    });
    expect(score?.label).toBe("5 + 3");
    expect(score?.value).toBe(50_003);
  });

  it("scores strength volume in an explicit unit", () => {
    const result: SectionResult = {
      format: "strength",
      sets: [
        {
          setIndex: 0,
          reps: 5,
          loadValue: 80,
          loadUnit: "kg",
          completed: true,
        },
        {
          setIndex: 1,
          reps: 5,
          loadValue: 80,
          loadUnit: "kg",
          completed: true,
        },
      ],
    };
    expect(strengthVolume(result)).toEqual({
      volume: 800,
      loadUnit: "kg",
      reason: "ok",
    });
    expect(scoreSectionResult("strength", result)?.label).toBe("800 kg");
  });
});

describe("areSectionContextsCompatible", () => {
  it("allows for time only with matching rounds, cap, and scaling", () => {
    expect(
      areSectionContextsCompatible(forTimeInput(), forTimeInput()).compatible,
    ).toBe(true);

    expect(
      areSectionContextsCompatible(
        forTimeInput({ rounds: 21 }),
        forTimeInput({ rounds: 18 }),
      ).reason,
    ).toBe("context_mismatch");

    expect(
      areSectionContextsCompatible(
        forTimeInput({ timeCapSeconds: 600 }),
        forTimeInput(),
      ).reason,
    ).toBe("context_mismatch");

    expect(
      areSectionContextsCompatible(
        forTimeInput({ scaling: "scaled" }),
        forTimeInput({ scaling: "rx" }),
      ).reason,
    ).toBe("scaling_mismatch");
  });

  it("allows amrap only with matching duration", () => {
    expect(
      areSectionContextsCompatible(
        amrapInput({ durationSeconds: 720 }),
        amrapInput({ durationSeconds: 720 }),
      ).compatible,
    ).toBe(true);

    expect(
      areSectionContextsCompatible(
        amrapInput({ durationSeconds: 720 }),
        amrapInput({ durationSeconds: 600 }),
      ).reason,
    ).toBe("context_mismatch");
  });

  it("refuses strength when load units differ", () => {
    const kg = strengthInput();
    const lb = strengthInput({
      sets: [
        {
          setIndex: 0,
          reps: 5,
          loadValue: 175,
          loadUnit: "lb",
          completed: true,
        },
      ],
    });
    expect(areSectionContextsCompatible(kg, lb).reason).toBe(
      "incomparable_units",
    );
  });

  it("never ranks unlike formats", () => {
    expect(
      areSectionContextsCompatible(forTimeInput(), amrapInput()).reason,
    ).toBe("format_mismatch");
  });
});

describe("deltas and PR markers", () => {
  it("marks faster for time as better with a negative clock delta", () => {
    const current = scoreSectionResult("for_time", {
      format: "for_time",
      completionMs: 478_000,
      capped: false,
    })!;
    const previous = scoreSectionResult("for_time", {
      format: "for_time",
      completionMs: 492_000,
      capped: false,
    })!;
    expect(isBetterScore(current, previous)).toBe(true);
    expect(deltaLabelForScores(current, previous)).toBe("−0:14");
  });

  it("marks higher amrap work as better", () => {
    const current = scoreSectionResult("amrap", {
      format: "amrap",
      rounds: 5,
      additionalReps: 3,
      capped: true,
    })!;
    const previous = scoreSectionResult("amrap", {
      format: "amrap",
      rounds: 4,
      additionalReps: 18,
      capped: true,
    })!;
    expect(isBetterScore(current, previous)).toBe(true);
    expect(deltaLabelForScores(current, previous)).toMatch(/\+/);
  });

  it("shows PR only when current is best among compatible history", () => {
    const current = scoreSectionResult("for_time", {
      format: "for_time",
      completionMs: 478_000,
      capped: false,
    })!;
    const older = scoreSectionResult("for_time", {
      format: "for_time",
      completionMs: 512_000,
      capped: false,
    })!;
    const faster = scoreSectionResult("for_time", {
      format: "for_time",
      completionMs: 450_000,
      capped: false,
    })!;

    expect(isPersonalRecordScore(current, [older])).toBe(true);
    expect(isPersonalRecordScore(current, [older, faster])).toBe(false);
  });

  it("compareSections attaches previous delta and PR when compatible", () => {
    const current = forTimeInput({ completionMs: 478_000 });
    const previous = forTimeInput({ completionMs: 492_000 });
    const history = [
      scoreSectionResult("for_time", previous.result)!,
      scoreSectionResult("for_time", {
        format: "for_time",
        completionMs: 525_000,
        capped: false,
      })!,
    ];

    const comparison = compareSections({
      current,
      previous,
      historyScores: history,
    });

    expect(comparison.compatible).toBe(true);
    expect(comparison.deltaLabel).toBe("−0:14");
    expect(comparison.isPersonalRecord).toBe(true);
  });
});
