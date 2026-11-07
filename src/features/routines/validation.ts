import { z } from "zod";

export const routineCategories = [
  "crossfit",
  "hyrox",
  "running",
  "custom",
] as const;

export const routineCategorySchema = z.enum(routineCategories);
export type RoutineCategory = z.infer<typeof routineCategorySchema>;

export const routineCategoryLabels: Record<RoutineCategory, string> = {
  crossfit: "CrossFit",
  hyrox: "HYROX",
  running: "Running",
  custom: "Custom",
};

export const workoutFormats = [
  "amrap",
  "emom",
  "for_time",
  "rounds_for_time",
  "tabata",
  "intervals",
  "strength",
  "running",
  "custom",
] as const;

export const workoutFormatSchema = z.enum(workoutFormats);
export type WorkoutFormat = z.infer<typeof workoutFormatSchema>;

export const workoutFormatLabels: Record<WorkoutFormat, string> = {
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  rounds_for_time: "Rounds for Time",
  tabata: "Tabata",
  intervals: "Intervals",
  strength: "Strength",
  running: "Running",
  custom: "Custom",
};

export const workoutFormatHints: Record<WorkoutFormat, string> = {
  amrap: "As many rounds as possible",
  emom: "One movement every minute",
  for_time: "Finish fast, optional cap",
  rounds_for_time: "Fixed rounds, fastest wins",
  tabata: "20 on, 10 off",
  intervals: "Custom work and rest",
  strength: "Sets, reps, load, RPE",
  running: "Distance, pace and splits",
  custom: "Free blocks, optional timer",
};

export const quantityUnits = ["reps", "m", "cal", "min"] as const;
export const quantityUnitSchema = z.enum(quantityUnits);
export type QuantityUnit = z.infer<typeof quantityUnitSchema>;

export const loadUnitSchema = z.enum(["kg", "lb"]);
export type LoadUnit = z.infer<typeof loadUnitSchema>;

const positiveInt = (min: number, max: number, label: string) =>
  z.coerce
    .number()
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

export const amrapConfigSchema = z
  .object({
    durationSeconds: positiveInt(30, 7200, "Duration"),
  })
  .strict();

export const emomConfigSchema = z
  .object({
    durationSeconds: positiveInt(60, 7200, "Duration"),
    intervalSeconds: positiveInt(15, 600, "Interval"),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.durationSeconds % value.intervalSeconds !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "Duration must be a multiple of the interval",
        path: ["durationSeconds"],
      });
    }
  });

export const forTimeConfigSchema = z
  .object({
    rounds: positiveInt(1, 100, "Rounds"),
    timeCapSeconds: positiveInt(30, 7200, "Time cap").optional(),
  })
  .strict();

export const roundsForTimeConfigSchema = z
  .object({
    rounds: positiveInt(1, 100, "Rounds"),
    timeCapSeconds: positiveInt(30, 7200, "Time cap").optional(),
  })
  .strict();

export const tabataConfigSchema = z
  .object({
    workSeconds: positiveInt(5, 600, "Work"),
    restSeconds: positiveInt(0, 600, "Rest"),
    rounds: positiveInt(1, 60, "Rounds"),
  })
  .strict();

export const intervalsConfigSchema = z
  .object({
    workSeconds: positiveInt(5, 3600, "Work"),
    restSeconds: positiveInt(0, 3600, "Rest"),
    rounds: positiveInt(1, 100, "Rounds"),
  })
  .strict();

export const strengthConfigSchema = z
  .object({
    sets: positiveInt(1, 20, "Sets"),
    reps: positiveInt(1, 100, "Reps"),
    restSeconds: positiveInt(0, 900, "Rest"),
    rpe: z.coerce
      .number()
      .min(1, "RPE must be at least 1")
      .max(10, "RPE must be at most 10")
      .optional(),
  })
  .strict();

export const runningConfigSchema = z
  .object({
    distanceMeters: positiveInt(50, 100000, "Distance"),
    targetPaceSecondsPerKm: positiveInt(120, 1800, "Target pace").optional(),
  })
  .strict();

