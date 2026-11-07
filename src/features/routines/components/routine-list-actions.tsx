"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  archiveRoutineAction,
  deleteRoutineAction,
  duplicateRoutineAction,
  toggleFavoriteRoutineAction,
  type RoutineActionState,
} from "@/features/routines/actions";
import { StartWorkoutButton } from "@/features/workout-sessions/components/start-workout-button";

const initialState: RoutineActionState = { error: null, success: false };

type RoutineListActionsProps = {
  routineId: string;
  routineName: string;
  isFavorite: boolean;
  isArchived: boolean;
};

function PendingLabel({
  idle,
  pending,
}: {
  idle: string;
  pending: string;
}) {
  const { pending: isPending } = useFormStatus();
  return <>{isPending ? pending : idle}</>;
}

export function RoutineListActions({
  routineId,
  routineName,
  isFavorite,
  isArchived,
}: RoutineListActionsProps) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [favoriteState, favoriteAction] = useActionState(
    toggleFavoriteRoutineAction,
    initialState,
  );
  const [duplicateState, duplicateAction] = useActionState(
    duplicateRoutineAction,
    initialState,
  );
  const [archiveState, archiveAction] = useActionState(
    archiveRoutineAction,
    initialState,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteRoutineAction,
    initialState,
  );

  const error =
    favoriteState.error ||
    duplicateState.error ||
    archiveState.error ||
    deleteState.error;

  return (
    <div className="relative">
      <button
        type="button"
        className="border-border text-ink inline-flex min-h-12 min-w-12 items-center justify-center rounded-md border text-lg font-semibold"
        aria-label={`Actions for ${routineName}`}
        onClick={() => {
          setOpen((value) => !value);
          setConfirmDelete(false);
        }}
      >
        ⋯
      </button>

      {open ? (
        <div className="border-border bg-raised absolute top-14 right-0 z-20 flex w-52 flex-col gap-1 rounded-lg border p-2 shadow-lg">
          {!isArchived ? (
            <div className="px-1 pt-1">
              <StartWorkoutButton
                routineId={routineId}
                label="Start"
                className="bg-accent text-ground inline-flex min-h-11 w-full items-center justify-center rounded-md px-3 text-sm font-semibold"
              />
            </div>
          ) : null}

          <form action={favoriteAction}>
            <input type="hidden" name="id" value={routineId} />
            <input
              type="hidden"
              name="isFavorite"
              value={isFavorite ? "false" : "true"}
            />
            <button
              type="submit"
              className="hover:bg-surface min-h-11 w-full rounded-md px-3 text-left text-sm font-semibold"
            >
              <PendingLabel
                idle={isFavorite ? "Unfavorite" : "Favorite"}
                pending="Saving…"
              />
            </button>
          </form>

          <a
            href={`/app/routines/${routineId}`}
            className="hover:bg-surface inline-flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-semibold"
          >
            Edit
          </a>

          <a
            href={`/app/history?routineId=${routineId}`}
            className="hover:bg-surface inline-flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm font-semibold"
          >
            History
          </a>

          <form action={duplicateAction}>
            <input type="hidden" name="id" value={routineId} />
            <button
              type="submit"
              className="hover:bg-surface min-h-11 w-full rounded-md px-3 text-left text-sm font-semibold"
            >
              <PendingLabel idle="Duplicate" pending="Duplicating…" />
            </button>
          </form>

          <form action={archiveAction}>
            <input type="hidden" name="id" value={routineId} />
            <input
              type="hidden"
              name="restore"
              value={isArchived ? "true" : "false"}
            />
            <button
              type="submit"
              className="hover:bg-surface min-h-11 w-full rounded-md px-3 text-left text-sm font-semibold"
            >
              <PendingLabel
                idle={isArchived ? "Restore" : "Archive"}
                pending="Saving…"
              />
            </button>
          </form>

          {!confirmDelete ? (
            <button
              type="button"
              className="hover:bg-surface min-h-11 w-full rounded-md px-3 text-left text-sm font-semibold text-[#ff8f6b]"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </button>
          ) : (
            <form action={deleteAction} className="flex flex-col gap-2 p-2">
              <input type="hidden" name="id" value={routineId} />
              <input type="hidden" name="confirmDelete" value="yes" />
              <p className="text-muted text-xs">
                The routine template is removed.
              </p>
              <button
                type="submit"
                className="bg-accent text-ground min-h-11 rounded-md px-3 text-sm font-semibold"
              >
                <PendingLabel idle="Delete routine" pending="Deleting…" />
              </button>
              <button
                type="button"
                className="border-border min-h-11 rounded-md border px-3 text-sm font-semibold"
                onClick={() => setConfirmDelete(false)}
              >
                Keep it
              </button>
            </form>
          )}

          {error ? (
            <p className="px-3 pb-2 text-xs text-[#ff8f6b]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
