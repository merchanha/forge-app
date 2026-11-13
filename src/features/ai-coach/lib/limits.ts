/** Hard default — also the documented MVP cap. */
export const AI_COACH_DAILY_LIMIT_DEFAULT = 10;

/** Daily request cap per authenticated athlete (UTC day). Server-only env override. */
export function getAiCoachDailyLimit(): number {
  const raw = process.env.AI_COACH_DAILY_LIMIT;
  const n = raw ? Number.parseInt(raw, 10) : AI_COACH_DAILY_LIMIT_DEFAULT;
  return Number.isFinite(n) && n > 0 ? n : AI_COACH_DAILY_LIMIT_DEFAULT;
}

/** Soft cost control — max model output tokens per draft request. */
export function getAiCoachMaxOutputTokens(): number {
  const raw = process.env.AI_COACH_MAX_OUTPUT_TOKENS;
  const n = raw ? Number.parseInt(raw, 10) : 2500;
  return Number.isFinite(n) && n >= 256 ? n : 2500;
}

/** Provider call timeout. */
export function getAiCoachTimeoutMs(): number {
  const raw = process.env.AI_COACH_TIMEOUT_MS;
  const n = raw ? Number.parseInt(raw, 10) : 30_000;
  return Number.isFinite(n) && n >= 5_000 ? n : 30_000;
}

export const AI_COACH_PROMPT_MAX = 500;
export const AI_COACH_DRAFT_STORAGE_KEY = "forge:ai-coach-draft";
export const AI_COACH_BUILDER_INITIAL_KEY = "forge:ai-coach-builder-initial";
