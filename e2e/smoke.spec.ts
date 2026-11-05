import { expect, test } from "@playwright/test";

test("login page renders FORGE auth shell", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveTitle(/FORGE/i);
  await expect(page.getByText("FORGE").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Welcome\s+back/i }),
  ).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Show password" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
});

test("unauthenticated users are redirected away from /app", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
});
