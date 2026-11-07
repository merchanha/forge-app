"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  startWorkoutSessionAction,
  type SessionActionState,
} from "@/features/workout-sessions/actions";

const initialState: SessionActionState = { error: null, success: false };

function Label({ idle }: { idle: string }) {
  const { pending } = useFormStatus();
  return <>{pending ? "Starting…" : idle}</>;
}

export function StartWorkoutButton({
  routineId,
  className,
  label = "Start workout",
}: {
  routineId: string;
  className?: string;
  label?: string;
}) {
  const [state, action] = useActionState(
    startWorkoutSessionAction,
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="routineId" value={routineId} />
      <button
        type="submit"
        className={
          className ??
          "bg-accent text-ground inline-flex min-h-12 items-center justify-center rounded-md px-4 font-semibold"
        }
      >
        <Label idle={label} />
      </button>
      {state.error ? (
        <p className="text-sm text-[#ff8f6b]" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
