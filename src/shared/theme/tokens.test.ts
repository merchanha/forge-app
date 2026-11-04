import { describe, expect, it } from "vitest";

import {
  forgeColors,
  forgeRadii,
  forgeSpacing,
  forgeTapTargetMinPx,
} from "./tokens";

describe("forge design tokens", () => {
  it("uses Forge orange as the dark accent", () => {
    expect(forgeColors.accent).toBe("#FF5A1F");
  });

  it("keeps dark ground and surface distinct", () => {
    expect(forgeColors.ground).toBe("#0C0C0E");
    expect(forgeColors.surface).toBe("#16161A");
    expect(forgeColors.ground).not.toBe(forgeColors.surface);
  });

  it("defines timer phase colors", () => {
    expect(forgeColors.work).toBe("#FF5A1F");
    expect(forgeColors.rest).toBe("#4CC3E8");
    expect(forgeColors.done).toBe("#F4F2EE");
  });

  it("matches visual system spacing and radius scales", () => {
    expect(forgeSpacing[1]).toBe("4px");
    expect(forgeSpacing[6]).toBe("24px");
    expect(forgeRadii.md).toBe("12px");
    expect(forgeRadii.pill).toBe("9999px");
  });

  it("enforces a 48px minimum tap target", () => {
    expect(forgeTapTargetMinPx).toBe(48);
  });
});
