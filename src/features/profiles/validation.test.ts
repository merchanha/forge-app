import { describe, expect, it } from "vitest";

import { updateProfileSchema } from "@/features/profiles/validation";

describe("updateProfileSchema", () => {
  it("accepts kg/lb units and dark/light theme", () => {
    expect(
      updateProfileSchema.safeParse({
        displayName: "Andres",
        preferredUnits: "kg",
        theme: "dark",
        experienceLevel: "advanced",
        disciplines: ["CrossFit", "HYROX"],
        primaryDiscipline: "CrossFit",
        goal: "competition",
        daysPerWeek: 5,
        targetEvent: "Open qualifier",
      }).success,
    ).toBe(true);

    expect(
      updateProfileSchema.safeParse({
        displayName: "Andres",
        preferredUnits: "lb",
        theme: "light",
        experienceLevel: "",
        disciplines: [],
        primaryDiscipline: "",
        goal: "",
        daysPerWeek: "",
        targetEvent: "",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown units or theme", () => {
    expect(
      updateProfileSchema.safeParse({
        displayName: "Andres",
        preferredUnits: "stone",
        theme: "dark",
      }).success,
    ).toBe(false);

    expect(
      updateProfileSchema.safeParse({
        displayName: "Andres",
        preferredUnits: "kg",
        theme: "system",
      }).success,
    ).toBe(false);
  });

  it("rejects primary discipline outside the selected list", () => {
    const result = updateProfileSchema.safeParse({
      displayName: "Andres",
      preferredUnits: "kg",
      theme: "dark",
      disciplines: ["Running"],
      primaryDiscipline: "CrossFit",
    });

    expect(result.success).toBe(false);
  });

  it("parses comma-separated disciplines from form data", () => {
    const result = updateProfileSchema.safeParse({
      displayName: "Andres",
      preferredUnits: "kg",
      theme: "dark",
      disciplines: "CrossFit,Strength",
      primaryDiscipline: "CrossFit",
      daysPerWeek: "3",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.disciplines).toEqual(["CrossFit", "Strength"]);
      expect(result.data.daysPerWeek).toBe(3);
    }
  });

  it("rejects days per week outside 1–7", () => {
    expect(
      updateProfileSchema.safeParse({
        displayName: "Andres",
        preferredUnits: "kg",
        theme: "dark",
        daysPerWeek: 0,
      }).success,
    ).toBe(false);

    expect(
      updateProfileSchema.safeParse({
        displayName: "Andres",
        preferredUnits: "kg",
        theme: "dark",
        daysPerWeek: 8,
      }).success,
    ).toBe(false);
  });
});
