"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteExerciseAction,
  type ExerciseActionState,
} from "@/features/exercises/actions";

const initialState: ExerciseActionState = { error: null, success: false };

function DeleteSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="border-border text-ink min-h-12 w-full rounded-md border px-4 font-semibold disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete exercise"}
    </button>
  );
}

type DeleteExerciseFormProps = {
  exerciseId: string;
};

export function DeleteExerciseForm({ exerciseId }: DeleteExerciseFormProps) {
  const [state, formAction] = useActionState(
    deleteExerciseAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={exerciseId} />
      <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          name="confirmDelete"
          value="yes"
          required
          className="accent-accent size-5"
        />
        Delete this exercise permanently
      </label>
      {state.error ? (
        <p className="text-sm text-[#ff8f6b]" role="alert">
          {state.error}
        </p>
      ) : null}
      <DeleteSubmit />
    </form>
  );
}
