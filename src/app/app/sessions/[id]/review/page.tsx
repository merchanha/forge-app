import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { SessionReview } from "@/features/workout-sessions/components/session-review";
import { getOwnSession } from "@/features/workout-sessions/queries";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

async function ReviewContent({ id }: { id: string }) {
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

  return <SessionReview session={session} />;
}

export default async function SessionReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<p className="text-muted">Loading review…</p>}>
      <ReviewContent id={id} />
    </Suspense>
  );
}
