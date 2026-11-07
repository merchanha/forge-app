import { Suspense } from "react";
import { notFound } from "next/navigation";

import { listOwnExercises } from "@/features/exercises/queries";
import { getOwnProfile } from "@/features/profiles/queries";
import { RoutineBuilder } from "@/features/routines/components/routine-builder";
import { getOwnRoutine } from "@/features/routines/queries";

type EditRoutinePageProps = {
  params: Promise<{ id: string }>;
};

async function EditRoutineContent({
  params,
}: {
  params: EditRoutinePageProps["params"];
}) {
  const { id } = await params;

  const [routine, exercises, profile] = await Promise.all([
    getOwnRoutine(id),
    listOwnExercises(),
    getOwnProfile(),
  ]);

  if (!routine) {
    notFound();
  }

  return (
    <RoutineBuilder
      preferredLoadUnit={profile?.preferred_units ?? "kg"}
      exercises={exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        equipment: exercise.equipment,
        demoUrl: exercise.demo_url,
      }))}
      initial={{
        id: routine.id,
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
      }}
    />
  );
}

export default function EditRoutinePage({ params }: EditRoutinePageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading builder…</p>}>
      <EditRoutineContent params={params} />
    </Suspense>
  );
}
