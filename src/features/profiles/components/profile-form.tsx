"use client";

import { useActionState } from "react";

import {
  updateProfileAction,
  type ProfileActionState,
} from "@/features/profiles/actions";
import type { PreferredUnits } from "@/platform/supabase/database.types";
import { SubmitButton } from "@/shared/ui/submit-button";
import { TextField } from "@/shared/ui/text-field";

const initialState: ProfileActionState = { error: null, success: false };

type ProfileFormProps = {
  displayName: string;
  preferredUnits: PreferredUnits;
};

export function ProfileForm({
  displayName,
  preferredUnits,
}: ProfileFormProps) {
  const [state, formAction] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TextField
        id="displayName"
        name="displayName"
        label="Name"
        defaultValue={displayName}
        autoComplete="name"
        required
        maxLength={80}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="text-muted text-sm font-semibold">Units</legend>
        <div className="flex gap-2">
          {(["kg", "lb"] as const).map((unit) => (
            <label
              key={unit}
              className="border-border bg-raised has-checked:border-accent has-checked:bg-surface flex min-h-12 min-w-20 cursor-pointer items-center justify-center rounded-md border px-4 font-semibold uppercase"
            >
              <input
                type="radio"
                name="preferredUnits"
                value={unit}
                defaultChecked={preferredUnits === unit}
                className="sr-only"
              />
              {unit}
            </label>
          ))}
        </div>
      </fieldset>

      {state.error ? (
        <p className="text-sm text-[#ff8f6b]" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-success text-sm" role="status">
          Profile saved.
        </p>
      ) : null}

      <SubmitButton idleLabel="Save profile" pendingLabel="Saving…" />
    </form>
  );
}
