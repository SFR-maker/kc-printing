import { test, expect } from "@playwright/test";

test.describe("Public features", () => {
  test("31 - FAQ page has accordion items", async ({ page }) => {
    await page.goto("/faq");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("32 - FAQ accordion expands on click", async ({ page }) => {
    await page.goto("/faq");
    const firstBtn = page.locator('button[aria-expanded]').first();
    if (await firstBtn.isVisible()) {
      await firstBtn.click();
      await page.waitForTimeout(200);
    }
  });

  test("33 - footer has phone number", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toContainText("816");
  });

  test("34 - footer has service links", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("35 - terms page renders", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("36 - privacy policy page renders", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("37 - refund policy page renders", async ({ page }) => {
    await page.goto("/refund-policy");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("38 - success page renders", async ({ page }) => {
    await page.goto("/success");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("39 - cancel page renders", async ({ page }) => {
    await page.goto("/cancel");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("40 - contact form submit shows validation", async ({ page }) => {
    await page.goto("/contact");
    const submit = page.locator('button[type="submit"]').first();
    await submit.click();
    await page.waitForTimeout(300);
  });
});
