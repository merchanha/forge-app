"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
};

export function SubmitButton({ idleLabel, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-accent text-ground min-h-12 w-full rounded-md px-4 text-base font-semibold disabled:opacity-60"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
