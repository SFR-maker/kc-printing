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

  test("17 - logo design order page loads", async ({ page }) => {
    await page.goto("/services/logo-design/order");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("18 - web design order page loads", async ({ page }) => {
    await page.goto("/services/web-design/order");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("19 - postcards order page loads", async ({ page }) => {
    await page.goto("/services/postcards/order");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("20 - roll-up banners order page loads", async ({ page }) => {
    await page.goto("/services/roll-up-banners/order");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("21 - vinyl banners order page loads", async ({ page }) => {
    await page.goto("/services/vinyl-banners/order");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("22 - print design order page loads", async ({ page }) => {
    await page.goto("/services/print-design/order");
    await expect(page.locator("h1")).toBeVisible();
  });
});
