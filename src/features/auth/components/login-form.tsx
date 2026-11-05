"use client";

import { useActionState } from "react";
import Link from "next/link";

import { loginAction, type AuthActionState } from "@/features/auth/actions";
import { PasswordField } from "@/shared/ui/password-field";
import { SubmitButton } from "@/shared/ui/submit-button";
import { TextField } from "@/shared/ui/text-field";

const initialState: AuthActionState = { error: null, message: null };

type LoginFormProps = {
  nextPath?: string;
};

export function LoginForm({ nextPath = "/app" }: LoginFormProps) {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />
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
        autoComplete="current-password"
        required
      />

      {state.error ? (
        <p className="text-sm text-[#ff8f6b]" role="alert">
          {state.error}
        </p>
      ) : null}

      <SubmitButton idleLabel="Log in" pendingLabel="Signing in…" />

      <p className="text-muted text-sm">
        New here?{" "}
        <Link href="/register" className="text-ink font-semibold underline">
          Create account
        </Link>
      </p>
    </form>
  );
}
