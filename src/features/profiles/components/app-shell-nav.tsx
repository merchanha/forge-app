"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/app", label: "Dashboard", match: (path: string) => path === "/app" },
  {
    href: "/app/routines",
    label: "My Training",
    match: (path: string) => path.startsWith("/app/routines"),
  },
  {
    href: "/app/history",
    label: "Progress",
    match: (path: string) =>
      path.startsWith("/app/history") || path.includes("/review"),
  },
  {
    href: "/app/exercises",
    label: "Exercises",
    match: (path: string) => path.startsWith("/app/exercises"),
  },
  {
    href: "/app/profile",
    label: "Profile",
    match: (path: string) => path.startsWith("/app/profile"),
  },
] as const;

export function AppShellNav() {
  const pathname = usePathname() || "/app";

  return (
    <nav
      aria-label="Primary"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold lg:flex-col lg:items-stretch lg:gap-1"
    >
      {navItems.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex min-h-11 items-center rounded-md px-3 ${
              active
                ? "bg-raised text-ink"
                : "text-muted hover:text-ink"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
