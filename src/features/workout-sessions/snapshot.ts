import type { RoutineDetail } from "@/features/routines/queries";
import {
  routineSnapshotSchema,
  type RoutineSnapshot,
} from "@/features/workout-sessions/validation";

export function buildRoutineSnapshot(routine: RoutineDetail): RoutineSnapshot {
  const snapshot = {
    snapshotVersion: 2 as const,
    routineId: routine.id,
    name: routine.name,
    description: routine.description,
    category: routine.category,
    tags: routine.tags,
    objective: routine.objective,
    equipment: routine.equipment,
    scaling: routine.scaling,
    effortRpe: routine.effortRpe,
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
        targetPaceSecondsPerKm: exercise.targetPaceSecondsPerKm,
        hrZone: exercise.hrZone,
        segmentRepeats: exercise.segmentRepeats,
        notes: exercise.notes,
      })),
    })),
  };

  return routineSnapshotSchema.parse(snapshot);
}
