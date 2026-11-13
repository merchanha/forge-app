import { listOwnExercises } from "@/features/exercises/queries";
import { getOwnProfile } from "@/features/profiles/queries";
import { listOwnRoutines } from "@/features/routines/queries";
import {
  routineCategoryLabels,
  workoutFormatLabels,
} from "@/features/routines/validation";

export type AiCoachAthleteContext = {
  systemPrompt: string;
  userContextBlock: string;
};

/**
 * Build prompt context from profile prefs, recent routines, and exercise names.
 * Avoids unnecessary PII (no email); training prefs only.
 */
export async function buildAiCoachContext(): Promise<AiCoachAthleteContext> {
  const [profile, routines, exercises] = await Promise.all([
    getOwnProfile(),
    listOwnRoutines({ includeArchived: false }),
    listOwnExercises(),
  ]);

  const recent = routines.slice(0, 8).map((routine) => {
    const category =
      routineCategoryLabels[
        routine.category as keyof typeof routineCategoryLabels
      ] ?? routine.category;
    return `- ${routine.name} (${category}, ${routine.section_count} sections)`;
  });

  const exerciseNames = exercises
    .slice(0, 40)
    .map((exercise) => exercise.name);

  const prefs = [
    profile?.display_name ? `Name: ${profile.display_name}` : null,
    profile?.experience_level
      ? `Experience: ${profile.experience_level}`
      : null,
    profile?.disciplines?.length
      ? `Disciplines: ${profile.disciplines.join(", ")}`
      : null,
    profile?.primary_discipline
      ? `Primary: ${profile.primary_discipline}`
      : null,
    profile?.goal ? `Goal: ${profile.goal}` : null,
    profile?.days_per_week != null
      ? `Days/week: ${profile.days_per_week}`
      : null,
    profile?.target_event ? `Target event: ${profile.target_event}` : null,
    profile?.preferred_units
      ? `Preferred load unit: ${profile.preferred_units}`
      : null,
  ].filter(Boolean);

  const formats = Object.entries(workoutFormatLabels)
    .map(([id, label]) => `${id} (${label})`)
    .join(", ");

  const systemPrompt = [
    "You are FORGE AI Coach, a training assistant for CrossFit, HYROX, running, strength, and functional fitness.",
    "You draft workout routines the athlete can review. You are not a medical professional and must not diagnose, treat, or give medical advice.",
    "Nothing is saved until the athlete explicitly confirms in the app.",
    "Prefer exercises from the athlete library when listed. Invent clear exercise names only when needed.",
    "Use only supported formats: " + formats + ".",
    "When includeDraft is true, fill flattened format fields that match the format (e.g. AMRAP needs durationSeconds; EMOM needs durationSeconds + intervalSeconds; strength needs sets/reps/restSeconds).",
    "Keep coachMessage short (under 400 characters). Do not claim results are saved.",
  ].join(" ");

  const userContextBlock = [
    "Athlete profile:",
    prefs.length ? prefs.join("\n") : "No profile prefs set.",
    "",
    "Recent routines:",
    recent.length ? recent.join("\n") : "No routines yet.",
    "",
    "Exercise library names:",
    exerciseNames.length ? exerciseNames.join(", ") : "Empty library.",
  ].join("\n");

  return { systemPrompt, userContextBlock };
}
