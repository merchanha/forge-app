"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  copyExploreTemplateAction,
  type ExploreActionState,
} from "@/features/explore/actions";

const initialState: ExploreActionState = { error: null, success: false };

function Label({ idle }: { idle: string }) {
  const { pending } = useFormStatus();
  return <>{pending ? "Saving…" : idle}</>;
}

export function CopyExploreButton({
  templateId,
  className,
  label = "Save to My Training",
}: {
  templateId: string;
  className?: string;
  label?: string;
}) {
  const [state, action] = useActionState(
    copyExploreTemplateAction,
    initialState,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={templateId} />
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
