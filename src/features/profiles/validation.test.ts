import { describe, expect, it } from "vitest";

import { updateProfileSchema } from "@/features/profiles/validation";

describe("updateProfileSchema", () => {
  it("accepts kg and lb units", () => {
    expect(
      updateProfileSchema.safeParse({
        displayName: "Andres",
        preferredUnits: "kg",
      }).success,
    ).toBe(true);

    expect(
      updateProfileSchema.safeParse({
        displayName: "Andres",
        preferredUnits: "lb",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown units", () => {
    const result = updateProfileSchema.safeParse({
      displayName: "Andres",
      preferredUnits: "stone",
    });

    expect(result.success).toBe(false);
  });
});
