"use client";

import { useState } from "react";

import {
  quantityStep,
  quantityUnits,
  type LoadUnit,
  type QuantityUnit,
} from "@/features/routines/validation";

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
};

type MovementSheetProps = {
  open: boolean;
  exercises: LibraryExerciseOption[];
  preferredLoadUnit: LoadUnit;
  onClose: () => void;
  onAdd: (movement: MovementDraft) => void;
};

export function MovementSheet({
  open,
  exercises,
  preferredLoadUnit,
  onClose,
  onAdd,
}: MovementSheetProps) {
  if (!open) {
    return null;
  }

  return (
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
}: Omit<MovementSheetProps, "open">) {
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
            onClick={onClose}
            className="border-border text-ink inline-flex min-h-12 min-w-12 items-center justify-center rounded-md border text-lg font-semibold"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {selected?.demoUrl ? (
          <div className="border-border bg-raised rounded-lg border p-3">
            <p className="text-muted text-xs font-semibold uppercase">
              Reference video (YouTube or Vimeo)
            </p>
            <a
              href={selected.demoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent mt-1 block break-all text-sm font-semibold underline-offset-2 hover:underline"
            >
              {selected.demoUrl}
            </a>
          </div>
        ) : (
          <p className="text-muted text-sm">
            Pick a movement with a demo link to preview the reference video here.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm font-semibold">Your movements</p>
          {exercises.length === 0 ? (
            <p className="border-border bg-raised text-muted rounded-lg border px-4 py-6 text-sm">
              No exercises yet. Create one in your library first.
            </p>
          ) : (
            <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
              {exercises.map((exercise) => {
                const on = pickId === exercise.id;
                return (
                  <li key={exercise.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPickId(exercise.id);
                        setQuantity(10);
                        setUnit("reps");
                        setLoad(0);
                      }}
                      className={`flex min-h-14 w-full flex-col items-start justify-center rounded-lg border px-4 py-3 text-left ${
                        on
                          ? "border-accent bg-raised"
                          : "border-raised bg-raised"
                      }`}
                    >
                      <span className="font-semibold">{exercise.name}</span>
                      <span className="text-muted text-xs">
                        {exercise.equipment}
                        {exercise.demoUrl ? " · Video" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm font-semibold">Quantity</p>
          <div className="flex flex-wrap gap-2">
            {quantityUnits.map((option) => {
              const on = unit === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setUnit(option);
                    setQuantity(option === "m" ? 400 : option === "min" ? 5 : 10);
                  }}
                  className={`inline-flex min-h-12 min-w-14 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="border-border inline-flex min-h-12 min-w-12 items-center justify-center rounded-md border text-xl font-semibold"
              onClick={() => setQuantity(Math.max(step, quantity - step))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="font-display min-w-24 text-center text-2xl font-extrabold">
              {quantity} {unit}
            </span>
            <button
              type="button"
              className="border-border inline-flex min-h-12 min-w-12 items-center justify-center rounded-md border text-xl font-semibold"
              onClick={() => setQuantity(quantity + step)}
              aria-label="Increase quantity"
            >
              ＋
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm font-semibold">
            Load ({preferredLoadUnit})
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="border-border inline-flex min-h-12 min-w-12 items-center justify-center rounded-md border text-xl font-semibold"
              onClick={() => setLoad(Math.max(0, load - 2.5))}
              aria-label="Decrease load"
            >
              −
            </button>
            <span className="font-display min-w-24 text-center text-2xl font-extrabold">
              {load > 0 ? `${load} ${preferredLoadUnit}` : "No load"}
            </span>
            <button
              type="button"
              className="border-border inline-flex min-h-12 min-w-12 items-center justify-center rounded-md border text-xl font-semibold"
              onClick={() => setLoad(load + 2.5)}
              aria-label="Increase load"
            >
              ＋
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={!selected}
          onClick={() => {
            if (!selected) {
              return;
            }
            onAdd({
              exerciseId: selected.id,
              exerciseName: selected.name,
              demoUrl: selected.demoUrl,
              quantity,
              quantityUnit: unit,
              loadValue: load > 0 ? load : null,
              loadUnit: load > 0 ? preferredLoadUnit : null,
            });
          }}
          className={`min-h-12 rounded-md px-4 font-semibold disabled:opacity-60 ${
            selected
              ? "bg-accent text-ground"
              : "bg-border text-ink"
          }`}
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
