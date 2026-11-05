import { describe, expect, it } from "vitest";

import { loginSchema, registerSchema } from "@/features/auth/validation";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      displayName: "Maya",
      email: "maya@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a short password", () => {
    const result = registerSchema.safeParse({
      displayName: "Maya",
      email: "maya@example.com",
      password: "short",
    });

    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a valid login payload", () => {
    const result = loginSchema.safeParse({
      email: "maya@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "maya@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});
