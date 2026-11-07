import { Suspense } from "react";
import Link from "next/link";

import { listExploreTemplates } from "@/features/explore/queries";
import {
  routineCategories,
  routineCategoryLabels,
  type RoutineCategory,
} from "@/features/routines/validation";

type ExplorePageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
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

async function ExplorePageContent({
  searchParams,
}: {
  searchParams: ExplorePageProps["searchParams"];
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const category = isCategory(params.category) ? params.category : "all";

  let templates: Awaited<ReturnType<typeof listExploreTemplates>> = [];
  try {
    templates = await listExploreTemplates({ query, category });
  } catch {
    return (
      <p className="text-sm text-[#ff8f6b]" role="alert">
        Could not load Explore templates.
      </p>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-muted text-sm font-semibold uppercase">Explore</p>
        <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
          Catalog
        </h1>
        <p className="text-muted">
          Browse curated starters, then save a copy into My Training.
        </p>
      </header>

      <form className="flex flex-col gap-3" action="/app/explore" method="get">
        <label className="flex flex-col gap-2" htmlFor="explore-search">
          <span className="text-sm font-semibold">Search</span>
          <input
            id="explore-search"
            name="q"
            defaultValue={query}
            placeholder="Helen, HYROX, threshold…"
            className="border-border bg-surface min-h-12 rounded-md border px-3"
          />
        </label>
        {category !== "all" ? (
          <input type="hidden" name="category" value={category} />
        ) : null}
        <button
          type="submit"
          className="border-border bg-raised inline-flex min-h-12 items-center justify-center rounded-md border px-4 font-semibold"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          href={query ? `/app/explore?q=${encodeURIComponent(query)}` : "/app/explore"}
          label="All"
          active={category === "all"}
        />
        {routineCategories.map((value) => {
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          params.set("category", value);
          return (
            <FilterChip
              key={value}
              href={`/app/explore?${params.toString()}`}
              label={routineCategoryLabels[value]}
              active={category === value}
            />
          );
        })}
      </div>

      {templates.length === 0 ? (
        <p className="text-muted text-sm">
          No curated templates match this filter yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((template) => (
            <li key={template.id}>
              <Link
                href={`/app/explore/${template.id}`}
                className="border-border bg-surface hover:border-accent flex flex-col gap-2 rounded-lg border px-4 py-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="font-display text-2xl font-extrabold tracking-wide uppercase">
                      {template.name}
                    </p>
                    <p className="text-muted text-sm">
                      {routineCategoryLabels[template.category]} ·{" "}
                      {template.sectionCount}{" "}
                      {template.sectionCount === 1 ? "section" : "sections"}
                    </p>
                  </div>
                  <span className="text-accent text-sm font-semibold">View</span>
                </div>
                {template.description ? (
                  <p className="text-muted text-sm">{template.description}</p>
                ) : null}
                {template.tags.length > 0 ? (
                  <p className="text-muted text-xs font-semibold uppercase">
                    {template.tags.join(" · ")}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function ExploreFallback() {
  return (
    <main className="flex flex-col gap-4">
      <p className="text-muted text-sm font-semibold uppercase">Explore</p>
      <h1 className="font-display text-4xl font-extrabold tracking-wide uppercase">
        Catalog
      </h1>
      <p className="text-muted">Loading curated templates…</p>
    </main>
  );
}

export default function ExplorePage({ searchParams }: ExplorePageProps) {
  return (
    <Suspense fallback={<ExploreFallback />}>
      <ExplorePageContent searchParams={searchParams} />
    </Suspense>
  );
}
