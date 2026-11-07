"use client";

import { useLayoutEffect } from "react";

import type { ProfileTheme } from "@/platform/supabase/database.types";

/**
 * Keeps <html data-theme> in sync after client navigations / profile saves.
 * Dark is the CSS :root default; light overrides via [data-theme="light"].
 */
export function ApplyTheme({ theme }: { theme: ProfileTheme }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.dataset.theme = "light";
    } else {
      delete root.dataset.theme;
    }
  }, [theme]);

  return null;
}
