import { Suspense } from "react";
import Link from "next/link";

import { RoutineListActions } from "@/features/routines/components/routine-list-actions";
import { listOwnRoutines } from "@/features/routines/queries";
import {
  routineCategories,
  routineCategoryLabels,
  type RoutineCategory,
} from "@/features/routines/validation";

type RoutinesPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    archived?: string;
  }>;
};

function isCategory(value: string | undefined): value is RoutineCategory {
  return (
    value === "crossfit" ||
    value === "hyrox" ||
    value === "running" ||
    value === "custom"
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-12 items-center justify-center rounded-full border px-4 text-sm font-semibold ${
        active
          ? "border-accent bg-accent text-ground"
          : "border-border bg-surface text-ink"
      }`}
    >
      {label}
    </Link>
  );
}

async function RoutinesPageContent({
  searchParams,
}: {
  searchParams: RoutinesPageProps["searchParams"];
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const category = isCategory(params.category) ? params.category : "all";
  const includeArchived = params.archived === "1";

  let routines: Awaited<ReturnType<typeof listOwnRoutines>> = [];
  try {
    routines = await listOwnRoutines({
      query,
      category,
      includeArchived,
    });
  } catch {
    return (
      <p className="text-sm text-[#ff8f6b]" role="alert">
        Could not load routines.
      </p>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-muted text-sm font-semibold uppercase">
            My Training
          </p>
          <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
            Routines
          </h1>
          <p className="text-muted">
            Build reusable templates, then start a session from the list.
          </p>
        </div>
        <Link
          href="/app/routines/new"
          className="bg-accent text-ground inline-flex min-h-12 items-center justify-center rounded-md px-4 font-semibold"
        >
          ＋ Routine
        </Link>
      </header>

      <form className="flex flex-col gap-3" action="/app/routines" method="get">
        <label className="flex flex-col gap-2" htmlFor="routine-search">
          <span className="text-muted text-sm font-semibold">
            Search routines
          </span>
          <input
            id="routine-search"
            name="q"
            defaultValue={query}
            placeholder="Search by name"
            className="border-border bg-raised text-ink min-h-12 rounded-md border px-4 text-base outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--forge-accent)]"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <FilterChip
            href="/app/routines"
            label="All"
            active={category === "all" && !includeArchived}
          />
          {routineCategories.map((option) => (
            <FilterChip
              key={option}
              href={`/app/routines?category=${option}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
              label={routineCategoryLabels[option]}
              active={category === option && !includeArchived}
            />
          ))}
          <FilterChip
            href={`/app/routines?archived=1${query ? `&q=${encodeURIComponent(query)}` : ""}`}
            label="Archived"
            active={includeArchived}
          />
        </div>

        {includeArchived ? (
          <input type="hidden" name="archived" value="1" />
        ) : null}
        {category !== "all" ? (
          <input type="hidden" name="category" value={category} />
        ) : null}
      </form>

      {routines.length === 0 ? (
        <div className="border-border bg-surface flex flex-col gap-4 rounded-lg border px-4 py-6">
          <p className="text-muted">
            {query || category !== "all"
              ? "Nothing matches. Clear the search or build a routine for this discipline."
              : "No routines yet. Create one to start My Training."}
          </p>
          <Link
            href="/app/routines/new"
            className="bg-accent text-ground inline-flex min-h-12 items-center justify-center rounded-md px-4 font-semibold"
          >
            Create Routine
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {routines.map((routine) => (
            <li
              key={routine.id}
              className="border-border bg-surface flex items-start gap-3 rounded-lg border px-4 py-3"
            >
              <Link
                href={`/app/routines/${routine.id}`}
                className="flex min-h-14 min-w-0 flex-1 flex-col justify-center gap-1"
              >
                <span className="font-semibold">
                  {routine.is_favorite ? "★ " : ""}
                  {routine.name}
                </span>
                <span className="text-muted text-xs">
                  {routineCategoryLabels[routine.category]} ·{" "}
                  {routine.section_count}{" "}
                  {routine.section_count === 1 ? "section" : "sections"}
                  {routine.archived_at ? " · Archived" : ""}
                </span>
              </Link>
              <RoutineListActions
                routineId={routine.id}
                routineName={routine.name}
                isFavorite={routine.is_favorite}
                isArchived={routine.archived_at != null}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default function RoutinesPage({ searchParams }: RoutinesPageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading routines…</p>}>
      <RoutinesPageContent searchParams={searchParams} />
    </Suspense>
  );
}
