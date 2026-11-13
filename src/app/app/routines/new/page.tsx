import { Suspense } from "react";

import { AiDraftBuilderBootstrap } from "@/features/ai-coach/components/ai-draft-builder-bootstrap";
import { listOwnExercises } from "@/features/exercises/queries";
import { getOwnProfile } from "@/features/profiles/queries";

type NewRoutinePageProps = {
  searchParams: Promise<{ from?: string }>;
};

async function NewRoutineContent({
  searchParams,
}: {
  searchParams: NewRoutinePageProps["searchParams"];
}) {
  const params = await searchParams;
  const fromAiCoach = params.from === "ai-coach";

  const [exercises, profile] = await Promise.all([
    listOwnExercises(),
    getOwnProfile(),
  ]);

  return (
    <AiDraftBuilderBootstrap
      enabled={fromAiCoach}
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

export default function NewRoutinePage({ searchParams }: NewRoutinePageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading builder…</p>}>
      <NewRoutineContent searchParams={searchParams} />
    </Suspense>
  );
}
