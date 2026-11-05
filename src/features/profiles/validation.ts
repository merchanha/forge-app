import { z } from "zod";

export const preferredUnitsSchema = z.enum(["kg", "lb"]);

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be 80 characters or fewer"),
  preferredUnits: preferredUnitsSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
