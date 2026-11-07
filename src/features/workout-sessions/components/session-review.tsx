import Link from "next/link";

import {
  formatConfigSummary,
  workoutFormatLabels,
  type FormatConfigMap,
  type WorkoutFormat,
} from "@/features/routines/validation";
import type { WorkoutSessionDetail } from "@/features/workout-sessions/queries";
import { formatClockMs } from "@/features/workout-sessions/timer";
import type { SectionResult } from "@/features/workout-sessions/validation";
import { formatUtcDateTime } from "@/shared/datetime/format";

function resultSummary(result: SectionResult): string {
  switch (result.format) {
    case "amrap":
      return `${result.rounds} rounds + ${result.additionalReps} reps`;
    case "for_time":
      return result.completionMs == null
        ? result.capped
          ? "Capped"
          : "No time"
        : formatClockMs(result.completionMs);
    case "strength": {
      const done = result.sets.filter((set) => set.completed).length;
      return `${done}/${result.sets.length} sets`;
    }
    case "custom":
      return [
        result.durationMs != null ? formatClockMs(result.durationMs) : null,
        result.notes || null,
      ]
        .filter(Boolean)
        .join(" · ") || "Logged";
    case "running":
      return [
        result.distanceMeters != null ? `${result.distanceMeters} m` : null,
        result.durationMs != null ? formatClockMs(result.durationMs) : null,
        result.notes || null,
      ]
        .filter(Boolean)
        .join(" · ") || "Logged";
    default:
      return result.notes?.trim() ? result.notes : "Completed";
  }
}

export function SessionReview({ session }: { session: WorkoutSessionDetail }) {
  const resultsByIndex = new Map(
    session.sectionResults.map((row) => [row.sectionIndex, row]),
  );

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div>
        <p className="text-muted text-xs font-semibold tracking-wide uppercase">
          Workout complete
        </p>
        <h1 className="font-display mt-1 text-4xl font-extrabold uppercase">
          {session.snapshot.name}
        </h1>
        <p className="text-muted mt-2 text-sm">
          Saved from the session snapshot. Editing the routine template later
          will not change this result.
        </p>
        <p className="text-muted mt-1 text-sm">
          Scaling: {session.scaling === "rx" ? "Rx" : "Scaled"}
          {session.completedAt
            ? ` · Finished ${formatUtcDateTime(session.completedAt)}`
            : null}
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {session.snapshot.sections.map((section, index) => {
          const row = resultsByIndex.get(index);
          return (
            <li
              key={`${section.name}-${index}`}
              className="border-border bg-surface rounded-lg border px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-extrabold uppercase">
                    {index + 1} · {section.name}
                  </p>
                  <p className="text-muted text-xs">
                    {workoutFormatLabels[section.format]} ·{" "}
                    {formatConfigSummary(
                      section.format,
                      section.formatConfig as FormatConfigMap[WorkoutFormat],
                    )}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {row ? resultSummary(row.result) : "No result"}
                </p>
              </div>
              {section.exercises.length > 0 ? (
                <ul className="text-muted mt-2 flex flex-col gap-1 text-sm">
                  {section.exercises.map((exercise) => (
                    <li key={`${exercise.exerciseId}-${exercise.exerciseName}`}>
                      {exercise.exerciseName}
                      {exercise.quantity
                        ? ` · ${exercise.quantity} ${exercise.quantityUnit}`
                        : null}
                      {exercise.loadValue != null && exercise.loadUnit
                        ? ` @ ${exercise.loadValue} ${exercise.loadUnit}`
                        : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      {session.notes ? (
        <p className="border-border bg-surface rounded-lg border px-4 py-3 text-sm">
          {session.notes}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {session.routineId ? (
          <Link
            href={`/app/routines/${session.routineId}`}
            className="border-border inline-flex min-h-12 items-center justify-center rounded-md border font-semibold"
          >
            Back to routine
          </Link>
        ) : null}
        <Link
          href="/app/routines"
          className="bg-accent text-ground inline-flex min-h-12 items-center justify-center rounded-md font-semibold"
        >
          My Training
        </Link>
      </div>
    </div>
  );
}
