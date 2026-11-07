import { z } from "zod";

export const exploreTemplateIdSchema = z.uuid("Explore template not found");

export type ExploreTemplateId = z.infer<typeof exploreTemplateIdSchema>;
