import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";

import { LiveSession } from "@/features/workout-sessions/components/live-session";
import { getOwnSession } from "@/features/workout-sessions/queries";

type SessionPageProps = {
  params: Promise<{ id: string }>;
};

async function SessionContent({
  params,
}: {
  params: SessionPageProps["params"];
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

  if (session.status === "completed") {
    redirect(`/app/sessions/${session.id}/review`);
  }

  if (session.status === "abandoned") {
    redirect("/app/routines");
  }

  if (session.status !== "in_progress") {
    return (
      <p className="text-muted text-sm">
        This session is not active yet.
      </p>
    );
  }

  return <LiveSession session={session} />;
}

export default function SessionPage({ params }: SessionPageProps) {
  return (
    <Suspense fallback={<p className="text-muted">Loading workout…</p>}>
      <SessionContent params={params} />
    </Suspense>
  );
}
