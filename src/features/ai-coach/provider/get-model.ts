import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type AiCoachProviderId = "stub" | "openai" | "anthropic";

export type ResolvedAiCoachModel =
  | { kind: "stub" }
  | { kind: "model"; provider: Exclude<AiCoachProviderId, "stub">; model: LanguageModel }
  | { kind: "unavailable"; reason: string };

function readProviderId(): AiCoachProviderId {
  const raw = (process.env.AI_COACH_PROVIDER ?? "stub").trim().toLowerCase();
  if (raw === "openai" || raw === "anthropic" || raw === "stub") {
    return raw;
  }
  return "stub";
}

/**
 * Provider-agnostic model resolution via the Vercel AI SDK.
 * Swap vendors with AI_COACH_PROVIDER + the matching API key / model env vars.
 */
export function resolveAiCoachModel(): ResolvedAiCoachModel {
  const provider = readProviderId();

  if (provider === "stub") {
    return { kind: "stub" };
  }

  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return {
        kind: "unavailable",
        reason: "OpenAI is selected but OPENAI_API_KEY is not configured.",
      };
    }
    const openai = createOpenAI({ apiKey });
    const modelId = process.env.AI_COACH_MODEL?.trim() || "gpt-4o-mini";
    return { kind: "model", provider: "openai", model: openai(modelId) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return {
      kind: "unavailable",
      reason: "Anthropic is selected but ANTHROPIC_API_KEY is not configured.",
    };
  }
  const anthropic = createAnthropic({ apiKey });
  const modelId =
    process.env.AI_COACH_MODEL?.trim() || "claude-haiku-4-5-20251001";
  return { kind: "model", provider: "anthropic", model: anthropic(modelId) };
}

export function getConfiguredProviderId(): AiCoachProviderId {
  return readProviderId();
}
