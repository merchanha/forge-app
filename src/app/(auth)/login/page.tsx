import { Suspense } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

async function LoginContent({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" &&
    params.next.startsWith("/") &&
    !params.next.startsWith("//")
      ? params.next
      : "/app";

  return (
    <AuthShell
      title={
        <>
          Welcome
          <br />
          back.
        </>
      }
      subtitle="Log in to continue training."
    >
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}

export default function LoginPage(props: LoginPageProps) {
  return (
    <Suspense
      fallback={
        <AuthShell title="Welcome back." subtitle="Loading…">
          <div className="text-muted text-sm">Preparing login…</div>
        </AuthShell>
      }
    >
      <LoginContent {...props} />
    </Suspense>
  );
}
