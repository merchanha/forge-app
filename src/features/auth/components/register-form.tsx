"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  registerAction,
  type AuthActionState,
} from "@/features/auth/actions";
import { PasswordField } from "@/shared/ui/password-field";
import { SubmitButton } from "@/shared/ui/submit-button";
import { TextField } from "@/shared/ui/text-field";

const initialState: AuthActionState = { error: null, message: null };

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <TextField
        id="displayName"
        name="displayName"
        label="Name"
        autoComplete="name"
        required
        maxLength={80}
      />
      <TextField
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        required
      />
      <PasswordField
        id="password"
        name="password"
        label="Password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters"
      />

      {state.error ? (
        <p className="text-sm text-[#ff8f6b]" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="text-success text-sm" role="status">
          {state.message}
        </p>
      ) : null}

      <SubmitButton idleLabel="Create account" pendingLabel="Creating…" />

      <p className="text-muted text-sm">
        Already training?{" "}
        <Link href="/login" className="text-ink font-semibold underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
