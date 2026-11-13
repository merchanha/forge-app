"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/app",
    label: "Dashboard",
    match: (path: string) => path === "/app",
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 11l8-7 8 7v9H4z" />
      </svg>
    ),
  },
  {
    href: "/app/routines",
    label: "My Training",
    match: (path: string) => path.startsWith("/app/routines"),
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 9v6M6 6v12M18 6v12M21 9v6M6 12h12" />
      </svg>
    ),
  },
  {
    href: "/app/explore",
    label: "Explore",
    match: (path: string) => path.startsWith("/app/explore"),
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2 5-5 2 2-5z" />
      </svg>
    ),
  },
  {
    href: "/app/history",
    label: "Progress",
    match: (path: string) =>
      path.startsWith("/app/history") || path.includes("/review"),
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 19V5M4 19h16M8 15l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    href: "/app/ai-coach",
    label: "AI Coach",
    match: (path: string) => path.startsWith("/app/ai-coach"),
    icon: (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        <circle cx="12" cy="12" r="4" />
        <path d="M7.5 7.5l1.5 1.5M15 15l1.5 1.5M16.5 7.5L15 9M9 15l-1.5 1.5" />
      </svg>
    ),
  },
] as const;

export function shouldHideMobileTabBar(pathname: string): boolean {
  if (pathname.startsWith("/app/sessions/")) {
    return true;
  }
  if (pathname === "/app/routines/new") {
    return true;
  }
  if (/^\/app\/routines\/[^/]+$/.test(pathname)) {
    return true;
  }
  return false;
}

export function AppShellNav({
  variant,
}: {
  variant: "sidebar" | "tabs";
}) {
  const pathname = usePathname() || "/app";

  if (variant === "tabs") {
    return (
      <nav
        aria-label="Primary"
        className="border-border bg-surface grid grid-cols-5 border-t px-1.5 pt-1.5 pb-3.5"
      >
        {navItems.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-bold ${
                active ? "text-accent" : "text-muted"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex min-h-12 items-center rounded-xl px-3.5 text-[15px] font-semibold ${
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
