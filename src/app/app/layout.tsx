import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ApplyTheme } from "@/features/profiles/components/apply-theme";
import { AppShellNav } from "@/features/profiles/components/app-shell-nav";
import { getOwnProfile } from "@/features/profiles/queries";
import { requireUser } from "@/platform/supabase/require-user";

async function AppChrome() {
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

  let theme: "dark" | "light" = "dark";
  try {
    const profile = await getOwnProfile();
    theme = profile?.theme === "light" ? "light" : "dark";
  } catch {
    theme = "dark";
  }

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            theme === "light"
              ? `document.documentElement.dataset.theme="light";`
              : `delete document.documentElement.dataset.theme;`,
        }}
      />
      <ApplyTheme theme={theme} />
      <aside className="border-border flex flex-col gap-4 border-b px-6 py-4 lg:sticky lg:top-0 lg:h-dvh lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0 lg:px-5 lg:py-6">
        <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-stretch">
          <Link
            href="/app"
            className="font-display text-xl font-extrabold tracking-wide uppercase"
          >
            FORGE
          </Link>
          <Link
            href="/app/routines/new"
            className="bg-accent text-ground hidden min-h-11 items-center justify-center rounded-md px-3 text-sm font-semibold lg:inline-flex"
          >
            ＋ Create Routine
          </Link>
        </div>
        <AppShellNav />
      </aside>
    </>
  );
}

function ChromeFallback() {
  return (
    <aside className="border-border text-muted flex min-h-[65px] items-center border-b px-6 py-4 text-sm lg:h-dvh lg:w-56 lg:shrink-0 lg:border-r lg:border-b-0">
      Loading…
    </aside>
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
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col lg:flex-row">
      <Suspense fallback={<ChromeFallback />}>
        <AppChrome />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col px-6 py-6 lg:px-8 lg:py-8">
        {children}
      </div>
    </div>
  );
}
