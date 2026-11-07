import { z } from "zod";

import {
  formatConfigByFormat,
  loadUnitSchema,
  quantityUnitSchema,
  routineCategorySchema,
  workoutFormatSchema,
  type FormatConfigMap,
  type WorkoutFormat,
} from "@/features/routines/validation";
import { sessionStatuses } from "@/features/workout-sessions/lifecycle";

export const sessionStatusSchema = z.enum(sessionStatuses);
export type SessionStatus = z.infer<typeof sessionStatusSchema>;

export const sessionScalingSchema = z.enum(["rx", "scaled"]);
export type SessionScaling = z.infer<typeof sessionScalingSchema>;

export const sessionIdSchema = z.uuid("Session not found.");

const snapshotExerciseSchema = z
  .object({
    exerciseId: z.uuid(),
    exerciseName: z.string().trim().min(1).max(80),
    demoUrl: z.union([z.string().url(), z.null()]),
    quantity: z.number().positive().max(100000),
    quantityUnit: quantityUnitSchema,
    loadValue: z.number().min(0).max(10000).nullable(),
    loadUnit: loadUnitSchema.nullable(),
    notes: z.string().max(300),
  })
  .strict();

const snapshotSectionSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    format: workoutFormatSchema,
    formatConfig: z.unknown(),
    exercises: z.array(snapshotExerciseSchema).max(40),
  })
  .strict()
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
      formatConfig: schema.parse(
        value.formatConfig,
      ) as FormatConfigMap[WorkoutFormat],
      exercises: value.exercises,
    };
  });

export const routineSnapshotSchema = z
  .object({
    snapshotVersion: z.literal(1),
    routineId: z.uuid(),
    name: z.string().trim().min(1).max(80),
    description: z.string().max(500),
    category: routineCategorySchema,
    tags: z.array(z.string().max(24)).max(12),
    sections: z.array(snapshotSectionSchema).min(1).max(20),
  })
  .strict();

export type RoutineSnapshot = z.infer<typeof routineSnapshotSchema>;
export type SnapshotSection = RoutineSnapshot["sections"][number];
export type SnapshotExercise = SnapshotSection["exercises"][number];

export const amrapResultSchema = z
  .object({
    format: z.literal("amrap"),
    rounds: z.coerce.number().int().min(0).max(1000),
    additionalReps: z.coerce.number().int().min(0).max(10000),
    capped: z.boolean().default(true),
  })
  .strict();

export const forTimeResultSchema = z
  .object({
    format: z.literal("for_time"),
    completionMs: z.coerce.number().int().min(0).max(86_400_000).nullable(),
    capped: z.boolean().default(false),
  })
  .strict();

export const strengthSetLogSchema = z
  .object({
    setIndex: z.coerce.number().int().min(0).max(40),
    reps: z.coerce.number().int().min(0).max(1000),
    loadValue: z.coerce.number().min(0).max(10000).nullable(),
    loadUnit: loadUnitSchema.nullable(),
    completed: z.boolean().default(true),
  })
  .strict();

export const strengthResultSchema = z
  .object({
    format: z.literal("strength"),
    sets: z.array(strengthSetLogSchema).max(40),
  })
  .strict();

export const customResultSchema = z
  .object({
    format: z.literal("custom"),
    durationMs: z.coerce.number().int().min(0).max(86_400_000).nullable(),
    notes: z.string().trim().max(1000).default(""),
  })
  .strict();

export const genericSectionResultSchema = z
  .object({
    format: workoutFormatSchema,
    notes: z.string().trim().max(1000).default(""),
    completed: z.boolean().default(true),
  })
  .strict();

export const sectionResultSchema = z.discriminatedUnion("format", [
  amrapResultSchema,
  forTimeResultSchema,
  strengthResultSchema,
  customResultSchema,
  z
    .object({
      format: z.literal("emom"),
      notes: z.string().trim().max(1000).default(""),
      completed: z.boolean().default(true),
    })
    .strict(),
  z
    .object({
      format: z.literal("rounds_for_time"),
      completionMs: z.coerce.number().int().min(0).max(86_400_000).nullable(),
      capped: z.boolean().default(false),
      notes: z.string().trim().max(1000).default(""),
    })
    .strict(),
  z
    .object({
      format: z.literal("tabata"),
      notes: z.string().trim().max(1000).default(""),
      completed: z.boolean().default(true),
    })
    .strict(),
  z
    .object({
      format: z.literal("intervals"),
      notes: z.string().trim().max(1000).default(""),
      completed: z.boolean().default(true),
    })
    .strict(),
  z
    .object({
      format: z.literal("running"),
      durationMs: z.coerce.number().int().min(0).max(86_400_000).nullable(),
      distanceMeters: z.coerce.number().int().min(0).max(100000).nullable(),
      notes: z.string().trim().max(1000).default(""),
    })
    .strict(),
]);

export type SectionResult = z.infer<typeof sectionResultSchema>;

export function defaultSectionResult(format: WorkoutFormat): SectionResult {
  switch (format) {
    case "amrap":
      return { format: "amrap", rounds: 0, additionalReps: 0, capped: true };
    case "for_time":
      return { format: "for_time", completionMs: null, capped: false };
    case "strength":
      return { format: "strength", sets: [] };
    case "custom":
      return { format: "custom", durationMs: null, notes: "" };
    case "emom":
      return { format: "emom", notes: "", completed: true };
    case "rounds_for_time":
      return {
        format: "rounds_for_time",
        completionMs: null,
        capped: false,
        notes: "",
      };
    case "tabata":
      return { format: "tabata", notes: "", completed: true };
    case "intervals":
      return { format: "intervals", notes: "", completed: true };
    case "running":
      return {
        format: "running",
        durationMs: null,
        distanceMeters: null,
        notes: "",
      };
  }
}

export const upsertSectionResultInputSchema = z.object({
  sessionId: sessionIdSchema,
  sectionIndex: z.coerce.number().int().min(0).max(40),
  result: sectionResultSchema,
  elapsedMs: z.coerce.number().int().min(0).max(86_400_000).nullable().optional(),
  sectionStartedAt: z
    .union([z.iso.datetime(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
  sectionEndedAt: z
    .union([z.iso.datetime(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value ? value : null)),
});

export const advanceSectionInputSchema = z.object({
  sessionId: sessionIdSchema,
  fromSectionIndex: z.coerce.number().int().min(0).max(40),
  result: sectionResultSchema,
  elapsedMs: z.coerce.number().int().min(0).max(86_400_000).nullable(),
});

export const completeSessionInputSchema = z.object({
  sessionId: sessionIdSchema,
  notes: z.string().trim().max(2000).default(""),
  finalResult: sectionResultSchema.optional(),
  finalElapsedMs: z.coerce
    .number()
    .int()
    .min(0)
    .max(86_400_000)
    .nullable()
    .optional(),
});

export const abandonSessionInputSchema = z.object({
  sessionId: sessionIdSchema,
});

export const setScalingInputSchema = z.object({
  sessionId: sessionIdSchema,
  scaling: sessionScalingSchema,
});

export const pauseResumeInputSchema = z.object({
  sessionId: sessionIdSchema,
});
