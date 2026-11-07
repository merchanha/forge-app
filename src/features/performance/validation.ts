import { z } from "zod";

import {
  sectionResultSchema,
  sessionIdSchema,
  sessionScalingSchema,
} from "@/features/workout-sessions/validation";

export const historyRangeSchema = z.enum(["30d", "90d", "all"]);
export type HistoryRange = z.infer<typeof historyRangeSchema>;

export const listHistoryInputSchema = z.object({
  range: historyRangeSchema.default("all"),
  routineId: z.uuid().optional().nullable(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

export type ListHistoryInput = z.infer<typeof listHistoryInputSchema>;

export const editCompletedSectionResultSchema = z.object({
  sessionId: sessionIdSchema,
  sectionIndex: z.coerce.number().int().min(0).max(40),
  result: sectionResultSchema,
});

export const editCompletedSessionNotesSchema = z.object({
  sessionId: sessionIdSchema,
  notes: z.string().trim().max(2000).default(""),
});

export const editCompletedSessionInputSchema = z.object({
  sessionId: sessionIdSchema,
  notes: z.string().trim().max(2000).default(""),
  sectionResults: z
    .array(
      z.object({
        sectionIndex: z.coerce.number().int().min(0).max(40),
        result: sectionResultSchema,
      }),
    )
    .min(1)
    .max(40),
});

export type EditCompletedSessionInput = z.infer<
  typeof editCompletedSessionInputSchema
>;

export const compareSessionsInputSchema = z.object({
  sessionId: sessionIdSchema,
  scaling: sessionScalingSchema.optional(),
});
