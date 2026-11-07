"use client";

import { useState, useTransition } from "react";

import { ensureOwnedExerciseAction } from "@/features/exercises/actions";
import {
  formatPaceLabel,
  formatQuantityLabel,
  quantityStep,
  quantityUnits,
  runningQuantityUnits,
  type HrZone,
  type LoadUnit,
  type QuantityUnit,
} from "@/features/routines/validation";
import {
  runSegmentPresets,
  type RunSegmentPreset,
} from "@/features/routines/lib/run-segments";

export type LibraryExerciseOption = {
  id: string;
  name: string;
  equipment: string;
  demoUrl: string | null;
};

export type MovementDraft = {
  exerciseId: string;
  exerciseName: string;
  demoUrl: string | null;
  quantity: number;
  quantityUnit: QuantityUnit;
  loadValue: number | null;
  loadUnit: LoadUnit | null;
  targetPaceSecondsPerKm: number | null;
  hrZone: HrZone | null;
  segmentRepeats: number | null;
  notes: string;
};

type MovementSheetProps = {
  open: boolean;
  mode: "standard" | "running";
  exercises: LibraryExerciseOption[];
  preferredLoadUnit: LoadUnit;
  onClose: () => void;
  onAdd: (movement: MovementDraft) => void;
  onExerciseEnsured?: (exercise: LibraryExerciseOption) => void;
};

export function MovementSheet({
  open,
  mode,
  exercises,
  preferredLoadUnit,
  onClose,
  onAdd,
  onExerciseEnsured,
}: MovementSheetProps) {
  if (!open) {
    return null;
  }

  return mode === "running" ? (
    <RunningSegmentSheetInner
      exercises={exercises}
      onClose={onClose}
      onAdd={onAdd}
      onExerciseEnsured={onExerciseEnsured}
    />
  ) : (
    <MovementSheetInner
      exercises={exercises}
      preferredLoadUnit={preferredLoadUnit}
      onClose={onClose}
      onAdd={onAdd}
    />
  );
}

