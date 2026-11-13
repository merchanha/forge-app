import type { SupabaseClient } from "@supabase/supabase-js";

import { getAiCoachDailyLimit } from "@/features/ai-coach/lib/limits";
import type { Database } from "@/platform/supabase/database.types";

export type ConsumeRateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; code: "limit" | "error"; error: string };

export async function consumeAiCoachRequest(
  supabase: SupabaseClient<Database>,
  tokenEstimate = 0,
): Promise<ConsumeRateLimitResult> {
  const dailyLimit = getAiCoachDailyLimit();
  const { data, error } = await supabase.rpc("consume_ai_coach_request", {
    p_daily_limit: dailyLimit,
    p_token_estimate: Math.max(0, Math.floor(tokenEstimate)),
  });

  if (error) {
    if (error.message.includes("daily limit")) {
      return {
        ok: false,
        code: "limit",
        error: `Daily AI Coach limit reached (${dailyLimit}/day). Try again tomorrow.`,
      };
    }
    return {
      ok: false,
      code: "error",
      error: "Could not check AI Coach usage.",
    };
  }

  return { ok: true, remaining: typeof data === "number" ? data : 0 };
}
