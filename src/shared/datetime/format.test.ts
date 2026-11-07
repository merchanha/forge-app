import { describe, expect, it } from "vitest";

import {
  formatUtcDate,
  formatUtcDateTime,
  wallClockToIso,
} from "@/shared/datetime/format";

describe("formatUtcDate", () => {
  it("slices ISO timestamps without Date APIs", () => {
    expect(formatUtcDate("2026-11-07T15:42:00.000Z")).toBe("2026-11-07");
    expect(formatUtcDateTime("2026-11-07T15:42:00.000Z")).toBe(
      "2026-11-07 15:42 UTC",
    );
  });
});

describe("wallClockToIso", () => {
  it("round-trips a known UTC ms value", () => {
    expect(wallClockToIso(0)).toBe("1970-01-01T00:00:00.000Z");
  });
});
