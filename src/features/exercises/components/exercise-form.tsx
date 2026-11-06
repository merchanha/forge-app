"use client";

import { useActionState } from "react";

import {
  createExerciseAction,
  updateExerciseAction,
  type ExerciseActionState,
} from "@/features/exercises/actions";
import {
  movementCategories,
  movementCategoryLabels,
  type MovementCategory,
} from "@/features/exercises/validation";
import { SubmitButton } from "@/shared/ui/submit-button";
import { TextArea } from "@/shared/ui/text-area";
import { TextField } from "@/shared/ui/text-field";

const initialState: ExerciseActionState = { error: null, success: false };

const fieldClassName =
  "border-border bg-raised text-ink min-h-12 rounded-md border px-4 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forge-accent)]";

type ExerciseFormProps = {
  exercise?: {
    id: string;
    name: string;
    description: string;
    movementCategory: MovementCategory;
    equipment: string;
    demoUrl: string | null;
  };
};

export function ExerciseForm({ exercise }: ExerciseFormProps) {
  const action = exercise ? updateExerciseAction : createExerciseAction;
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {exercise ? <input type="hidden" name="id" value={exercise.id} /> : null}

      <TextField
        id="name"
        name="name"
        label="Name"
        defaultValue={exercise?.name ?? ""}
        required
        maxLength={80}
      />

      <TextArea
        id="description"
        name="description"
        label="Description"
        defaultValue={exercise?.description ?? ""}
        maxLength={500}
        rows={4}
      />

      <label className="flex flex-col gap-2" htmlFor="movementCategory">
        <span className="text-muted text-sm font-semibold">
          Movement category
        </span>
        <select
          id="movementCategory"
          name="movementCategory"
          defaultValue={exercise?.movementCategory ?? "strength"}
          required
          className={fieldClassName}
        >
          {movementCategories.map((category) => (
            <option key={category} value={category}>
              {movementCategoryLabels[category]}
            </option>
          ))}
        </select>
      </label>

      <TextField
        id="equipment"
        name="equipment"
        label="Equipment"
        defaultValue={exercise?.equipment ?? ""}
        required
        maxLength={40}
        placeholder="Barbell, rig, bodyweight"
      />

      <TextField
        id="demoUrl"
        name="demoUrl"
        label="Reference video (YouTube or Vimeo)"
        type="url"
        inputMode="url"
        defaultValue={exercise?.demoUrl ?? ""}
        maxLength={300}
        placeholder="Paste an https link"
        autoComplete="off"
      />

      {state.error ? (
        <p className="text-sm text-[#ff8f6b]" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-success text-sm" role="status">
          Exercise saved.
        </p>
      ) : null}

      <SubmitButton
        idleLabel={exercise ? "Save exercise" : "Create exercise"}
        pendingLabel="Saving…"
      />
    </form>
  );
}