export const customConfigSchema = z.discriminatedUnion("timerMode", [
  z
    .object({
      timerMode: z.literal("none"),
    })
    .strict(),
  z
    .object({
      timerMode: z.literal("stopwatch"),
    })
    .strict(),
  z
    .object({
      timerMode: z.literal("countdown"),
      durationSeconds: positiveInt(30, 7200, "Duration"),
    })
    .strict(),
]);

export const formatConfigByFormat = {
  amrap: amrapConfigSchema,
  emom: emomConfigSchema,
  for_time: forTimeConfigSchema,
  rounds_for_time: roundsForTimeConfigSchema,
  tabata: tabataConfigSchema,
  intervals: intervalsConfigSchema,
  strength: strengthConfigSchema,
  running: runningConfigSchema,
  custom: customConfigSchema,
} as const;

export type FormatConfigMap = {
  [K in WorkoutFormat]: z.infer<(typeof formatConfigByFormat)[K]>;
};

export function defaultFormatConfig(format: WorkoutFormat): FormatConfigMap[WorkoutFormat] {
  switch (format) {
    case "amrap":
      return { durationSeconds: 720 };
    case "emom":
      return { durationSeconds: 720, intervalSeconds: 60 };
    case "for_time":
      return { rounds: 1, timeCapSeconds: 600 };
    case "rounds_for_time":
      return { rounds: 5, timeCapSeconds: 1200 };
    case "tabata":
      return { workSeconds: 20, restSeconds: 10, rounds: 8 };
    case "intervals":
      return { workSeconds: 120, restSeconds: 60, rounds: 6 };
    case "strength":
      return { sets: 5, reps: 5, restSeconds: 120 };
    case "running":
      return { distanceMeters: 5000, targetPaceSecondsPerKm: 270 };
    case "custom":
      return { timerMode: "stopwatch" };
  }
}

export const suggestedFormatsByCategory: Record<
  RoutineCategory,
  WorkoutFormat[]
> = {
  crossfit: ["amrap", "emom", "for_time", "rounds_for_time", "strength"],
  hyrox: ["rounds_for_time", "intervals", "for_time", "running"],
  running: ["running", "intervals", "custom"],
  custom: [...workoutFormats],
};

export function formatConfigSummary(
  format: WorkoutFormat,
  config: FormatConfigMap[WorkoutFormat],
): string {
  const mmss = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  switch (format) {
    case "amrap": {
      const c = config as FormatConfigMap["amrap"];
      return mmss(c.durationSeconds);
    }
    case "emom": {
      const c = config as FormatConfigMap["emom"];
      return `${mmss(c.durationSeconds)} · every ${mmss(c.intervalSeconds)}`;
    }
    case "for_time":
    case "rounds_for_time": {
      const c = config as FormatConfigMap["for_time"];
      return c.timeCapSeconds
        ? `${c.rounds} rounds · cap ${mmss(c.timeCapSeconds)}`
        : `${c.rounds} rounds`;
    }
    case "tabata":
    case "intervals": {
      const c = config as FormatConfigMap["tabata"];
      return `${mmss(c.workSeconds)} / ${mmss(c.restSeconds)} × ${c.rounds}`;
    }
    case "strength": {
      const c = config as FormatConfigMap["strength"];
      const rpe = c.rpe != null ? ` · RPE ${c.rpe}` : "";
      return `${c.sets} × ${c.reps} · rest ${mmss(c.restSeconds)}${rpe}`;
    }
    case "running": {
      const c = config as FormatConfigMap["running"];
      const km = (c.distanceMeters / 1000).toFixed(
        c.distanceMeters % 1000 === 0 ? 0 : 1,
      );
      const pace = c.targetPaceSecondsPerKm
        ? ` · ${mmss(c.targetPaceSecondsPerKm)} /km`
        : "";
      return `${km} km${pace}`;
    }
    case "custom": {
      const c = config as FormatConfigMap["custom"];
      if (c.timerMode === "countdown") {
        return `Countdown ${mmss(c.durationSeconds)}`;
      }
      if (c.timerMode === "stopwatch") {
        return "Stopwatch";
      }
      return "No timer";
    }
  }
}

