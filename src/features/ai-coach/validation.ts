import { z } from "zod";

import {
  formatConfigByFormat,
  formatConfigSummary,
  hrZoneSchema,
  loadUnitSchema,
  quantityUnitSchema,
  routineCategories,
  routineCategorySchema,
  workoutFormatLabels,
  workoutFormatSchema,
  type FormatConfigMap,
  type RoutineCategory,
  type WorkoutFormat,
} from "@/features/routines/validation";

import { AI_COACH_PROMPT_MAX } from "@/features/ai-coach/lib/limits";

export const aiCoachPromptSchema = z
  .string()
  .trim()
  .min(1, "Ask your coach a question first.")
  .max(AI_COACH_PROMPT_MAX, `Keep prompts under ${AI_COACH_PROMPT_MAX} characters.`);

const positiveInt = (min: number, max: number, label: string) =>
  z.coerce
    .number()
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

/** Flattened format fields — easier for models than nested discriminated unions. */
const aiSectionFieldsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  format: workoutFormatSchema,
  durationSeconds: positiveInt(30, 7200, "Duration").optional(),
  intervalSeconds: positiveInt(15, 600, "Interval").optional(),
  rounds: positiveInt(1, 100, "Rounds").optional(),
  timeCapSeconds: positiveInt(30, 7200, "Time cap").optional(),
  workSeconds: positiveInt(5, 3600, "Work").optional(),
  restSeconds: positiveInt(0, 3600, "Rest").optional(),
  sets: positiveInt(1, 20, "Sets").optional(),
  reps: positiveInt(1, 100, "Reps").optional(),
  rpe: z.coerce.number().min(1).max(10).optional(),
  distanceMeters: positiveInt(50, 100000, "Distance").optional(),
  targetPaceSecondsPerKm: positiveInt(120, 1800, "Target pace").optional(),
  timerMode: z.enum(["none", "stopwatch", "countdown"]).optional(),
  exercises: z
    .array(
      z.object({
        exerciseName: z.string().trim().min(1).max(80),
        quantity: z.coerce.number().positive().max(100000),
        quantityUnit: quantityUnitSchema,
        loadValue: z.coerce.number().min(0).max(10000).nullable().optional(),
        loadUnit: loadUnitSchema.nullable().optional(),
        targetPaceSecondsPerKm: positiveInt(150, 1800, "Pace")
          .nullable()
          .optional(),
        hrZone: hrZoneSchema.nullable().optional(),
        segmentRepeats: positiveInt(1, 100, "Repeats").nullable().optional(),
        notes: z.string().trim().max(300).optional().default(""),
      }),
    )
    .max(40),
});

export const aiModelOutputSchema = z.object({
  coachMessage: z
    .string()
    .trim()
    .min(1)
    .max(800)
    .describe("Short coach reply. Not medical advice."),
  includeDraft: z
    .boolean()
    .describe("True when returning a routine the athlete can review and save."),
  draft: z
    .object({
      name: z.string().trim().min(1).max(80),
      description: z.string().trim().max(500).default(""),
      category: routineCategorySchema,
      tags: z.array(z.string().trim().min(1).max(24)).max(12).default([]),
      objective: z.string().trim().max(80).default(""),
      equipment: z.string().trim().max(80).default(""),
      scaling: z.string().trim().max(80).default(""),
      effortRpe: z.coerce.number().int().min(1).max(10).nullable().optional(),
      sections: z.array(aiSectionFieldsSchema).min(1).max(12),
    })
    .nullable(),
});

export type AiModelOutput = z.infer<typeof aiModelOutputSchema>;

export type AiDraftExercise = {
  exerciseName: string;
  quantity: number;
  quantityUnit: z.infer<typeof quantityUnitSchema>;
  loadValue: number | null;
  loadUnit: z.infer<typeof loadUnitSchema> | null;
  targetPaceSecondsPerKm: number | null;
  hrZone: z.infer<typeof hrZoneSchema> | null;
  segmentRepeats: number | null;
  notes: string;
};

export type AiDraftSection = {
  name: string;
  format: WorkoutFormat;
  formatConfig: FormatConfigMap[WorkoutFormat];
  summaryLine: string;
  exercises: AiDraftExercise[];
};

export type AiRoutineDraft = {
  name: string;
  description: string;
  category: RoutineCategory;
  tags: string[];
  objective: string;
  equipment: string;
  scaling: string;
  effortRpe: number | null;
  sections: AiDraftSection[];
};

export type AiCoachDraftResult = {
  coachMessage: string;
  draft: AiRoutineDraft | null;
};

