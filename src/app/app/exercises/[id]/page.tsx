import { Suspense } from "react";
import Link from "next/link";

import { DeleteExerciseForm } from "@/features/exercises/components/delete-exercise-form";
import { ExerciseForm } from "@/features/exercises/components/exercise-form";
import { getOwnExercise } from "@/features/exercises/queries";

async function EditExerciseContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let exercise: Awaited<ReturnType<typeof getOwnExercise>> = null;
  try {
    exercise = await getOwnExercise(id);
  } catch {
    return (
      <p className="text-sm text-[#ff8f6b]" role="alert">
        Could not load this exercise.
      </p>
    );
  }

  if (!exercise) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-4xl font-extrabold uppercase">
          Exercise
        </h1>
        <p className="text-muted" role="status">
          Exercise not found.
        </p>
        <Link
          href="/app/exercises"
          className="text-accent text-sm font-semibold"
        >
          Back to exercises
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Link
          href="/app/exercises"
          className="text-muted text-sm font-semibold"
        >
          Exercises
        </Link>
        <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
          {exercise.name}
        </h1>
      </header>

      {exercise.demo_url ? (
        <a
          href={exercise.demo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border bg-surface inline-flex min-h-12 items-center rounded-lg border px-4 text-sm font-semibold"
        >
          Open reference video
        </a>
      ) : null}

      <ExerciseForm
        exercise={{
          id: exercise.id,
          name: exercise.name,
          description: exercise.description,
          movementCategory: exercise.movement_category,
          equipment: exercise.equipment,
          demoUrl: exercise.demo_url,
        }}
      />

      <section className="border-border flex flex-col gap-3 border-t pt-6">
        <h2 className="font-display text-xl font-extrabold uppercase">
          Delete
        </h2>
        <p className="text-muted text-sm">
          This removes the exercise from your library.
        </p>
        <DeleteExerciseForm exerciseId={exercise.id} />
      </section>
    </div>
  );
}

export default function EditExercisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main>
      <Suspense fallback={<p className="text-muted">Loading exercise…</p>}>
        <EditExerciseContent params={params} />
      </Suspense>
    </main>
  );
}
