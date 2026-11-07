"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateCompletedSessionResultsAction,
  type PerformanceActionState,
} from "@/features/performance/actions";
import type { SessionCompareView } from "@/features/performance/queries";
import {
  formatConfigSummary,
  workoutFormatLabels,
  type FormatConfigMap,
  type WorkoutFormat,
} from "@/features/routines/validation";
import { formatClockMs } from "@/features/performance/compare";
import type { SectionResult } from "@/features/workout-sessions/validation";
import { formatUtcDateTime } from "@/shared/datetime/format";
import { TextArea } from "@/shared/ui/text-area";
import { TextField } from "@/shared/ui/text-field";

const idleState: PerformanceActionState = { error: null, success: false };

function PendingLabel({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return <>{isPending ? pending : idle}</>;
}

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

function EditableResultFields({
  result,
  onChange,
}: {
  result: SectionResult;
  onChange: (next: SectionResult) => void;
}) {
  switch (result.format) {
    case "amrap":
      return (
        <div className="grid grid-cols-2 gap-3">
          <TextField
            id={`rounds-${result.format}`}
            label="Rounds"
            type="number"
            min={0}
            value={result.rounds}
            onChange={(event) =>
              onChange({
                ...result,
                rounds: Number(event.target.value),
              })
            }
          />
          <TextField
            id={`reps-${result.format}`}
            label="Additional reps"
            type="number"
            min={0}
            value={result.additionalReps}
            onChange={(event) =>
              onChange({
                ...result,
                additionalReps: Number(event.target.value),
              })
            }
          />
        </div>
      );
    case "for_time":
      return (
        <div className="flex flex-col gap-3">
          <TextField
            id="completion-seconds"
            label="Completion time (seconds)"
            type="number"
            min={0}
            value={
              result.completionMs == null
                ? ""
                : Math.round(result.completionMs / 1000)
            }
            onChange={(event) => {
              const seconds = event.target.value;
              onChange({
                ...result,
                completionMs:
                  seconds === "" ? null : Number(seconds) * 1000,
              });
            }}
          />
          <label className="text-muted flex min-h-12 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={result.capped}
              onChange={(event) =>
                onChange({ ...result, capped: event.target.checked })
              }
              className="size-5"
            />
            Hit time cap
          </label>
        </div>
      );
    case "strength":
      return (
        <ul className="flex flex-col gap-3">
          {result.sets.map((set, index) => (
            <li
              key={set.setIndex}
              className="border-border bg-raised grid grid-cols-3 gap-2 rounded-md border p-3"
            >
              <TextField
                id={`set-reps-${index}`}
                label={`Set ${index + 1} reps`}
                type="number"
                min={0}
                value={set.reps}
                onChange={(event) => {
                  const sets = result.sets.map((row, rowIndex) =>
                    rowIndex === index
                      ? { ...row, reps: Number(event.target.value) }
                      : row,
                  );
                  onChange({ ...result, sets });
                }}
              />
              <TextField
                id={`set-load-${index}`}
                label="Load"
                type="number"
                min={0}
                step="0.5"
                value={set.loadValue ?? ""}
                onChange={(event) => {
                  const sets = result.sets.map((row, rowIndex) =>
                    rowIndex === index
                      ? {
                          ...row,
                          loadValue:
                            event.target.value === ""
                              ? null
                              : Number(event.target.value),
                        }
                      : row,
                  );
                  onChange({ ...result, sets });
                }}
              />
              <label className="text-muted flex flex-col gap-2 text-sm font-semibold">
                Unit
                <select
                  className="border-border bg-surface text-ink min-h-12 rounded-md border px-3"
                  value={set.loadUnit ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    const loadUnit: "kg" | "lb" | null =
                      value === "kg" || value === "lb" ? value : null;
                    const sets = result.sets.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, loadUnit } : row,
                    );
                    onChange({ ...result, sets });
                  }}
                >
                  <option value="">—</option>
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </label>
            </li>
          ))}
        </ul>
      );
    case "custom":
    case "emom":
    case "tabata":
    case "intervals":
    case "rounds_for_time":
    case "running":
      return (
        <TextArea
          id={`notes-${result.format}`}
          label="Section notes"
          value={"notes" in result ? (result.notes ?? "") : ""}
          onChange={(event) =>
            onChange({
              ...result,
              notes: event.target.value,
            } as SectionResult)
          }
        />
      );
    default:
      return null;
  }
}

