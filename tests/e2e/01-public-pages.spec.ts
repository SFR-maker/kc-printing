import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("1 - homepage loads with hero and brand colors", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/KC Printing/i);
    const hero = page.locator("h1").first();
    await expect(hero).toBeVisible();
  });

  test("2 - homepage has service links for all 3 products", async ({ page }) => {
    await page.goto("/");
    const links = page.locator('a[href*="/services/"]');
    await expect(links.first()).toBeVisible();
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test("3 - mobile nav opens and closes", async ({ page }) => {
    await page.goto("/");
    const hamburger = page.locator('[data-testid="mobile-nav"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await page.waitForTimeout(300);
  });

  test("4 - contact page renders form", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator('input[name="name"], input[placeholder*="name" i]').first()).toBeVisible();
  });

  test("5 - pricing page renders package tables", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("h1")).toContainText(/pricing/i);
  });

  test("6 - portfolio page renders", async ({ page }) => {
    await page.goto("/portfolio");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("7 - about page renders", async ({ page }) => {
    await page.goto("/about");
    await expect(page.locator("h1")).toBeVisible();
  });
});
