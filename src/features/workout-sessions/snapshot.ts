import type { RoutineDetail } from "@/features/routines/queries";
import {
  routineSnapshotSchema,
  type RoutineSnapshot,
} from "@/features/workout-sessions/validation";

export function buildRoutineSnapshot(routine: RoutineDetail): RoutineSnapshot {
  const snapshot = {
    snapshotVersion: 1 as const,
    routineId: routine.id,
    name: routine.name,
    description: routine.description,
    category: routine.category,
    tags: routine.tags,
    sections: routine.sections.map((section) => ({
      name: section.name,
      format: section.format,
      formatConfig: section.formatConfig,
      exercises: section.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        demoUrl: exercise.demoUrl,
        quantity: exercise.quantity,
        quantityUnit: exercise.quantityUnit,
        loadValue: exercise.loadValue,
        loadUnit: exercise.loadUnit,
        notes: exercise.notes,
      })),
    })),
  };

  return routineSnapshotSchema.parse(snapshot);
}
