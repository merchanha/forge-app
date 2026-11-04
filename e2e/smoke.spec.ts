import { expect, test } from "@playwright/test";

test("home page renders FORGE foundation shell", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/FORGE/i);
  await expect(
    page.getByRole("heading", { name: "FORGE", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Visual tokens", level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start Workout" }),
  ).toBeVisible();
});