function buildFormatConfig(
  section: z.infer<typeof aiSectionFieldsSchema>,
): FormatConfigMap[WorkoutFormat] {
  const format = section.format;
  switch (format) {
    case "amrap":
      return formatConfigByFormat.amrap.parse({
        durationSeconds: section.durationSeconds ?? 720,
      });
    case "emom":
      return formatConfigByFormat.emom.parse({
        durationSeconds: section.durationSeconds ?? 720,
        intervalSeconds: section.intervalSeconds ?? 60,
      });
    case "for_time":
      return formatConfigByFormat.for_time.parse({
        rounds: section.rounds ?? 1,
        ...(section.timeCapSeconds
          ? { timeCapSeconds: section.timeCapSeconds }
          : {}),
      });
    case "rounds_for_time":
      return formatConfigByFormat.rounds_for_time.parse({
        rounds: section.rounds ?? 5,
        ...(section.timeCapSeconds
          ? { timeCapSeconds: section.timeCapSeconds }
          : {}),
      });
    case "tabata":
      return formatConfigByFormat.tabata.parse({
        workSeconds: section.workSeconds ?? 20,
        restSeconds: section.restSeconds ?? 10,
        rounds: section.rounds ?? 8,
      });
    case "intervals":
      return formatConfigByFormat.intervals.parse({
        workSeconds: section.workSeconds ?? 120,
        restSeconds: section.restSeconds ?? 60,
        rounds: section.rounds ?? 6,
      });
    case "strength":
      return formatConfigByFormat.strength.parse({
        sets: section.sets ?? 5,
        reps: section.reps ?? 5,
        restSeconds: section.restSeconds ?? 120,
        ...(section.rpe != null ? { rpe: section.rpe } : {}),
      });
    case "running":
      return formatConfigByFormat.running.parse({
        distanceMeters: section.distanceMeters ?? 5000,
        ...(section.targetPaceSecondsPerKm
          ? { targetPaceSecondsPerKm: section.targetPaceSecondsPerKm }
          : {}),
      });
    case "custom": {
      const mode = section.timerMode ?? "stopwatch";
      if (mode === "countdown") {
        return formatConfigByFormat.custom.parse({
          timerMode: "countdown",
          durationSeconds: section.durationSeconds ?? 300,
        });
      }
      return formatConfigByFormat.custom.parse({ timerMode: mode });
    }
  }
}

function exerciseSummary(exercise: AiDraftExercise): string {
  const load =
    exercise.loadValue != null && exercise.loadUnit
      ? ` @ ${exercise.loadValue}${exercise.loadUnit}`
      : "";
  return `${exercise.quantity} ${exercise.quantityUnit} ${exercise.exerciseName}${load}`;
}

function sectionSummaryLine(
  format: WorkoutFormat,
  formatConfig: FormatConfigMap[WorkoutFormat],
  exercises: AiDraftExercise[],
): string {
  const configBit = formatConfigSummary(format, formatConfig);
  const movementBit = exercises
    .slice(0, 3)
    .map(exerciseSummary)
    .join(", ");
  if (!movementBit) {
    return configBit;
  }
  return `${configBit} · ${movementBit}`;
}

export function normalizeAiModelOutput(
  raw: unknown,
):
  | { ok: true; value: AiCoachDraftResult }
  | { ok: false; error: string } {
  const parsed = aiModelOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid coach response.",
    };
  }

  const output = parsed.data;
  if (!output.includeDraft || !output.draft) {
    return {
      ok: true,
      value: {
        coachMessage: output.coachMessage,
        draft: null,
      },
    };
  }

  try {
    const sections: AiDraftSection[] = output.draft.sections.map((section) => {
      const formatConfig = buildFormatConfig(section);
      const exercises: AiDraftExercise[] = section.exercises.map((exercise) => {
        const hasLoad =
          exercise.loadValue !== null &&
          exercise.loadValue !== undefined &&
          !Number.isNaN(exercise.loadValue);
        return {
          exerciseName: exercise.exerciseName,
          quantity: exercise.quantity,
          quantityUnit: exercise.quantityUnit,
          loadValue: hasLoad ? exercise.loadValue! : null,
          loadUnit: hasLoad ? (exercise.loadUnit ?? null) : null,
          targetPaceSecondsPerKm: exercise.targetPaceSecondsPerKm ?? null,
          hrZone: exercise.hrZone ?? null,
          segmentRepeats: exercise.segmentRepeats ?? null,
          notes: exercise.notes ?? "",
        };
      });

      return {
        name: section.name,
        format: section.format,
        formatConfig,
        summaryLine: sectionSummaryLine(section.format, formatConfig, exercises),
        exercises,
      };
    });

    const draft: AiRoutineDraft = {
      name: output.draft.name,
      description: output.draft.description,
      category: output.draft.category,
      tags: [
        ...new Set(output.draft.tags.map((tag) => tag.toLowerCase())),
      ].slice(0, 12),
      objective: output.draft.objective,
      equipment: output.draft.equipment,
      scaling: output.draft.scaling,
      effortRpe: output.draft.effortRpe ?? null,
      sections,
    };

    return {
      ok: true,
      value: {
        coachMessage: output.coachMessage,
        draft,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid draft format config.";
    return { ok: false, error: message };
  }
}

export function draftMetaLine(draft: AiRoutineDraft): string {
  const categoryLabel =
    draft.category.charAt(0).toUpperCase() + draft.category.slice(1);
  return `${categoryLabel} · ${draft.sections.length} sections`;
}

export function formatChipLabel(format: WorkoutFormat): string {
  return workoutFormatLabels[format];
}

export const aiCoachSuggestionPrompts = [
  "Recommend a CrossFit session for today",
  "Suggest a scale for today’s workout",
  "Build a 30-min HYROX piece from my 10k pace",
  "I have 45 minutes. Give me a functional workout",
  "How do I improve my running pace?",
  "Analyze last month",
  "Create a beginner strength block",
] as const;

export { routineCategories, workoutFormatLabels };
