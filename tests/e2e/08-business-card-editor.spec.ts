import { test, expect } from "@playwright/test";

test.describe("Business card design studio", () => {
  test("23 - template gallery loads with templates and filters", async ({ page }) => {
    await page.goto("/services/business-cards/design");
    await expect(page.locator("h1")).toContainText(/design your business card/i);
    await expect(page.locator("img[alt]").first()).toBeVisible({ timeout: 15000 });
    const cardCount = await page.locator("a[href^='/services/business-cards/design/t-']").count();
    expect(cardCount).toBeGreaterThan(10);
  });

  test("24 - filtering by industry narrows results", async ({ page }) => {
    await page.goto("/services/business-cards/design");
    await page.locator("img[alt]").first().waitFor({ timeout: 15000 });
    const before = await page.locator("a[href^='/services/business-cards/design/t-']").count();
    await page.locator("select").first().selectOption("real-estate");
    await page.waitForTimeout(300);
    const after = await page.locator("a[href^='/services/business-cards/design/t-']").count();
    expect(after).toBeLessThan(before);
    expect(after).toBe(5);
  });

  test("25 - opening a template loads the canvas editor", async ({ page }) => {
    await page.goto("/services/business-cards/design/t-real-estate-centered-stack");
    await expect(page.locator("text=Front").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("26 - blank editor loads with empty canvas and tool panel", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await expect(page.locator("text=Text").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("text=Add QR Code")).toBeVisible();
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("27 - adding text updates the canvas and enables undo", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.getByRole("button", { name: "Heading", exact: true }).click();
    await page.waitForTimeout(300);
    const undoBtn = page.locator('button[aria-label="Undo (Ctrl+Z)"]');
    await expect(undoBtn).toBeEnabled();
  });

  test("28 - switching between front and back works", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(300);
    await page.locator("button", { hasText: "Back" }).click();
    await expect(page.locator("button", { hasText: "Back" })).toHaveClass(/bg-white/);
  });

  test("29 - zoom controls change zoom percentage", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await expect(page.locator("text=100%")).toBeVisible({ timeout: 15000 });
    await page.locator('button[aria-label="Zoom in"]').click();
    await expect(page.locator("text=100%")).not.toBeVisible();
  });

  test("30 - export downloads a PDF file", async ({ page }) => {
    await page.goto("/services/business-cards/design/t-real-estate-centered-stack");
    await page.waitForTimeout(500);
    const downloadPromise = page.waitForEvent("download", { timeout: 20000 });
    await page.locator("button", { hasText: "Export" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test("31 - continue to review shows the proof screen with confirm checkbox", async ({ page }) => {
    await page.goto("/services/business-cards/design/t-real-estate-centered-stack");
    await page.waitForTimeout(500);
    await page.locator("button", { hasText: "Continue" }).click();
    await expect(page.locator("text=Review Your Design")).toBeVisible();
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();
    const continueBtn = page.locator("button", { hasText: "Confirm and Continue to Order" });
    await expect(continueBtn).toBeDisabled();
    await page.locator('input[type="checkbox"]').check();
    await expect(continueBtn).toBeEnabled();
  });

  test("32 - business card service page links to the design studio", async ({ page }) => {
    await page.goto("/services/business-cards");
    await expect(page.locator("a", { hasText: "Design It Yourself" })).toBeVisible();
  });
});