export function SessionResultsPanel({ view }: { view: SessionCompareView }) {
  const router = useRouter();
  const { session, sectionComparisons, sessionIsPersonalRecord } = view;
  const resultsByIndex = new Map(
    session.sectionResults.map((row) => [row.sectionIndex, row]),
  );
  const comparisonByIndex = new Map(
    sectionComparisons.map((row) => [row.sectionIndex, row]),
  );

  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(session.notes);
  const [draftResults, setDraftResults] = useState<Record<number, SectionResult>>(
    () => {
      const initial: Record<number, SectionResult> = {};
      for (const row of session.sectionResults) {
        initial[row.sectionIndex] = row.result;
      }
      return initial;
    },
  );

  const [state, action] = useActionState(
    async (
      prev: PerformanceActionState,
      formData: FormData,
    ): Promise<PerformanceActionState> => {
      const next = await updateCompletedSessionResultsAction(prev, formData);
      if (next.success) {
        setEditing(false);
        router.refresh();
      }
      return next;
    },
    idleState,
  );

  const primaryComparison =
    sectionComparisons.find((row) => row.isPersonalRecord && row.current) ??
    sectionComparisons.find((row) => row.current) ??
    null;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="bg-ink text-ground rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase">
          Result
        </span>
        {session.routineId ? (
          <Link
            href={`/app/history?routineId=${session.routineId}`}
            className="border-border text-muted hover:text-ink rounded-full border px-3 py-1 text-xs font-bold tracking-wide uppercase"
          >
            History
          </Link>
        ) : (
          <Link
            href="/app/history"
            className="border-border text-muted hover:text-ink rounded-full border px-3 py-1 text-xs font-bold tracking-wide uppercase"
          >
            History
          </Link>
        )}
      </div>

      <div>
        <p className="text-muted text-xs font-semibold tracking-wide uppercase">
          Timed work
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-5xl font-extrabold uppercase">
            {primaryComparison?.current?.label ?? session.snapshot.name}
          </h1>
          {sessionIsPersonalRecord ? (
            <span className="bg-accent text-ground animate-[pop_400ms_ease-out] rounded-full px-3 py-1 text-xs font-extrabold tracking-wide uppercase">
              New PR
            </span>
          ) : null}
          {primaryComparison?.deltaLabel ? (
            <span className="rounded-full bg-[#12301F] px-3 py-1 text-sm font-semibold text-[#7BE0A4]">
              {primaryComparison.deltaLabel}
            </span>
          ) : null}
        </div>
        <p className="text-muted mt-2 text-sm">
          Saved to history. Your {session.snapshot.name} template is unchanged.
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
          const comparison = comparisonByIndex.get(index);
          const draft = draftResults[index] ?? row?.result;
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
                    {workoutFormatLabels[section.format]}
                    {comparison?.previous
                      ? ` · before ${comparison.previous.label}`
                      : ` · ${formatConfigSummary(
                          section.format,
                          section.formatConfig as FormatConfigMap[WorkoutFormat],
                        )}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-extrabold">
                    {draft ? resultSummary(draft) : "No result"}
                  </p>
                  {comparison?.deltaLabel ? (
                    <p className="text-sm font-semibold text-[#7BE0A4]">
                      {comparison.deltaLabel}
                    </p>
                  ) : null}
                  {comparison?.isPersonalRecord ? (
                    <p className="text-accent text-xs font-extrabold tracking-wide uppercase">
                      PR
                    </p>
                  ) : null}
                </div>
              </div>

              {editing && draft ? (
                <div className="mt-3">
                  <EditableResultFields
                    result={draft}
                    onChange={(next) =>
                      setDraftResults((prev) => ({ ...prev, [index]: next }))
                    }
                  />
                </div>
              ) : section.exercises.length > 0 ? (
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

      {editing ? (
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <input
            type="hidden"
            name="sectionResults"
            value={JSON.stringify(
              Object.entries(draftResults).map(([sectionIndex, result]) => ({
                sectionIndex: Number(sectionIndex),
                result,
              })),
            )}
          />
          <TextArea
            id="session-notes"
            label="Notes"
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          {state.error ? (
            <p className="text-sm text-[#ff8f6b]" role="alert">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="text-sm text-[#7BE0A4]" role="status">
              Results updated. Snapshot and template are unchanged.
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <button
              type="submit"
              className="bg-accent text-ground inline-flex min-h-12 items-center justify-center rounded-md font-semibold"
            >
              <PendingLabel idle="Save edits" pending="Saving…" />
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="border-border inline-flex min-h-12 items-center justify-center rounded-md border font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {session.notes ? (
            <div className="border-border bg-surface rounded-lg border px-4 py-3">
              <p className="text-muted text-xs">Notes</p>
              <p className="mt-1 text-sm">{session.notes}</p>
            </div>
          ) : null}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="border-border inline-flex min-h-12 items-center justify-center rounded-md border font-semibold"
            >
              Edit results
            </button>
            {session.routineId ? (
              <Link
                href={`/app/history?routineId=${session.routineId}`}
                className="border-border inline-flex min-h-12 items-center justify-center rounded-md border font-semibold"
              >
                See routine history
              </Link>
            ) : null}
            {session.routineId ? (
              <Link
                href={`/app/routines/${session.routineId}`}
                className="border-border inline-flex min-h-12 items-center justify-center rounded-md border font-semibold"
              >
                Back to routine
              </Link>
            ) : null}
            <Link
              href="/app/history"
              className="bg-accent text-ground inline-flex min-h-12 items-center justify-center rounded-md font-semibold"
            >
              Open history
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
