"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { resolveAiDraftForBuilderAction } from "@/features/ai-coach/actions";
import {
  clearAiCoachDraftFromSession,
  readAiCoachDraftFromSession,
  takeBuilderInitialFromSession,
  writeBuilderInitialToSession,
} from "@/features/ai-coach/lib/draft-storage";
import {
  RoutineBuilder,
  type RoutineBuilderInitial,
} from "@/features/routines/components/routine-builder";
import type { LibraryExerciseOption } from "@/features/routines/components/movement-sheet";
import type { LoadUnit } from "@/features/routines/validation";

type AiDraftBuilderBootstrapProps = {
  preferredLoadUnit: LoadUnit;
  exercises: LibraryExerciseOption[];
  enabled: boolean;
};

export function AiDraftBuilderBootstrap({
  preferredLoadUnit,
  exercises,
  enabled,
}: AiDraftBuilderBootstrapProps) {
  const router = useRouter();
  const [initial, setInitial] = useState<RoutineBuilderInitial | null>(() =>
    enabled ? null : takeBuilderInitialFromSession(),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function load() {
      const draft = readAiCoachDraftFromSession();
      if (!draft) {
        if (!cancelled) {
          setError("No AI draft found. Ask the coach again.");
          setLoading(false);
        }
        return;
      }

      const resolved = await resolveAiDraftForBuilderAction(draft);
      if (cancelled) {
        return;
      }

      if (!resolved.ok) {
        setError(resolved.error);
        setLoading(false);
        return;
      }

      clearAiCoachDraftFromSession();
      writeBuilderInitialToSession(resolved.initial);
      setInitial(resolved.initial);
      setLoading(false);
      router.replace("/app/routines/new");
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [enabled, router]);

  if (loading) {
    return <p className="text-muted">Loading AI draft…</p>;
  }

  if (enabled && (error || !initial)) {
    return (
      <p className="text-sm text-[#ff8f6b]" role="alert">
        {error ?? "Could not open this draft."}
      </p>
    );
  }

  return (
    <RoutineBuilder
      preferredLoadUnit={preferredLoadUnit}
      exercises={exercises}
      initial={initial ?? undefined}
    />
  );
}
