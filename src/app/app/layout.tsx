import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/platform/supabase/require-user";

async function AppHeader() {
  // requireUser() awaits connection() before Supabase JWT Date.now() checks.
  let user: Awaited<ReturnType<typeof requireUser>>["user"] = null;
  try {
    ({ user } = await requireUser());
  } catch {
    redirect("/login");
  }
  if (!user) {
    redirect("/login");
  }

  return (
    <header className="border-border flex items-center justify-between border-b px-6 py-4">
      <Link
        href="/app"
        className="font-display text-xl font-extrabold tracking-wide uppercase"
      >
        FORGE
      </Link>
      <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm font-semibold">
        <Link href="/app" className="text-muted hover:text-ink">
          Hub
        </Link>
        <Link href="/app/routines" className="text-muted hover:text-ink">
          Training
        </Link>
        <Link href="/app/history" className="text-muted hover:text-ink">
          History
        </Link>
        <Link href="/app/exercises" className="text-muted hover:text-ink">
          Exercises
        </Link>
        <Link href="/app/profile" className="text-muted hover:text-ink">
          Profile
        </Link>
      </nav>
    </header>
  );
}

function HeaderFallback() {
  return (
    <header className="border-border text-muted flex min-h-[65px] items-center border-b px-6 py-4 text-sm">
      Loading…
    </header>
  );
}

/**
 * Do not wrap `{children}` inside the same async auth component.
 * Layout children are a separate slot; nesting them under auth made Supabase’s
 * JWT `Date.now()` show up as a prerender error on every /app route.
 */
export default function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <Suspense fallback={<HeaderFallback />}>
        <AppHeader />
      </Suspense>
      <div className="flex-1 px-6 py-6">{children}</div>
    </div>
  );
}
