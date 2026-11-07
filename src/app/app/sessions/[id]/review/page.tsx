import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { SessionResultsPanel } from "@/features/performance/components/session-results-panel";
import { getSessionCompareView } from "@/features/performance/queries";
import { getOwnSession } from "@/features/workout-sessions/queries";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

async function ReviewContent({
  params,
}: {
  params: ReviewPageProps["params"];
}) {
  const { id } = await params;

  let session: Awaited<ReturnType<typeof getOwnSession>> = null;
  try {
    session = await getOwnSession(id);
  } catch {
    return (
      <p className="text-sm text-[#ff8f6b]" role="alert">
        Could not load this session.
      </p>
    );
  }

  if (!session) {
    notFound();
  }

  if (session.status === "in_progress") {
    redirect(`/app/sessions/${session.id}`);
  }

  if (session.status !== "completed") {
    redirect("/app/routines");
  }

  let view: Awaited<ReturnType<typeof getSessionCompareView>> = null;
  try {
    view = await getSessionCompareView(session.id);
  } catch {
    return (
      <p className="text-sm text-[#ff8f6b]" role="alert">
        Could not load comparisons for this session.
      </p>
    );
  }

  if (!view) {
    notFound();
  }

  return <SessionResultsPanel view={view} />;
}

export default function SessionReviewPage({ params }: ReviewPageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading review…</p>}>
      <ReviewContent params={params} />
    </Suspense>
  );
}
