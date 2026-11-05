import { Suspense } from "react";
import { redirect } from "next/navigation";

import { requireUser } from "@/features/profiles/queries";

async function HomeRedirect() {
  let signedIn = false;

  try {
    const { user } = await requireUser();
    signedIn = Boolean(user);
  } catch {
    redirect("/login");
  }

  redirect(signedIn ? "/app" : "/login");
  return null;
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeRedirect />
    </Suspense>
  );
}
