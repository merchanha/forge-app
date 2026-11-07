import { Suspense } from "react";
import Link from "next/link";

import { listOwnCompletedSessions } from "@/features/performance/queries";
import { getOwnProfile } from "@/features/profiles/queries";
import {
  experienceLevelLabels,
  trainingGoalLabels,
} from "@/features/profiles/validation";
import { listOwnRoutines } from "@/features/routines/queries";
import { formatUtcDate } from "@/shared/datetime/format";

async function AppHomeContent() {
  const [profile, history, routines] = await Promise.all([
    getOwnProfile(),
    listOwnCompletedSessions({ range: "90d", limit: 12 }).catch(() => []),
    listOwnRoutines({ includeArchived: false }).catch(() => []),
  ]);

  const name = profile?.display_name?.trim() || "athlete";
  const subtitleBits = [
    profile?.experience_level
      ? experienceLevelLabels[profile.experience_level]
      : null,
    profile?.goal ? trainingGoalLabels[profile.goal] : null,
    profile?.primary_discipline ?? null,
  ].filter(Boolean);

  const activeRoutines = routines.filter((routine) => !routine.archived_at);
  const focusRoutine = activeRoutines.find((routine) => routine.is_favorite)
    ?? activeRoutines[0]
    ?? null;
  const recentWithDelta = history.filter((item) => item.deltaLabel).slice(0, 3);
  const prCount = history.filter((item) => item.isPersonalRecord).length;

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm font-semibold uppercase">
            Dashboard
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase lg:text-5xl">
            Hey {name}
          </h1>
          <p className="text-muted">
            {subtitleBits.length > 0
              ? subtitleBits.join(" · ")
              : "Build a routine, run a session, then review progress."}
          </p>
        </div>
        <Link
          href="/app/routines/new"
          className="bg-accent text-ground inline-flex min-h-12 items-center justify-center rounded-md px-4 font-semibold lg:hidden"
        >
          ＋ Create Routine
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="border-border bg-surface rounded-lg border px-4 py-3">
          <p className="text-muted text-xs font-semibold uppercase">
            Workouts · 90d
          </p>
          <p className="font-display text-3xl font-extrabold">
            {history.length}
          </p>
        </div>
        <div className="border-border bg-surface rounded-lg border px-4 py-3">
          <p className="text-muted text-xs font-semibold uppercase">PRs · 90d</p>
          <p className="font-display text-3xl font-extrabold">{prCount}</p>
        </div>
        <div className="border-border bg-surface rounded-lg border px-4 py-3">
          <p className="text-muted text-xs font-semibold uppercase">Routines</p>
          <p className="font-display text-3xl font-extrabold">
            {activeRoutines.length}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="border-border bg-surface flex flex-col gap-4 rounded-lg border p-4">
          <div>
            <p className="text-muted text-xs font-semibold uppercase">Focus</p>
            <h2 className="font-display text-2xl font-extrabold uppercase">
              {focusRoutine ? focusRoutine.name : "Start My Training"}
            </h2>
            <p className="text-muted mt-1 text-sm">
              {focusRoutine
                ? `${focusRoutine.section_count} ${focusRoutine.section_count === 1 ? "section" : "sections"} · open the template to edit or start`
                : "Create a reusable routine, then run it as a session."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {focusRoutine ? (
              <Link
                href={`/app/routines/${focusRoutine.id}`}
                className="bg-accent text-ground inline-flex min-h-12 flex-1 items-center justify-center rounded-md px-4 font-semibold"
              >
                Open routine
              </Link>
            ) : (
              <Link
                href="/app/routines/new"
                className="bg-accent text-ground inline-flex min-h-12 flex-1 items-center justify-center rounded-md px-4 font-semibold"
              >
                Create Routine
              </Link>
            )}
            <Link
              href="/app/routines"
              className="border-border text-ink inline-flex min-h-12 flex-1 items-center justify-center rounded-md border px-4 font-semibold"
            >
              My Training
            </Link>
          </div>
        </section>

        <section className="border-border bg-surface flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-extrabold uppercase">
              Recent
            </h2>
            <Link href="/app/history" className="text-accent text-sm font-semibold">
              Progress
            </Link>
          </div>
          {recentWithDelta.length === 0 && history.length === 0 ? (
            <p className="text-muted text-sm">
              Complete a workout to see metric-aware deltas here.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {(recentWithDelta.length > 0 ? recentWithDelta : history.slice(0, 3)).map(
                (item) => (
                  <li key={item.id}>
                    <Link
                      href={`/app/sessions/${item.id}/review`}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-muted text-xs">
                          {formatUtcDate(item.completedAt)}
                          {item.primaryLabel ? ` · ${item.primaryLabel}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {item.isPersonalRecord ? (
                          <span className="text-accent text-xs font-extrabold uppercase">
                            PR
                          </span>
                        ) : null}
                        {item.deltaLabel ? (
                          <span className="bg-success-surface text-success rounded-full px-2 py-0.5 text-xs font-semibold">
                            {item.deltaLabel}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  </li>
                ),
              )}
            </ul>
          )}
        </section>
      </div>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/app/history"
          className="border-border text-ink inline-flex min-h-12 items-center justify-center rounded-md border px-4 font-semibold"
        >
          Open history
        </Link>
        <Link
          href="/app/exercises"
          className="border-border text-ink inline-flex min-h-12 items-center justify-center rounded-md border px-4 font-semibold"
        >
          Open exercises
        </Link>
        <Link
          href="/app/profile"
          className="border-border text-ink inline-flex min-h-12 items-center justify-center rounded-md border px-4 font-semibold"
        >
          Open profile
        </Link>
      </section>
    </main>
  );
}

export default function AppHomePage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading your hub…</p>}>
      <AppHomeContent />
    </Suspense>
  );
}
