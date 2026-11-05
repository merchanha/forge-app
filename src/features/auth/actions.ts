"use server";

import { redirect } from "next/navigation";

import { loginSchema, registerSchema } from "@/features/auth/validation";
import { createServerSupabaseClient } from "@/platform/supabase/server";

export type AuthActionState = {
  error: string | null;
  message: string | null;
};

function firstZodError(error: {
  issues: Array<{ message: string }>;
}): string {
  return error.issues[0]?.message ?? "Invalid input";
}

function safeNextPath(next: FormDataEntryValue | null): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return "/app";
  }
  return next;
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error), message: null };
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/confirm`,
      data: {
        display_name: parsed.data.displayName,
      },
    },
  });

  if (error) {
    return { error: error.message, message: null };
  }

  // Email confirmation enabled: no session until the user confirms.
  if (!data.session) {
    return {
      error: null,
      message:
        "Check your email and open the confirmation link. After that you can log in.",
    };
  }

  redirect("/app");
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error), message: null };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message, message: null };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/login");
}
