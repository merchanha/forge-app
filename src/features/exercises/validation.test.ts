import { describe, expect, it } from "vitest";

import {
  exerciseInputSchema,
  isAllowedDemoUrl,
} from "@/features/exercises/validation";

const validExercise = {
  name: "Power Clean",
  description: "Olympic lift from the floor to the shoulders.",
  movementCategory: "olympic",
  equipment: "Barbell",
  demoUrl: "",
};

describe("isAllowedDemoUrl", () => {
  it.each([
    "https://www.youtube.com/watch?v=aaaaaaaaaaa",
    "https://m.youtube.com/watch?v=aaaaaaaaaaa",
    "https://youtube.com/embed/aaaaaaaaaaa",
    "https://youtube.com/shorts/aaaaaaaaaaa",
    "https://youtube.com/live/aaaaaaaaaaa",
    "https://youtube.com/v/aaaaaaaaaaa",
    "https://youtu.be/aaaaaaaaaaa",
    "https://youtu.be/aaaaaaaaaaa?si=clip",
    "https://www.youtube-nocookie.com/embed/aaaaaaaaaaa",
    "https://youtube-nocookie.com/embed/aaaaaaaaaaa",
    "https://vimeo.com/123456789",
    "https://www.vimeo.com/123456789",
    "https://player.vimeo.com/video/123456789",
    "https://vimeo.com/channels/staffpicks/123456789",
  ])("accepts %s", (value) => {
    expect(isAllowedDemoUrl(value)).toBe(true);
  });

  it.each([
    "",
    "http://www.youtube.com/watch?v=aaaaaaaaaaa",
    "https://www.youtube.com/watch?v=short",
    "https://youtube.com/playlist?list=PLabcdefghij",
    "https://youtu.be/",
    "https://user:pass@www.youtube.com/watch?v=aaaaaaaaaaa",
    "https://www.youtube.com:444/watch?v=aaaaaaaaaaa",
    "https://youtube.com.evil.com/watch?v=aaaaaaaaaaa",
    "https://evil.com/watch?v=aaaaaaaaaaa",
    "javascript:alert(1)",
    "https://vimeo.com/not-a-video",
    "https://player.vimeo.com/video/123",
    "https://vimeo.com.evil.com/123456789",
  ])("rejects %s", (value) => {
    expect(isAllowedDemoUrl(value)).toBe(false);
  });
});

describe("exerciseInputSchema", () => {
  it("trims fields and treats a blank demo link as empty", () => {
    const result = exerciseInputSchema.safeParse({
      ...validExercise,
      name: "  Power Clean  ",
      description: "  ",
      equipment: " Barbell ",
      demoUrl: "   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        name: "Power Clean",
        description: "",
        movementCategory: "olympic",
        equipment: "Barbell",
        demoUrl: null,
      });
    }
  });

  it("accepts a YouTube demo link", () => {
    const result = exerciseInputSchema.safeParse({
      ...validExercise,
      demoUrl: "https://www.youtube.com/watch?v=aaaaaaaaaaa",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.demoUrl).toBe(
        "https://www.youtube.com/watch?v=aaaaaaaaaaa",
      );
    }
  });

  it("rejects an http demo link", () => {
    const result = exerciseInputSchema.safeParse({
      ...validExercise,
      demoUrl: "http://www.youtube.com/watch?v=aaaaaaaaaaa",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an empty name and an unknown category", () => {
    const result = exerciseInputSchema.safeParse({
      ...validExercise,
      name: "   ",
      movementCategory: "cardio",
    });

    expect(result.success).toBe(false);
  });

  it("rejects equipment and descriptions that are too long", () => {
    const equipment = exerciseInputSchema.safeParse({
      ...validExercise,
      equipment: "x".repeat(41),
    });
    const description = exerciseInputSchema.safeParse({
      ...validExercise,
      description: "x".repeat(501),
    });

    expect(equipment.success).toBe(false);
    expect(description.success).toBe(false);
  });
});
