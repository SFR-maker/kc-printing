import { test, expect } from "@playwright/test";

test.describe("Auth protection", () => {
  test("27 - sign-in page loads", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("28 - sign-up page loads", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page).toHaveURL(/sign-up/);
  });

  test("29 - /account redirects to sign-in if unauthenticated", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("30 - /admin redirects unauthenticated users", async ({ page }) => {
    await page.goto("/admin");
    const url = page.url();
    expect(url).toMatch(/sign-in|account/);
  });
});
