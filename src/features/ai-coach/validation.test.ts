import { describe, expect, it } from "vitest";

import { generateStubDraft } from "@/features/ai-coach/provider/stub";
import {
  aiCoachPromptSchema,
  normalizeAiModelOutput,
} from "@/features/ai-coach/validation";

describe("aiCoachPromptSchema", () => {
  it("accepts a normal prompt", () => {
    const parsed = aiCoachPromptSchema.safeParse("Build a 30-min HYROX piece");
    expect(parsed.success).toBe(true);
  });

  it("rejects empty prompts", () => {
    const parsed = aiCoachPromptSchema.safeParse("   ");
    expect(parsed.success).toBe(false);
  });
});

describe("normalizeAiModelOutput", () => {
  it("normalizes a valid HYROX-style draft", () => {
    const result = normalizeAiModelOutput({
      coachMessage: "Here is a draft.",
      includeDraft: true,
      draft: {
        name: "HYROX Pace",
        description: "",
        category: "hyrox",
        tags: ["hyrox"],
        objective: "",
        equipment: "",
        scaling: "",
        effortRpe: 7,
        sections: [
          {
            name: "Piece",
            format: "rounds_for_time",
            rounds: 3,
            timeCapSeconds: 1800,
            exercises: [
              {
                exerciseName: "Run",
                quantity: 1,
                quantityUnit: "km",
                notes: "",
              },
            ],
          },
        ],
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.draft?.name).toBe("HYROX Pace");
    expect(result.value.draft?.sections[0]?.format).toBe("rounds_for_time");
    expect(result.value.draft?.sections[0]?.formatConfig).toEqual({
      rounds: 3,
      timeCapSeconds: 1800,
    });
  });

  it("rejects invalid EMOM duration/interval pairing", () => {
    const result = normalizeAiModelOutput({
      coachMessage: "Draft",
      includeDraft: true,
      draft: {
        name: "Bad EMOM",
        description: "",
        category: "crossfit",
        tags: [],
        sections: [
          {
            name: "EMOM",
            format: "emom",
            durationSeconds: 700,
            intervalSeconds: 60,
            exercises: [],
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
  });

  it("allows message-only replies", () => {
    const result = normalizeAiModelOutput({
      coachMessage: "Keep comparing like metrics.",
      includeDraft: false,
      draft: null,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.draft).toBeNull();
    }
  });
});

describe("generateStubDraft", () => {
  it("returns a HYROX draft for HYROX prompts", () => {
    const draft = generateStubDraft("Build a 30-min HYROX piece from my 10k pace");
    expect(draft.draft?.category).toBe("hyrox");
    expect(draft.draft?.sections.length).toBeGreaterThan(0);
  });

  it("returns message-only for analyze prompts", () => {
    const draft = generateStubDraft("Analyze last month");
    expect(draft.draft).toBeNull();
    expect(draft.coachMessage.length).toBeGreaterThan(10);
  });

  it("returns a CrossFit draft with named movements", () => {
    const draft = generateStubDraft("Recommend a CrossFit session for today");
    expect(draft.draft?.category).toBe("crossfit");
    const names =
      draft.draft?.sections.flatMap((section) =>
        section.exercises.map((exercise) => exercise.exerciseName),
      ) ?? [];
    expect(names.length).toBeGreaterThan(0);
  });
});
