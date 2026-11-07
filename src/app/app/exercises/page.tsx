import { Suspense } from "react";
import Link from "next/link";

import { listOwnExercises } from "@/features/exercises/queries";
import { movementCategoryLabels } from "@/features/exercises/validation";

async function ExerciseList() {
  let exercises: Awaited<ReturnType<typeof listOwnExercises>> = [];
  try {
    exercises = await listOwnExercises();
  } catch {
    return (
      <p className="text-sm text-[#ff8f6b]" role="alert">
        Could not load exercises.
      </p>
    );
  }

  if (exercises.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-lg border px-4 py-6">
        No exercises yet. Create one to start your library.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {exercises.map((exercise) => (
        <li key={exercise.id}>
          <Link
            href={`/app/exercises/${exercise.id}`}
            className="border-border bg-surface hover:border-accent flex min-h-14 flex-col justify-center gap-1 rounded-lg border px-4 py-3"
          >
            <span className="font-semibold">{exercise.name}</span>
            <span className="text-muted text-xs">
              {movementCategoryLabels[exercise.movement_category]} ·{" "}
              {exercise.equipment}
              {exercise.demo_url ? " · Video" : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function ExercisesPageContent() {
  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm font-semibold uppercase">Library</p>
          <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
            Exercises
          </h1>
          <p className="text-muted">
            Movements you can reuse when routines arrive. Demo links stay on
            YouTube or Vimeo.
          </p>
        </div>
        <Link
          href="/app/exercises/new"
          className="bg-accent text-ground inline-flex min-h-12 items-center justify-center rounded-md px-4 font-semibold"
        >
          New exercise
        </Link>
      </header>
      <ExerciseList />
    </main>
  );
}

export default function ExercisesPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading exercises…</p>}>
      <ExercisesPageContent />
    </Suspense>
  );
}
