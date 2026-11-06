import Link from "next/link";

import { ExerciseForm } from "@/features/exercises/components/exercise-form";

export default function NewExercisePage() {
  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/app/exercises"
          className="text-muted text-sm font-semibold"
        >
          Exercises
        </Link>
        <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
          New exercise
        </h1>
      </header>
      <ExerciseForm />
    </main>
  );
}
