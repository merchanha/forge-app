import type { AiCoachDraftResult } from "@/features/ai-coach/validation";
import { normalizeAiModelOutput } from "@/features/ai-coach/validation";

/**
 * Deterministic local drafts for CI / no-key development.
 * Mirrors design-board prompt themes without calling a vendor.
 */
export function generateStubDraft(prompt: string): AiCoachDraftResult {
  const text = prompt.trim();

  if (/Analyze/i.test(text)) {
    return {
      coachMessage:
        "Last month: several completed sessions are on file. Keep comparing like-for-like metrics (For Time vs For Time, AMRAP duration matches). I can draft a follow-up session if you want one.",
      draft: null,
    };
  }

  if (/pace|running/i.test(text) && !/HYROX/i.test(text)) {
    const normalized = normalizeAiModelOutput({
      coachMessage:
        "Add one threshold session a week and keep the rest easy. Here is a starting run you can edit before saving.",
      includeDraft: true,
      draft: {
        name: "Threshold Run Builder",
        description: "Easy warm-up, threshold repeats, easy cooldown.",
        category: "running",
        tags: ["running", "threshold"],
        objective: "Threshold pace practice",
        equipment: "Road or track",
        scaling: "Shorten repeats if needed",
        effortRpe: 7,
        sections: [
          {
            name: "Warm-up",
            format: "custom",
            timerMode: "countdown",
            durationSeconds: 600,
            exercises: [
              {
                exerciseName: "Easy Jog",
                quantity: 10,
                quantityUnit: "min",
                notes: "Nasal breathing, easy",
              },
            ],
          },
          {
            name: "Threshold",
            format: "intervals",
            workSeconds: 300,
            restSeconds: 90,
            rounds: 4,
            exercises: [
              {
                exerciseName: "Threshold Run",
                quantity: 1,
                quantityUnit: "km",
                targetPaceSecondsPerKm: 270,
                hrZone: "Z3",
                notes: "Just under 10k pace",
              },
            ],
          },
          {
            name: "Cooldown",
            format: "custom",
            timerMode: "countdown",
            durationSeconds: 300,
            exercises: [
              {
                exerciseName: "Easy Jog",
                quantity: 5,
                quantityUnit: "min",
                notes: "",
              },
            ],
          },
        ],
      },
    });
    if (!normalized.ok) {
      return { coachMessage: normalized.error, draft: null };
    }
    return normalized.value;
  }

  if (/HYROX/i.test(text)) {
    const normalized = normalizeAiModelOutput({
      coachMessage:
        "Drafted a compact HYROX pace builder. Review stations and pacing — Edit to tweak, or Save to My Training when it looks right.",
      includeDraft: true,
      draft: {
        name: "HYROX 30 · Pace Builder",
        description: "Short stations with controlled run legs.",
        category: "hyrox",
        tags: ["hyrox", "engine"],
        objective: "Station + run practice",
        equipment: "Sled, wall balls, rower",
        scaling: "Reduce load or distance",
        effortRpe: 7,
        sections: [
          {
            name: "Warm-up",
            format: "custom",
            timerMode: "countdown",
            durationSeconds: 300,
            exercises: [
              {
                exerciseName: "Easy Jog",
                quantity: 5,
                quantityUnit: "min",
                notes: "Dynamic mobility",
              },
            ],
          },
          {
            name: "HYROX Piece",
            format: "rounds_for_time",
            rounds: 3,
            timeCapSeconds: 1800,
            exercises: [
              {
                exerciseName: "Run",
                quantity: 1,
                quantityUnit: "km",
                targetPaceSecondsPerKm: 290,
                notes: "",
              },
              {
                exerciseName: "Wall Ball",
                quantity: 25,
                quantityUnit: "reps",
                notes: "",
              },
              {
                exerciseName: "Ski Erg",
                quantity: 500,
                quantityUnit: "m",
                notes: "",
              },
            ],
          },
          {
            name: "Cooldown",
            format: "custom",
            timerMode: "none",
            exercises: [
              {
                exerciseName: "Walk",
                quantity: 5,
                quantityUnit: "min",
                notes: "Easy breathing",
              },
            ],
          },
        ],
      },
    });
    if (!normalized.ok) {
      return { coachMessage: normalized.error, draft: null };
    }
    return normalized.value;
  }

  if (/strength/i.test(text)) {
    const normalized = normalizeAiModelOutput({
      coachMessage:
        "Here is a beginner-friendly strength block. Confirm loads in the builder before you save.",
      includeDraft: true,
      draft: {
        name: "Beginner Strength Block",
        description: "Squat, hinge, press — simple progression.",
        category: "crossfit",
        tags: ["strength"],
        objective: "Build base strength",
        equipment: "Barbell, rack",
        scaling: "Reduce load",
        effortRpe: 6,
        sections: [
          {
            name: "Strength",
            format: "strength",
            sets: 5,
            reps: 5,
            restSeconds: 150,
            rpe: 7,
            exercises: [
              {
                exerciseName: "Back Squat",
                quantity: 5,
                quantityUnit: "reps",
                loadValue: 60,
                loadUnit: "kg",
                notes: "",
              },
            ],
          },
          {
            name: "Accessory",
            format: "strength",
            sets: 3,
            reps: 8,
            restSeconds: 90,
            exercises: [
              {
                exerciseName: "Romanian Deadlift",
                quantity: 8,
                quantityUnit: "reps",
                loadValue: 40,
                loadUnit: "kg",
                notes: "",
              },
              {
                exerciseName: "Push Press",
                quantity: 8,
                quantityUnit: "reps",
                loadValue: 30,
                loadUnit: "kg",
                notes: "",
              },
            ],
          },
        ],
      },
    });
    if (!normalized.ok) {
      return { coachMessage: normalized.error, draft: null };
    }
    return normalized.value;
  }

  const normalized = normalizeAiModelOutput({
    coachMessage:
      "Here is a starting metcon. Tell me your equipment limits and I can refine it — nothing is stored until you Save to My Training.",
    includeDraft: true,
    draft: {
      name: "Engine Builder",
      description: "Mixed modal conditioning.",
      category: "crossfit",
      tags: ["metcon"],
      objective: "General conditioning",
      equipment: "Barbell, pull-up bar, rower",
      scaling: "Scale gymnastics and load",
      effortRpe: 7,
      sections: [
        {
          name: "Warm-up",
          format: "custom",
          timerMode: "countdown",
          durationSeconds: 300,
          exercises: [
            {
              exerciseName: "Easy Jog",
              quantity: 400,
              quantityUnit: "m",
              notes: "",
            },
          ],
        },
        {
          name: "Metcon",
          format: "amrap",
          durationSeconds: 720,
          exercises: [
            {
              exerciseName: "Power Clean",
              quantity: 10,
              quantityUnit: "reps",
              loadValue: 40,
              loadUnit: "kg",
              notes: "",
            },
            {
              exerciseName: "Pull-Up",
              quantity: 10,
              quantityUnit: "reps",
              notes: "",
            },
            {
              exerciseName: "Box Jump",
              quantity: 15,
              quantityUnit: "reps",
              notes: "",
            },
          ],
        },
      ],
    },
  });

  if (!normalized.ok) {
    return { coachMessage: normalized.error, draft: null };
  }
  return normalized.value;
}
