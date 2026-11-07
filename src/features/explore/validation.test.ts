import { describe, expect, it } from "vitest";

import { exploreTemplateIdSchema } from "@/features/explore/validation";

describe("exploreTemplateIdSchema", () => {
  it("accepts a uuid", () => {
    const parsed = exploreTemplateIdSchema.safeParse(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-uuid", () => {
    const parsed = exploreTemplateIdSchema.safeParse("helen-style");
    expect(parsed.success).toBe(false);
  });
});
