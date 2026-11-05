import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/platform/supabase/database.types";
import { getSupabaseEnv } from "@/platform/supabase/env";

export function createBrowserSupabaseClient() {
  const { url, publishableKey } = getSupabaseEnv();

  return createBrowserClient<Database>(url, publishableKey);
}
