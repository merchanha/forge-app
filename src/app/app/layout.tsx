import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireUser } from "@/features/profiles/queries";

async function AuthenticatedShell({ children }: { children: ReactNode }) {
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
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col">
      <header className="border-border flex items-center justify-between border-b px-6 py-4">
        <Link
          href="/app"
          className="font-display text-xl font-extrabold tracking-wide uppercase"
        >
          FORGE
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/app" className="text-muted hover:text-ink">
            Hub
          </Link>
          <Link href="/app/profile" className="text-muted hover:text-ink">
            Profile
          </Link>
        </nav>
      </header>
      <div className="flex-1 px-6 py-6">{children}</div>
    </div>
  );
}

function AppShellFallback() {
  return (
    <div className="text-muted mx-auto flex min-h-dvh w-full max-w-3xl items-center justify-center px-6">
      Loading…
    </div>
  );
}

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AppShellFallback />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}
