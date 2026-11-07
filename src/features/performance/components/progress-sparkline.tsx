import type { HistorySessionSummary } from "@/features/performance/queries";

/**
 * Simple SVG sparkline for one routine's comparable primary scores.
 * Chronological left→right. Y-axis flips for lower-is-better metrics.
 */
export function ProgressSparkline({
  items,
}: {
  items: HistorySessionSummary[];
}) {
  const points = items
    .filter(
      (item) =>
        item.primaryValue != null &&
        Number.isFinite(item.primaryValue) &&
        item.primaryDirection != null,
    )
    .slice()
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  if (points.length < 2) {
    return null;
  }

  const direction = points[0]?.primaryDirection;
  if (!direction || points.some((point) => point.primaryDirection !== direction)) {
    return null;
  }

  const values = points.map((point) => point.primaryValue as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 320;
  const height = 120;
  const padX = 12;
  const padY = 16;

  const coords = values.map((value, index) => {
    const x =
      padX + (index / (values.length - 1)) * (width - padX * 2);
    const normalized = (value - min) / span;
    const yRatio =
      direction === "lower_is_better" ? normalized : 1 - normalized;
    const y = padY + yRatio * (height - padY * 2);
    return { x, y, item: points[index]! };
  });

  const polyline = coords.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="border-border bg-surface rounded-lg border p-4">
      <p className="text-muted text-xs font-semibold tracking-wide uppercase">
        Trend · {direction === "lower_is_better" ? "Lower is better" : "Higher is better"}
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-3 h-auto w-full max-w-md"
        role="img"
        aria-label="Score trend for this routine"
      >
        <polyline
          fill="none"
          stroke="var(--forge-accent)"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polyline}
        />
        {coords.map((point) => (
          <circle
            key={point.item.id}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="var(--forge-accent)"
          />
        ))}
      </svg>
      <div className="text-muted mt-2 flex justify-between text-xs">
        <span>{coords[0]?.item.primaryLabel}</span>
        <span>{coords[coords.length - 1]?.item.primaryLabel}</span>
      </div>
    </div>
  );
}
