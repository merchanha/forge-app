"use client";

import { usePathname } from "next/navigation";

import {
  AppShellNav,
  shouldHideMobileTabBar,
} from "@/features/profiles/components/app-shell-nav";

export function MobileTabBar() {
  const pathname = usePathname() || "/app";
  if (shouldHideMobileTabBar(pathname)) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
      <div className="mx-auto w-full max-w-6xl">
        <AppShellNav variant="tabs" />
      </div>
    </div>
  );
}
