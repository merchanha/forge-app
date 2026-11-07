import { Suspense } from "react";

import { HistoryList } from "@/features/performance/components/history-list";
import { listOwnCompletedSessions } from "@/features/performance/queries";
import {
  historyRangeSchema,
  type HistoryRange,
} from "@/features/performance/validation";

type HistoryPageProps = {
  searchParams: Promise<{
    range?: string;
    routineId?: string;
  }>;
};

function parseRange(value: string | undefined): HistoryRange {
  const parsed = historyRangeSchema.safeParse(value ?? "all");
  return parsed.success ? parsed.data : "all";
}

async function HistoryContent({
  searchParams,
}: {
  searchParams: HistoryPageProps["searchParams"];
}) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const routineId = params.routineId?.trim() || null;

  let items: Awaited<ReturnType<typeof listOwnCompletedSessions>> = [];
  try {
    items = await listOwnCompletedSessions({ range, routineId });
  } catch {
    return (
      <p className="text-sm text-[#ff8f6b]" role="alert">
        Could not load workout history.
      </p>
    );
  }

  const title =
    routineId && items[0]
      ? `${items[0].name} history`
      : routineId
        ? "Routine history"
        : "History";

  return (
    <HistoryList
      items={items}
      range={range}
      routineId={routineId}
      title={title}
    />
  );
}

export default function HistoryPage({ searchParams }: HistoryPageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading history…</p>}>
      <HistoryContent searchParams={searchParams} />
    </Suspense>
  );
}
