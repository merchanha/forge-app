import type { AiRoutineDraft } from "@/features/ai-coach/validation";
import {
  AI_COACH_BUILDER_INITIAL_KEY,
  AI_COACH_DRAFT_STORAGE_KEY,
} from "@/features/ai-coach/lib/limits";
import type { RoutineBuilderInitial } from "@/features/routines/components/routine-builder";

export function writeAiCoachDraftToSession(draft: AiRoutineDraft): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(AI_COACH_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function readAiCoachDraftFromSession(): AiRoutineDraft | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(AI_COACH_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AiRoutineDraft;
  } catch {
    return null;
  }
}

export function clearAiCoachDraftFromSession(): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.removeItem(AI_COACH_DRAFT_STORAGE_KEY);
}

export function writeBuilderInitialToSession(
  initial: RoutineBuilderInitial,
): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(AI_COACH_BUILDER_INITIAL_KEY, JSON.stringify(initial));
}

export function takeBuilderInitialFromSession(): RoutineBuilderInitial | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = sessionStorage.getItem(AI_COACH_BUILDER_INITIAL_KEY);
  if (!raw) {
    return null;
  }
  sessionStorage.removeItem(AI_COACH_BUILDER_INITIAL_KEY);
  try {
    return JSON.parse(raw) as RoutineBuilderInitial;
  } catch {
    return null;
  }
}
