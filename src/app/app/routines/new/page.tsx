import { Suspense } from "react";

import { listOwnExercises } from "@/features/exercises/queries";
import { getOwnProfile } from "@/features/profiles/queries";
import { RoutineBuilder } from "@/features/routines/components/routine-builder";

async function NewRoutineContent() {
  const [exercises, profile] = await Promise.all([
    listOwnExercises(),
    getOwnProfile(),
  ]);

  return (
    <RoutineBuilder
      preferredLoadUnit={profile?.preferred_units ?? "kg"}
      exercises={exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        equipment: exercise.equipment,
        demoUrl: exercise.demo_url,
      }))}
    />
  );
}

export default function NewRoutinePage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading builder…</p>}>
      <NewRoutineContent />
    </Suspense>
  );
}
