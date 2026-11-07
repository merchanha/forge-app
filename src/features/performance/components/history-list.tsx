import Link from "next/link";

import { ProgressSparkline } from "@/features/performance/components/progress-sparkline";
import type { HistorySessionSummary } from "@/features/performance/queries";
import type { HistoryRange } from "@/features/performance/validation";
import { formatUtcDate } from "@/shared/datetime/format";

const ranges: HistoryRange[] = ["30d", "90d", "all"];

function rangeLabel(range: HistoryRange): string {
  if (range === "all") {
    return "All";
  }
  return range;
}

export function HistoryList({
  items,
  range,
  routineId,
  title,
}: {
  items: HistorySessionSummary[];
  range: HistoryRange;
  routineId?: string | null;
  title: string;
}) {
  const queryFor = (nextRange: HistoryRange) => {
    const params = new URLSearchParams();
    if (nextRange !== "all") {
      params.set("range", nextRange);
    }
    if (routineId) {
      params.set("routineId", routineId);
    }
    const query = params.toString();
    return query ? `/app/history?${query}` : "/app/history";
  };

  const prCount = items.filter((item) => item.isPersonalRecord).length;

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-muted text-xs font-semibold tracking-wide uppercase">
            Progress
          </p>
          <h1 className="font-display mt-1 text-4xl font-extrabold uppercase">
            {title}
          </h1>
          <p className="text-muted mt-2 max-w-xl text-sm">
            Completed sessions only. Comparisons use matching metrics and
            prescription context.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranges.map((value) => {
            const active = value === range;
            return (
              <Link
                key={value}
                href={queryFor(value)}
                className={`inline-flex min-h-10 items-center rounded-full border px-3 text-sm font-semibold ${
                  active
                    ? "border-ink bg-ink text-ground"
                    : "border-border bg-surface text-ink"
                }`}
              >
                {rangeLabel(value)}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border-border bg-surface rounded-lg border px-4 py-3">
          <p className="text-muted text-xs font-semibold uppercase">Workouts</p>
          <p className="font-display text-3xl font-extrabold">{items.length}</p>
        </div>
        <div className="border-border bg-surface rounded-lg border px-4 py-3">
          <p className="text-muted text-xs font-semibold uppercase">PRs</p>
          <p className="font-display text-3xl font-extrabold">{prCount}</p>
        </div>
        <div className="border-border bg-surface rounded-lg border px-4 py-3">
          <p className="text-muted text-xs font-semibold uppercase">Range</p>
          <p className="font-display text-3xl font-extrabold uppercase">
            {rangeLabel(range)}
          </p>
        </div>
      </div>

      {routineId ? <ProgressSparkline items={items} /> : null}

      {items.length === 0 ? (
        <div className="border-border bg-surface rounded-lg border px-4 py-6">
          <p className="text-muted text-sm">
            No completed workouts in this range yet. Finish a session to build
            history.
          </p>
          <Link
            href="/app/routines"
            className="bg-accent text-ground mt-4 inline-flex min-h-12 items-center justify-center rounded-md px-4 font-semibold"
          >
            My Training
          </Link>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:items-start lg:gap-6">
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/app/sessions/${item.id}/review`}
                  className="border-border bg-surface flex items-start justify-between gap-3 rounded-lg border px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-display text-xl font-extrabold uppercase">
                      {item.name}
                    </p>
                    <p className="text-muted text-xs">
                      {formatUtcDate(item.completedAt)} ·{" "}
                      {item.scaling === "rx" ? "Rx" : "Scaled"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-extrabold">
                      {item.primaryLabel ?? "—"}
                    </p>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      {item.isPersonalRecord ? (
                        <span className="text-accent text-xs font-extrabold tracking-wide uppercase">
                          PR
                        </span>
                      ) : null}
                      {item.deltaLabel ? (
                        <span className="bg-success-surface text-success rounded-full px-2 py-0.5 text-xs font-semibold">
                          {item.deltaLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <aside className="border-border bg-surface mt-4 hidden rounded-lg border p-4 text-sm lg:mt-0 lg:block">
            <p className="font-display text-xl font-extrabold uppercase">
              How compares work
            </p>
            <p className="text-muted mt-2">
              Open a routine from a session card filter, or keep browsing all
              completed work. Unlike metrics are never ranked together.
            </p>
            {routineId ? (
              <Link
                href={range === "all" ? "/app/history" : `/app/history?range=${range}`}
                className="text-accent mt-4 inline-flex font-semibold"
              >
                Clear routine filter
              </Link>
            ) : (
              <p className="text-muted mt-4 text-xs">
                Tip: open a review and use the routine history link to see the
                sparkline for comparable scores.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
