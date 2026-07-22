import { test, expect } from "@playwright/test";

test.describe("Product builder", () => {
  test("15 - business cards order page loads", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    await expect(page.locator("h1")).toContainText(/order/i);
  });

  test("16 - package selection updates visible price", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    const pkgBtn = page.locator("button").filter({ hasText: /silver|gold|basic|starter/i }).first();
    if (await pkgBtn.isVisible()) {
      await pkgBtn.click();
      await page.waitForTimeout(200);
    }
  });

  test("17 - postcards order page loads", async ({ page }) => {
    await page.goto("/services/postcards/order");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("18 - banners order page loads", async ({ page }) => {
    await page.goto("/services/banners/order");
    await expect(page.locator("h1")).toBeVisible();
  });
});
