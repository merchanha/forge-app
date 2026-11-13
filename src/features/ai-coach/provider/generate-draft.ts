import { generateObject } from "ai";

import {
  getAiCoachMaxOutputTokens,
  getAiCoachTimeoutMs,
} from "@/features/ai-coach/lib/limits";
import type { AiCoachAthleteContext } from "@/features/ai-coach/lib/context";
import { resolveAiCoachModel } from "@/features/ai-coach/provider/get-model";
import { generateStubDraft } from "@/features/ai-coach/provider/stub";
import {
  aiModelOutputSchema,
  normalizeAiModelOutput,
  type AiCoachDraftResult,
} from "@/features/ai-coach/validation";

export type GenerateDraftOutcome =
  | { ok: true; value: AiCoachDraftResult; tokenEstimate: number }
  | {
      ok: false;
      code: "unavailable" | "timeout" | "invalid" | "provider";
      error: string;
    };

export async function generateAiCoachDraft(input: {
  prompt: string;
  context: AiCoachAthleteContext;
}): Promise<GenerateDraftOutcome> {
  const resolved = resolveAiCoachModel();

  if (resolved.kind === "unavailable") {
    return { ok: false, code: "unavailable", error: resolved.reason };
  }

  if (resolved.kind === "stub") {
    return {
      ok: true,
      value: generateStubDraft(input.prompt),
      tokenEstimate: 0,
    };
  }

  try {
    const result = await generateObject({
      model: resolved.model,
      schema: aiModelOutputSchema,
      schemaName: "ForgeAiCoachDraft",
      schemaDescription:
        "Coach message plus optional routine draft for athlete review",
      system: input.context.systemPrompt,
      prompt: `${input.context.userContextBlock}\n\nAthlete request:\n${input.prompt}`,
      maxOutputTokens: getAiCoachMaxOutputTokens(),
      abortSignal: AbortSignal.timeout(getAiCoachTimeoutMs()),
    });

    const normalized = normalizeAiModelOutput(result.object);
    if (!normalized.ok) {
      return { ok: false, code: "invalid", error: normalized.error };
    }

    const usage = result.usage;
    const tokenEstimate =
      (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);

    return {
      ok: true,
      value: normalized.value,
      tokenEstimate,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      return {
        ok: false,
        code: "timeout",
        error: "The coach took too long. Try again.",
      };
    }

    return {
      ok: false,
      code: "provider",
      error: "Coach is unavailable right now. Try again in a moment.",
    };
  }
}
