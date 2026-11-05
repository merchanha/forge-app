import { Suspense } from "react";
import Link from "next/link";

import { getOwnProfile } from "@/features/profiles/queries";

async function AppHomeContent() {
  const profile = await getOwnProfile();
  const name = profile?.display_name?.trim() || "athlete";

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-muted text-sm font-semibold uppercase">Hub</p>
        <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
          Hey {name}
        </h1>
        <p className="text-muted">
          Auth and profile are live. Routines and workouts arrive in later
          phases.
        </p>
      </header>

      <section className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-display text-2xl font-extrabold uppercase">
          Quick links
        </h2>
        <Link
          href="/app/profile"
          className="bg-accent text-ground inline-flex min-h-12 items-center justify-center rounded-md px-4 font-semibold"
        >
          Open profile
        </Link>
      </section>
    </main>
  );
}

export default function AppHomePage() {
  return (
    <Suspense
      fallback={<p className="text-muted">Loading your hub…</p>}
    >
      <AppHomeContent />
    </Suspense>
  );
}
