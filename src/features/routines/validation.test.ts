import { describe, expect, it } from "vitest";

import {
  defaultFormatConfig,
  formatConfigByFormat,
  routineInputSchema,
  workoutFormats,
  type WorkoutFormat,
} from "@/features/routines/validation";

const exerciseId = "11111111-1111-4111-8111-111111111111";

function section(
  format: WorkoutFormat,
  formatConfig: unknown = defaultFormatConfig(format),
) {
  return {
    name: "Metcon",
    format,
    formatConfig,
    exercises: [
      {
        exerciseId,
        quantity: 10,
        quantityUnit: "reps" as const,
        loadValue: null,
        loadUnit: null,
        notes: "",
      },
    ],
  };
}

describe("formatConfigByFormat", () => {
  it.each(workoutFormats)("accepts the default config for %s", (format) => {
    const parsed = formatConfigByFormat[format].safeParse(
      defaultFormatConfig(format),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects AMRAP without duration", () => {
    expect(formatConfigByFormat.amrap.safeParse({}).success).toBe(false);
  });

  it("rejects EMOM when duration is not a multiple of interval", () => {
    const parsed = formatConfigByFormat.emom.safeParse({
      durationSeconds: 100,
      intervalSeconds: 60,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects For Time with zero rounds", () => {
    expect(
      formatConfigByFormat.for_time.safeParse({ rounds: 0 }).success,
    ).toBe(false);
  });

  it("rejects Custom countdown without duration", () => {
    expect(
      formatConfigByFormat.custom.safeParse({ timerMode: "countdown" }).success,
    ).toBe(false);
  });

  it("rejects unknown keys on Strength config", () => {
    expect(
      formatConfigByFormat.strength.safeParse({
        sets: 5,
        reps: 5,
        restSeconds: 120,
        scoring: "volume",
      }).success,
    ).toBe(false);
  });
});

describe("routineInputSchema", () => {
  const valid = {
    name: "Monday Engine Builder",
    description: "Aerobic base",
    category: "crossfit" as const,
    tags: ["engine", "barbell"],
    sections: [
      section("for_time"),
      section("strength"),
      section("amrap"),
      section("custom"),
    ],
  };

  it("accepts a multi-section CrossFit routine", () => {
    const parsed = routineInputSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const parsed = routineInputSchema.safeParse({ ...valid, name: "  " });
    expect(parsed.success).toBe(false);
  });

  it("rejects a routine with no sections", () => {
    const parsed = routineInputSchema.safeParse({ ...valid, sections: [] });
    expect(parsed.success).toBe(false);
  });

  it("rejects another user's malformed exercise id", () => {
    const parsed = routineInputSchema.safeParse({
      ...valid,
      sections: [
        {
          ...section("amrap"),
          exercises: [
            {
              exerciseId: "not-a-uuid",
              quantity: 10,
              quantityUnit: "reps",
              loadValue: null,
              loadUnit: null,
              notes: "",
            },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects load without a unit", () => {
    const parsed = routineInputSchema.safeParse({
      ...valid,
      sections: [
        {
          ...section("strength"),
          exercises: [
            {
              exerciseId,
              quantity: 5,
              quantityUnit: "reps",
              loadValue: 80,
              loadUnit: null,
              notes: "",
            },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("normalizes tags to lowercase unique values", () => {
    const parsed = routineInputSchema.safeParse({
      ...valid,
      tags: ["Engine", "engine", "Barbell"],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.tags).toEqual(["engine", "barbell"]);
    }
  });

  it.each(workoutFormats)("accepts every format in a saved document (%s)", (format) => {
    const parsed = routineInputSchema.safeParse({
      ...valid,
      sections: [section(format)],
    });
    expect(parsed.success).toBe(true);
  });
});
