"use client";

import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import {
  formatConfigSummary,
  workoutFormatLabels,
  type FormatConfigMap,
  type WorkoutFormat,
} from "@/features/routines/validation";
import {
  abandonSessionAction,
  advanceSectionAction,
  completeSessionAction,
  pauseSessionAction,
  resumeSessionAction,
  saveSectionProgressAction,
  setSessionScalingAction,
  type SessionActionState,
} from "@/features/workout-sessions/actions";
import { hasLiveTimerUx } from "@/features/workout-sessions/lifecycle";
import type { WorkoutSessionDetail } from "@/features/workout-sessions/queries";
import {
  elapsedMs,
  formatClockMs,
  remainingMs,
  timerStateFromPersistence,
} from "@/features/workout-sessions/timer";
import {
  defaultSectionResult,
  type SectionResult,
  type SessionScaling,
} from "@/features/workout-sessions/validation";

const idleState: SessionActionState = { error: null, success: false };

function PendingLabel({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return <>{isPending ? pending : idle}</>;
}

function quantityLabel(unit: string, quantity: number): string {
  if (unit === "reps") {
    return String(quantity);
  }
  return `${quantity} ${unit}`;
}

function loadLabel(
  loadValue: number | null,
  loadUnit: string | null,
): string | null {
  if (loadValue == null || !loadUnit) {
    return null;
  }
  return `${loadValue} ${loadUnit}`;
}

export function LiveSession({ session }: { session: WorkoutSessionDetail }) {
  const router = useRouter();
  const section = session.snapshot.sections[session.currentSectionIndex];
  const sectionCount = session.snapshot.sections.length;
  const isLastSection = session.currentSectionIndex >= sectionCount - 1;

  const existing = session.sectionResults.find(
    (row) => row.sectionIndex === session.currentSectionIndex,
  );

  const [result, setResult] = useState<SectionResult>(() => {
    if (existing) {
      return existing.result;
    }
    if (!section) {
      return defaultSectionResult("custom");
    }
    if (section.format === "strength") {
      const config = section.formatConfig as FormatConfigMap["strength"];
      return {
        format: "strength",
        sets: Array.from({ length: config.sets }, (_, setIndex) => ({
          setIndex,
          reps: config.reps,
          loadValue: section.exercises[0]?.loadValue ?? null,
          loadUnit: section.exercises[0]?.loadUnit ?? null,
          completed: false,
        })),
      };
    }
    return defaultSectionResult(section.format);
  });

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);

  const [pauseState, pauseAction] = useActionState(
    pauseSessionAction,
    idleState,
  );
  const [resumeState, resumeAction] = useActionState(
    resumeSessionAction,
    idleState,
  );
  const [scalingState, scalingAction] = useActionState(
    setSessionScalingAction,
    idleState,
  );
  const [progressState, progressAction] = useActionState(
    saveSectionProgressAction,
    idleState,
  );
  const [advanceState, advanceAction] = useActionState(
    advanceSectionAction,
    idleState,
  );
  const [completeState, completeAction] = useActionState(
    completeSessionAction,
    idleState,
  );
  const [abandonState, abandonAction] = useActionState(
    abandonSessionAction,
    idleState,
  );

  const tick = useEffectEvent(() => {
    setNowMs(Date.now());
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      tick();
    }, 250);
    const onVisibility = () => {
      tick();
      router.refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [router]);

  if (!section) {
    return (
      <p className="text-sm text-[#ff8f6b]" role="alert">
        This session snapshot has no sections.
      </p>
    );
  }

  const timerState = timerStateFromPersistence({
    currentSectionStartedAt: session.currentSectionStartedAt,
    pausedAt: session.pausedAt,
    totalPausedMs: session.totalPausedMs,
  });
  const isPaused = session.pausedAt != null;
  const elapsed = timerState ? elapsedMs(timerState, nowMs) : 0;

  const format = section.format;

  let clockLabel = "WORK";
  let clockColor = "text-work";
  let clockDisplay = formatClockMs(elapsed);
  let scoreLine: string | null = null;

  if (format === "amrap") {
    const durationMs =
      (section.formatConfig as FormatConfigMap["amrap"]).durationSeconds * 1000;
    const remaining = timerState
      ? remainingMs(timerState, durationMs, nowMs)
      : durationMs;
    clockDisplay = formatClockMs(remaining);
    clockLabel = remaining === 0 ? "DONE" : isPaused ? "PAUSED" : "WORK";
    clockColor =
      remaining === 0 ? "text-done" : isPaused ? "text-rest" : "text-work";
    if (result.format === "amrap") {
      scoreLine = `${result.rounds} rounds + ${result.additionalReps} reps`;
    }
  } else if (format === "for_time") {
    const config = section.formatConfig as FormatConfigMap["for_time"];
    const capped =
      config.timeCapSeconds != null && elapsed >= config.timeCapSeconds * 1000;
    clockLabel = capped ? "CAP" : isPaused ? "PAUSED" : "FOR TIME";
    clockColor = capped ? "text-done" : isPaused ? "text-rest" : "text-work";
    clockDisplay = formatClockMs(elapsed);
    if (result.format === "for_time" && result.completionMs != null) {
      scoreLine = `Finished ${formatClockMs(result.completionMs)}`;
    }
  } else if (format === "custom") {
    const config = section.formatConfig as FormatConfigMap["custom"];
    if (config.timerMode === "countdown") {
      const remaining = timerState
        ? remainingMs(timerState, config.durationSeconds * 1000, nowMs)
        : config.durationSeconds * 1000;
      clockDisplay = formatClockMs(remaining);
      clockLabel = remaining === 0 ? "DONE" : isPaused ? "PAUSED" : "WORK";
      clockColor =
        remaining === 0 ? "text-done" : isPaused ? "text-rest" : "text-work";
    } else if (config.timerMode === "stopwatch") {
      clockLabel = isPaused ? "PAUSED" : "TIME";
      clockColor = isPaused ? "text-rest" : "text-work";
      clockDisplay = formatClockMs(elapsed);
    } else {
      clockLabel = "CUSTOM";
      clockColor = "text-done";
      clockDisplay = "—";
    }
  } else if (format === "strength") {
    clockLabel = isPaused ? "PAUSED" : "STRENGTH";
    clockColor = isPaused ? "text-rest" : "text-muted";
    clockDisplay = formatClockMs(elapsed);
  } else {
    clockLabel = isPaused ? "PAUSED" : workoutFormatLabels[format].toUpperCase();
    clockColor = isPaused ? "text-rest" : "text-muted";
    clockDisplay = formatClockMs(elapsed);
  }

  const currentExercise = section.exercises[0];
  const nextExercise = section.exercises[1];
  const actionError =
    pauseState.error ||
    resumeState.error ||
    scalingState.error ||
    progressState.error ||
    advanceState.error ||
    completeState.error ||
    abandonState.error;

  function bumpAmrap(kind: "round" | "rep") {
    setResult((prev) => {
      if (prev.format !== "amrap") {
        return prev;
      }
      if (kind === "round") {
        return { ...prev, rounds: prev.rounds + 1, additionalReps: 0 };
      }
      return { ...prev, additionalReps: prev.additionalReps + 1 };
    });
  }

  function markForTimeDone() {
    setResult({
      format: "for_time",
      completionMs: elapsed,
      capped: false,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
            {session.snapshot.name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold uppercase">
              {session.currentSectionIndex + 1} · {section.name}
            </h1>
            <span className="bg-accent text-ground rounded-pill px-2 py-1 text-[11px] font-extrabold">
              {workoutFormatLabels[format]}{" "}
              {formatConfigSummary(
                format,
                section.formatConfig as FormatConfigMap[WorkoutFormat],
              )}
            </span>
          </div>
        </div>

        <div className="border-border bg-surface flex rounded-[14px] border p-[3px]">
          <ScalingButton
            sessionId={session.id}
            scaling={session.scaling}
            value="rx"
            action={scalingAction}
          />
          <ScalingButton
            sessionId={session.id}
            scaling={session.scaling}
            value="scaled"
            action={scalingAction}
          />
        </div>
      </div>

      <div
        className="flex gap-1"
        aria-label={`Section ${session.currentSectionIndex + 1} of ${sectionCount}`}
      >
        {session.snapshot.sections.map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-sm ${
              index < session.currentSectionIndex
                ? "bg-ink"
                : index === session.currentSectionIndex
                  ? "bg-accent"
                  : "bg-border"
            }`}
          />
        ))}
      </div>

      <div className="flex flex-col items-center pt-1">
        <p
          className={`text-xs font-bold tracking-[0.14em] uppercase ${clockColor}`}
        >
          {clockLabel}
        </p>
        <p
          className={`font-display text-[96px] leading-[0.95] font-extrabold tabular-nums sm:text-[120px] ${clockColor}`}
          role="timer"
          aria-label={`Clock ${clockDisplay}`}
        >
          {clockDisplay}
        </p>
        {scoreLine ? (
          <p className="text-muted mt-1 text-[15px]">
            Score now <span className="text-ink font-bold">{scoreLine}</span>
          </p>
        ) : null}
      </div>

      {section.exercises.length > 0 ? (
        <div className="border-border bg-surface flex flex-col gap-1.5 rounded-lg border px-4 py-3.5">
          <p className="text-muted text-xs">
            {format === "amrap" && result.format === "amrap"
              ? `Round ${result.rounds + 1} · now`
              : "Now"}
          </p>
          <div className="flex items-center justify-between gap-2.5">
            <p className="font-display text-[30px] leading-none font-extrabold uppercase">
              {currentExercise?.exerciseName ?? "Movement"}
            </p>
            <p className="text-base font-bold">
              {currentExercise
                ? [
                    quantityLabel(
                      currentExercise.quantityUnit,
                      currentExercise.quantity,
                    ),
                    loadLabel(
                      currentExercise.loadValue,
                      currentExercise.loadUnit,
                    ),
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : null}
            </p>
          </div>
          {nextExercise ? (
            <p className="text-muted text-[13px]">
              Next: {nextExercise.exerciseName}
            </p>
          ) : session.currentSectionIndex < sectionCount - 1 ? (
            <p className="text-muted text-[13px]">
              Next: {session.snapshot.sections[session.currentSectionIndex + 1]?.name}
            </p>
          ) : null}
        </div>
      ) : null}

      {format === "amrap" && result.format === "amrap" ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="bg-accent text-ground font-display h-24 rounded-xl text-3xl font-extrabold uppercase"
            onClick={() => bumpAmrap("round")}
          >
            +1 Round
          </button>
          <button
            type="button"
            className="border-border bg-raised font-display h-24 rounded-xl border text-3xl font-extrabold uppercase"
            onClick={() => bumpAmrap("rep")}
          >
            +1 Rep
          </button>
        </div>
      ) : null}

      {format === "for_time" && result.format === "for_time" ? (
        <button
          type="button"
          className="bg-accent text-ground font-display min-h-16 rounded-xl text-2xl font-extrabold uppercase"
          onClick={markForTimeDone}
          disabled={result.completionMs != null}
        >
          {result.completionMs != null ? "Time recorded" : "Finish now"}
        </button>
      ) : null}

      {format === "strength" && result.format === "strength" ? (
        <div className="flex flex-col gap-2">
          {result.sets.map((set, index) => (
            <label
              key={set.setIndex}
              className="border-border bg-surface flex items-center gap-3 rounded-md border px-3 py-3"
            >
              <input
                type="checkbox"
                className="size-5 accent-[var(--forge-accent)]"
                checked={set.completed}
                onChange={(event) => {
                  const completed = event.target.checked;
                  setResult((prev) => {
                    if (prev.format !== "strength") {
                      return prev;
                    }
                    return {
                      ...prev,
                      sets: prev.sets.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, completed } : row,
                      ),
                    };
                  });
                }}
              />
              <span className="font-semibold">Set {index + 1}</span>
              <span className="text-muted text-sm">
                {set.reps} reps
                {set.loadValue != null && set.loadUnit
                  ? ` · ${set.loadValue} ${set.loadUnit}`
                  : ""}
              </span>
            </label>
          ))}
        </div>
      ) : null}

      {format === "custom" && result.format === "custom" ? (
        <label className="flex flex-col gap-2">
          <span className="text-muted text-sm font-semibold">Notes</span>
          <textarea
            className="border-border bg-surface min-h-24 rounded-md border px-3 py-2"
            value={result.notes}
            onChange={(event) =>
              setResult({
                format: "custom",
                durationMs: elapsed,
                notes: event.target.value,
              })
            }
          />
        </label>
      ) : null}

      {!hasLiveTimerUx(format) ? (
        <div className="border-border bg-surface rounded-lg border px-4 py-3">
          <p className="text-sm font-semibold">
            Live timer for {workoutFormatLabels[format]} comes in a later phase.
          </p>
          <p className="text-muted mt-1 text-sm">
            Track the section manually, then advance or finish.
          </p>
        </div>
      ) : null}

      <div className="flex gap-2.5">
        <form action={isPaused ? resumeAction : pauseAction} className="flex-1">
          <input type="hidden" name="sessionId" value={session.id} />
          <button
            type="submit"
            className="border-border bg-raised min-h-14 w-full rounded-md border text-base font-bold"
          >
            <PendingLabel
              idle={isPaused ? "Resume" : "Pause"}
              pending="Saving…"
            />
          </button>
        </form>

        {currentExercise?.demoUrl ? (
          <button
            type="button"
            className="border-border bg-raised min-h-14 min-w-20 rounded-md border text-sm font-bold"
            onClick={() => setVideoOpen(true)}
          >
            Video
          </button>
        ) : null}

        <button
          type="button"
          className="border-border bg-raised text-ink min-h-14 min-w-14 rounded-md border text-lg font-bold"
          aria-label="End workout"
          onClick={() => setConfirmEnd(true)}
        >
          ■
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <form action={progressAction}>
          <input type="hidden" name="sessionId" value={session.id} />
          <input
            type="hidden"
            name="sectionIndex"
            value={session.currentSectionIndex}
          />
          <input type="hidden" name="result" value={JSON.stringify(result)} />
          <input type="hidden" name="elapsedMs" value={elapsed} />
          <input
            type="hidden"
            name="sectionStartedAt"
            value={session.currentSectionStartedAt ?? ""}
          />
          <button
            type="submit"
            className="border-border text-muted min-h-12 w-full rounded-md border text-sm font-semibold"
          >
            <PendingLabel idle="Save progress" pending="Saving…" />
          </button>
        </form>

        {!isLastSection ? (
          <form action={advanceAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <input
              type="hidden"
              name="fromSectionIndex"
              value={session.currentSectionIndex}
            />
            <input type="hidden" name="result" value={JSON.stringify(result)} />
            <input type="hidden" name="elapsedMs" value={elapsed} />
            <button
              type="submit"
              className="bg-accent text-ground min-h-12 w-full rounded-md font-semibold"
            >
              <PendingLabel idle="Next section" pending="Advancing…" />
            </button>
          </form>
        ) : (
          <form action={completeAction}>
            <input type="hidden" name="sessionId" value={session.id} />
            <input type="hidden" name="notes" value="" />
            <input
              type="hidden"
              name="finalResult"
              value={JSON.stringify(
                result.format === "custom"
                  ? { ...result, durationMs: elapsed }
                  : result.format === "for_time" && result.completionMs == null
                    ? { ...result, completionMs: elapsed, capped: false }
                    : result,
              )}
            />
            <input type="hidden" name="finalElapsedMs" value={elapsed} />
            <button
              type="submit"
              className="bg-accent text-ground min-h-12 w-full rounded-md font-semibold"
            >
              <PendingLabel idle="Finish & review" pending="Saving…" />
            </button>
          </form>
        )}
      </div>

      {actionError ? (
        <p className="text-sm text-[#ff8f6b]" role="alert">
          {actionError}
        </p>
      ) : null}

      {videoOpen && currentExercise?.demoUrl ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="border-border bg-surface w-full max-w-md rounded-xl border p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-semibold">{currentExercise.exerciseName}</p>
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-md"
                onClick={() => setVideoOpen(false)}
                aria-label="Close video"
              >
                ✕
              </button>
            </div>
            <p className="text-muted mb-3 text-sm">
              The clock keeps running behind this sheet.
            </p>
            <a
              href={currentExercise.demoUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-accent text-ground inline-flex min-h-12 w-full items-center justify-center rounded-md font-semibold"
            >
              Open demo
            </a>
          </div>
        </div>
      ) : null}

      {confirmEnd ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="border-border bg-surface flex w-full max-w-md flex-col gap-3 rounded-xl border p-4">
            <h2 className="font-display text-2xl font-extrabold uppercase">
              End this workout?
            </h2>
            <p className="text-muted text-sm">
              The clock is paused on your next action. Review and save what you
              have, or keep going. Discard abandons this session without a
              completed result.
            </p>
            <form action={completeAction} className="flex flex-col gap-2">
              <input type="hidden" name="sessionId" value={session.id} />
              <input type="hidden" name="notes" value="" />
              <input
                type="hidden"
                name="finalResult"
                value={JSON.stringify(result)}
              />
              <input type="hidden" name="finalElapsedMs" value={elapsed} />
              <button
                type="submit"
                className="bg-accent text-ground min-h-12 rounded-md font-semibold"
              >
                <PendingLabel idle="End and review" pending="Saving…" />
              </button>
            </form>
            <form action={abandonAction}>
              <input type="hidden" name="sessionId" value={session.id} />
              <button
                type="submit"
                className="border-border min-h-12 w-full rounded-md border font-semibold text-[#ff8f6b]"
              >
                <PendingLabel idle="Discard workout" pending="Discarding…" />
              </button>
            </form>
            <button
              type="button"
              className="border-border min-h-12 rounded-md border font-semibold"
              onClick={() => setConfirmEnd(false)}
            >
              Keep going
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScalingButton({
  sessionId,
  scaling,
  value,
  action,
}: {
  sessionId: string;
  scaling: SessionScaling;
  value: SessionScaling;
  action: (payload: FormData) => void;
}) {
  const active = scaling === value;
  return (
    <form action={action}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="scaling" value={value} />
      <button
        type="submit"
        aria-pressed={active}
        className={`min-h-11 min-w-14 rounded-[11px] text-sm font-bold ${
          active ? "bg-ink text-ground" : "bg-transparent text-muted"
        }`}
      >
        {value === "rx" ? "Rx" : "Scaled"}
      </button>
    </form>
  );
}
