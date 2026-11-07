import { z } from "zod";

export const preferredUnitsSchema = z.enum(["kg", "lb"]);

export const profileThemeSchema = z.enum(["dark", "light"]);

export const experienceLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

export const trainingGoalSchema = z.enum([
  "endurance",
  "general_fitness",
  "strength",
  "competition",
]);

export const trainingDisciplines = [
  "CrossFit",
  "HYROX",
  "Running",
  "Functional Fitness",
  "Strength",
] as const;

export type TrainingDiscipline = (typeof trainingDisciplines)[number];

export const trainingDisciplineSchema = z.enum(trainingDisciplines);

export const experienceLevelLabels: Record<
  z.infer<typeof experienceLevelSchema>,
  string
> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const trainingGoalLabels: Record<
  z.infer<typeof trainingGoalSchema>,
  string
> = {
  endurance: "Endurance",
  general_fitness: "General fitness",
  strength: "Strength",
  competition: "Competition",
};

const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }
    return value;
  }, schema.nullable());

function parseDisciplines(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : item))
      .filter((item) => item !== "" && item != null);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        return parseDisciplines(parsed);
      }
    } catch {
      // fall through to FormData-style comma list
    }
    return trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  }
  if (value == null) {
    return [];
  }
  return value;
}

export const updateProfileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Name is required")
      .max(80, "Name must be 80 characters or fewer"),
    preferredUnits: preferredUnitsSchema,
    theme: profileThemeSchema,
    experienceLevel: emptyToNull(experienceLevelSchema),
    disciplines: z.preprocess(
      parseDisciplines,
      z.array(trainingDisciplineSchema).max(8),
    ),
    primaryDiscipline: emptyToNull(trainingDisciplineSchema),
    goal: emptyToNull(trainingGoalSchema),
    daysPerWeek: z.preprocess((value) => {
      if (value === "" || value === null || value === undefined) {
        return null;
      }
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
          return null;
        }
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : value;
      }
      return value;
    }, z.number().int().min(1).max(7).nullable()),
    targetEvent: z
      .string()
      .trim()
      .max(80, "Target event must be 80 characters or fewer")
      .default(""),
  })
  .superRefine((value, ctx) => {
    if (
      value.primaryDiscipline &&
      !value.disciplines.includes(value.primaryDiscipline)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["primaryDiscipline"],
        message: "Primary discipline must be one of your selected disciplines.",
      });
    }
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
