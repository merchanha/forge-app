import Link from "next/link";

import { AuthShell } from "@/features/auth/components/auth-shell";

export default function AuthErrorPage() {
  return (
    <AuthShell
      title={
        <>
          Link
          <br />
          expired.
        </>
      }
      subtitle="That confirmation or login link is invalid or already used."
    >
      <div className="flex flex-col gap-4">
        <p className="text-muted text-sm">
          Request a new confirmation email by registering again with the same
          address, or try logging in if your email is already confirmed.
        </p>
        <Link
          href="/login"
          className="bg-accent text-ground inline-flex min-h-12 items-center justify-center rounded-md px-4 font-semibold"
        >
          Back to log in
        </Link>
      </div>
    </AuthShell>
  );
}