const quantitySchema = z.coerce
  .number()
  .positive("Quantity must be greater than 0")
  .max(100000, "Quantity is too large");

export const routineExerciseInputSchema = z
  .object({
    exerciseId: z.uuid("Pick an exercise from your library"),
    quantity: quantitySchema,
    quantityUnit: quantityUnitSchema,
    loadValue: z.coerce
      .number()
      .min(0, "Load cannot be negative")
      .max(10000, "Load is too large")
      .nullable()
      .optional(),
    loadUnit: loadUnitSchema.nullable().optional(),
    notes: z
      .string()
      .trim()
      .max(300, "Notes must be 300 characters or fewer")
      .default(""),
  })
  .superRefine((value, ctx) => {
    const hasLoad =
      value.loadValue !== null &&
      value.loadValue !== undefined &&
      !Number.isNaN(value.loadValue);
    if (hasLoad && !value.loadUnit) {
      ctx.addIssue({
        code: "custom",
        message: "Load unit is required when load is set",
        path: ["loadUnit"],
      });
    }
    if (!hasLoad && value.loadUnit) {
      ctx.addIssue({
        code: "custom",
        message: "Clear the load unit when there is no load",
        path: ["loadUnit"],
      });
    }
  })
  .transform((value) => {
    const hasLoad =
      value.loadValue !== null &&
      value.loadValue !== undefined &&
      !Number.isNaN(value.loadValue);
    return {
      exerciseId: value.exerciseId,
      quantity: value.quantity,
      quantityUnit: value.quantityUnit,
      loadValue: hasLoad ? value.loadValue! : null,
      loadUnit: hasLoad ? value.loadUnit! : null,
      notes: value.notes,
    };
  });

export type RoutineExerciseInput = z.infer<typeof routineExerciseInputSchema>;

export const routineSectionInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Section name is required")
      .max(80, "Section name must be 80 characters or fewer"),
    format: workoutFormatSchema,
    formatConfig: z.unknown(),
    exercises: z.array(routineExerciseInputSchema).max(40),
  })
  .superRefine((value, ctx) => {
    const schema = formatConfigByFormat[value.format];
    const parsed = schema.safeParse(value.formatConfig);
    if (!parsed.success) {
      ctx.addIssue({
        code: "custom",
        message: parsed.error.issues[0]?.message ?? "Invalid format config",
        path: ["formatConfig"],
      });
    }
  })
  .transform((value) => {
    const schema = formatConfigByFormat[value.format];
    return {
      name: value.name,
      format: value.format,
      formatConfig: schema.parse(value.formatConfig) as FormatConfigMap[WorkoutFormat],
      exercises: value.exercises,
    };
  });

export type RoutineSectionInput = z.infer<typeof routineSectionInputSchema>;

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(24, "Each tag must be 24 characters or fewer");

export const routineInputSchema = z.object({
  id: z.uuid().optional().nullable(),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer")
    .default(""),
  category: routineCategorySchema,
  tags: z
    .array(tagSchema)
    .max(12, "Use 12 tags or fewer")
    .default([])
    .transform((tags) =>
      [...new Set(tags.map((tag) => tag.toLowerCase()))].slice(0, 12),
    ),
  sections: z
    .array(routineSectionInputSchema)
    .min(1, "Add at least one section")
    .max(20, "Use 20 sections or fewer"),
});

export type RoutineInput = z.infer<typeof routineInputSchema>;

export const routineIdSchema = z.uuid("Routine not found.");

export const deleteRoutineSchema = z.object({
  id: routineIdSchema,
  confirmDelete: z
    .string()
    .refine((value) => value === "yes", "Confirm before deleting."),
});

export const quantityStep: Record<QuantityUnit, number> = {
  reps: 1,
  m: 50,
  cal: 1,
  min: 1,
};

export function parseTagsInput(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