function MovementSheetInner({
  exercises,
  preferredLoadUnit,
  onClose,
  onAdd,
}: {
  exercises: LibraryExerciseOption[];
  preferredLoadUnit: LoadUnit;
  onClose: () => void;
  onAdd: (movement: MovementDraft) => void;
}) {
  const [pickId, setPickId] = useState<string | null>(
    exercises[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(10);
  const [unit, setUnit] = useState<QuantityUnit>("reps");
  const [load, setLoad] = useState(0);

  const selected = exercises.find((exercise) => exercise.id === pickId) ?? null;
  const step = quantityStep[unit];
  const addLabel = selected
    ? `Add ${selected.name} · ${quantity} ${unit}${
        load > 0 ? ` @ ${load} ${preferredLoadUnit}` : ""
      }`
    : "Pick a movement";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close movement sheet"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="movement-sheet-title"
        className="border-border bg-surface relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-xl border p-4 sm:rounded-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="movement-sheet-title"
            className="font-display text-2xl font-extrabold uppercase"
          >
            Add movement
          </h2>
          <button
            type="button"
            className="text-muted inline-flex size-12 items-center justify-center text-xl"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {exercises.length === 0 ? (
          <p className="text-muted text-sm">
            Create an exercise in your library first.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {exercises.map((exercise) => {
              const on = pickId === exercise.id;
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPickId(exercise.id);
                      setUnit("reps");
                      setQuantity(10);
                      setLoad(0);
                    }}
                    className={`flex min-h-14 w-full flex-col items-start justify-center rounded-xl border px-4 py-3 text-left ${
                      on
                        ? "border-accent bg-raised"
                        : "border-transparent bg-raised/60"
                    }`}
                  >
                    <span className="font-semibold">{exercise.name}</span>
                    <span className="text-muted text-sm">
                      {exercise.equipment}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Quantity</p>
          <div className="flex flex-wrap gap-2">
            {quantityUnits
              .filter((option) => option !== "km")
              .map((option) => {
                const on = unit === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setUnit(option);
                      setQuantity(
                        option === "m" ? 400 : option === "min" ? 5 : 10,
                      );
                    }}
                    className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
                      on
                        ? "border-ink bg-ink text-ground"
                        : "border-border bg-surface text-ink"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
          </div>
          <div className="border-border bg-ground flex items-center rounded-xl border">
            <button
              type="button"
              className="inline-flex size-12 items-center justify-center text-xl"
              aria-label="Decrease quantity"
              onClick={() =>
                setQuantity((value) => Math.max(step, value - step))
              }
            >
              −
            </button>
            <span className="flex-1 text-center text-base font-bold">
              {quantity} {unit}
            </span>
            <button
              type="button"
              className="inline-flex size-12 items-center justify-center text-xl"
              aria-label="Increase quantity"
              onClick={() => setQuantity((value) => value + step)}
            >
              ＋
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Load</p>
          <div className="border-border bg-ground flex items-center rounded-xl border">
            <button
              type="button"
              className="inline-flex size-12 items-center justify-center text-xl"
              aria-label="Decrease load"
              onClick={() => setLoad((value) => Math.max(0, value - 2.5))}
            >
              −
            </button>
            <span className="flex-1 text-center text-base font-bold">
              {load > 0 ? `${load} ${preferredLoadUnit}` : "No load"}
            </span>
            <button
              type="button"
              className="inline-flex size-12 items-center justify-center text-xl"
              aria-label="Increase load"
              onClick={() => setLoad((value) => value + 2.5)}
            >
              ＋
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={!selected}
          className={`inline-flex min-h-14 items-center justify-center rounded-2xl px-4 text-[17px] font-bold ${
            selected
              ? "bg-accent text-ground"
              : "bg-raised text-muted"
          }`}
          onClick={() => {
            if (!selected) return;
            onAdd({
              exerciseId: selected.id,
              exerciseName: selected.name,
              demoUrl: selected.demoUrl,
              quantity,
              quantityUnit: unit,
              loadValue: load > 0 ? load : null,
              loadUnit: load > 0 ? preferredLoadUnit : null,
              targetPaceSecondsPerKm: null,
              hrZone: null,
              segmentRepeats: null,
              notes: "",
            });
            onClose();
          }}
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}

function RunningSegmentSheetInner({
  exercises,
  onClose,
  onAdd,
  onExerciseEnsured,
}: {
  exercises: LibraryExerciseOption[];
  onClose: () => void;
  onAdd: (movement: MovementDraft) => void;
  onExerciseEnsured?: (exercise: LibraryExerciseOption) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [pick, setPick] = useState<RunSegmentPreset | null>(
    runSegmentPresets[0] ?? null,
  );
  const [quantity, setQuantity] = useState(runSegmentPresets[0]?.quantity ?? 5);
  const [unit, setUnit] = useState<QuantityUnit>(
    runSegmentPresets[0]?.quantityUnit ?? "km",
  );
  const [pace, setPace] = useState<number | null>(
    runSegmentPresets[0]?.targetPaceSecondsPerKm ?? null,
  );
  const [zone, setZone] = useState<HrZone | null>(
    runSegmentPresets[0]?.hrZone ?? null,
  );
  const [repeats, setRepeats] = useState<number | null>(
    runSegmentPresets[0]?.segmentRepeats ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  const step = quantityStep[unit];
  const addLabel = pick
    ? `Add ${pick.name} · ${
        repeats ? `${repeats} × ` : ""
      }${formatQuantityLabel(quantity, unit)}${
        pace != null ? ` · ${formatPaceLabel(pace)}` : ""
      }`
    : "Pick a run segment";

  function selectPreset(preset: RunSegmentPreset) {
    setPick(preset);
    setQuantity(preset.quantity);
    setUnit(preset.quantityUnit);
    setPace(preset.targetPaceSecondsPerKm);
    setZone(preset.hrZone);
    setRepeats(preset.segmentRepeats);
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close run segments sheet"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="run-segments-title"
        className="border-border bg-surface relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-xl border p-4 sm:rounded-xl"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="run-segments-title"
            className="font-display text-2xl font-extrabold uppercase"
          >
            Run segments
          </h2>
          <button
            type="button"
            className="text-muted inline-flex size-12 items-center justify-center text-xl"
            aria-label="Close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <ul className="flex flex-col gap-2">
          {runSegmentPresets.map((preset) => {
            const on = pick?.name === preset.name;
            return (
              <li key={preset.name}>
                <button
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className={`flex min-h-14 w-full flex-col items-start justify-center rounded-xl border px-4 py-3 text-left ${
                    on
                      ? "border-accent bg-raised"
                      : "border-transparent bg-raised/60"
                  }`}
                >
                  <span className="font-semibold">{preset.name}</span>
                  <span className="text-muted text-sm">
                    {preset.hint} ·{" "}
                    {preset.segmentRepeats
                      ? `${preset.segmentRepeats} × `
                      : ""}
                    {formatQuantityLabel(preset.quantity, preset.quantityUnit)}
                    {preset.targetPaceSecondsPerKm != null
                      ? ` · ${formatPaceLabel(preset.targetPaceSecondsPerKm)}`
                      : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">Distance or time</p>
          <div className="flex flex-wrap gap-2">
            {runningQuantityUnits.map((option) => {
              const on = unit === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setUnit(option);
                    setQuantity(
                      option === "km" ? 5 : option === "m" ? 400 : 10,
                    );
                  }}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
                    on
                      ? "border-ink bg-ink text-ground"
                      : "border-border bg-surface text-ink"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <div className="border-border bg-ground flex items-center rounded-xl border">
            <button
              type="button"
              className="inline-flex size-12 items-center justify-center text-xl"
              aria-label="Decrease quantity"
              onClick={() =>
                setQuantity((value) => Math.max(step, value - step))
              }
            >
              −
            </button>
            <span className="flex-1 text-center text-base font-bold">
              {formatQuantityLabel(quantity, unit)}
            </span>
            <button
              type="button"
              className="inline-flex size-12 items-center justify-center text-xl"
              aria-label="Increase quantity"
              onClick={() => setQuantity((value) => value + step)}
            >
              ＋
            </button>
          </div>
        </div>

        {pace != null ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Target pace</p>
            <div className="border-border bg-ground flex items-center rounded-xl border">
              <button
                type="button"
                className="inline-flex size-12 items-center justify-center text-xl"
                aria-label="Faster target pace"
                onClick={() => setPace((value) => Math.max(150, (value ?? 300) - 5))}
              >
                −
              </button>
              <span className="flex-1 text-center text-base font-bold">
                {formatPaceLabel(pace)}
              </span>
              <button
                type="button"
                className="inline-flex size-12 items-center justify-center text-xl"
                aria-label="Slower target pace"
                onClick={() => setPace((value) => Math.min(1800, (value ?? 300) + 5))}
              >
                ＋
              </button>
            </div>
          </div>
        ) : null}

        {repeats != null ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Repeats</p>
            <div className="border-border bg-ground flex items-center rounded-xl border">
              <button
                type="button"
                className="inline-flex size-12 items-center justify-center text-xl"
                aria-label="Fewer repeats"
                onClick={() =>
                  setRepeats((value) => Math.max(1, (value ?? 1) - 1))
                }
              >
                −
              </button>
              <span className="flex-1 text-center text-base font-bold">
                {repeats} ×
              </span>
              <button
                type="button"
                className="inline-flex size-12 items-center justify-center text-xl"
                aria-label="More repeats"
                onClick={() =>
                  setRepeats((value) => Math.min(100, (value ?? 1) + 1))
                }
              >
                ＋
              </button>
            </div>
          </div>
        ) : null}

        {zone ? (
          <p className="text-muted text-sm font-semibold">Heart-rate {zone}</p>
        ) : null}

        {error ? (
          <p className="text-sm text-[#ff8f6b]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!pick || pending}
          className={`inline-flex min-h-14 items-center justify-center rounded-2xl px-4 text-[17px] font-bold ${
            pick ? "bg-accent text-ground" : "bg-raised text-muted"
          }`}
          onClick={() => {
            if (!pick) return;
            startTransition(async () => {
              const existing = exercises.find(
                (exercise) =>
                  exercise.name.toLowerCase() === pick.name.toLowerCase(),
              );
              let resolved = existing ?? null;
              if (!resolved) {
                const created = await ensureOwnedExerciseAction({
                  name: pick.name,
                  description: pick.description,
                  movementCategory: pick.movementCategory,
                  equipment: pick.equipment,
                });
                if (!created.ok) {
                  setError(created.error);
                  return;
                }
                resolved = {
                  id: created.id,
                  name: created.name,
                  equipment: pick.equipment,
                  demoUrl: created.demoUrl,
                };
                onExerciseEnsured?.(resolved);
              }

              onAdd({
                exerciseId: resolved.id,
                exerciseName: resolved.name,
                demoUrl: resolved.demoUrl,
                quantity,
                quantityUnit: unit,
                loadValue: null,
                loadUnit: null,
                targetPaceSecondsPerKm: pace,
                hrZone: zone,
                segmentRepeats: repeats,
                notes: "",
              });
              onClose();
            });
          }}
        >
          {pending ? "Adding…" : addLabel}
        </button>
      </div>
    </div>
  );
}
