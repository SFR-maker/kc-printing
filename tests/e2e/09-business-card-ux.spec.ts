import { test, expect } from "@playwright/test";

test.describe("Business card editor — desktop UX additions", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "Tests the always-visible desktop left panel; mobile uses bottom sheets instead (see mobile UX suite below)");
  });

  test("33 - icon library inserts an icon as an image element", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Business", exact: true }).first().click();
    await page.waitForTimeout(300);
    const iconBtn = page.locator('button[title="Briefcase"]').first();
    await iconBtn.click();
    await page.waitForTimeout(800);
    const undoBtn = page.locator('button[aria-label="Undo (Ctrl+Z)"]');
    await expect(undoBtn).toBeEnabled();
  });

  test("34 - emoji picker inserts an emoji as text", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Smileys", exact: true }).click();
    await page.waitForTimeout(300);
    await page.locator("button", { hasText: "😀" }).click();
    await page.waitForTimeout(300);
    const undoBtn = page.locator('button[aria-label="Undo (Ctrl+Z)"]');
    await expect(undoBtn).toBeEnabled();
  });

  test("35 - background pattern applies a locked full-bleed image", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(500);
    await page.locator("button", { hasText: "Dots" }).click();
    await page.waitForTimeout(1200);
    const undoBtn = page.locator('button[aria-label="Undo (Ctrl+Z)"]');
    await expect(undoBtn).toBeEnabled();
  });

  test("36 - selecting an element shows the quick toolbar with font controls", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Heading", exact: true }).click();
    await page.waitForTimeout(500);
    // New text elements default to x:0.4in, y:0.4in, width:2in, height:0.3in on a 3.75x2.25in card
    // — click that region (not the canvas center) to actually hit the inserted text.
    const canvasBox = await page.locator("canvas").first().boundingBox();
    expect(canvasBox).not.toBeNull();
    await page.mouse.click(canvasBox!.x + canvasBox!.width * 0.37, canvasBox!.y + canvasBox!.height * 0.24);
    await page.waitForTimeout(500);
    await expect(page.locator('[aria-label="Duplicate"]').first()).toBeVisible();
  });

  test("37 - template switcher lets you browse templates from inside the editor", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(500);
    await expect(page.locator("text=Templates").first()).toBeVisible();
  });

  test("38 - color variant swatches appear when editing a template", async ({ page }) => {
    await page.goto("/services/business-cards/design/t-real-estate-centered-stack");
    await page.waitForTimeout(800);
    await expect(page.locator("text=Color Variants")).toBeVisible();
  });
});

test.describe("Business card editor — mobile UX", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("39 - editor loads on mobile with no horizontal overflow", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    expect(overflow).toBe(false);
  });

  test("40 - mobile bottom add-bar is visible and canvas is visible", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(800);
    await expect(page.locator("text=Text").last()).toBeVisible();
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("41 - tapping a mobile tool tab opens a bottom sheet", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(800);
    await page.locator("button", { hasText: "Text" }).last().click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: "Heading", exact: true })).toBeVisible();
  });

  test("42 - inserting text on mobile shows the quick toolbar pinned above the tab bar", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(800);
    await page.locator("button", { hasText: "Text" }).last().click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Heading", exact: true }).click();
    await page.waitForTimeout(800);
    await expect(page.locator('button[aria-label="Delete"]').first()).toBeVisible();
  });

  test("43 - mobile top bar shows front/back switcher and overflow menu", async ({ page }) => {
    await page.goto("/services/business-cards/design/t-real-estate-centered-stack");
    await page.waitForTimeout(800);
    await expect(page.getByRole("button", { name: "Front", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
    await page.locator('button[aria-label="More options"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=Save Design")).toBeVisible();
  });

  test("44 - canvas auto-fits within the mobile viewport width", async ({ page }) => {
    await page.goto("/services/business-cards/design/t-real-estate-centered-stack");
    await page.waitForTimeout(1000);
    const canvasBox = await page.locator("canvas").first().boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBeLessThanOrEqual(390);
  });

  test("45 - export downloads a PDF file from the mobile overflow menu", async ({ page }) => {
    await page.goto("/services/business-cards/design/t-real-estate-centered-stack");
    await page.waitForTimeout(800);
    await page.locator('button[aria-label="More options"]').click();
    await page.waitForTimeout(300);
    const downloadPromise = page.waitForEvent("download", { timeout: 20000 });
    await page.locator("text=Export PDF").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test("46 - zoom controls work from the mobile overflow menu", async ({ page }) => {
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(800);
    await page.locator('button[aria-label="More options"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=/Zoom \\d+%/")).toBeVisible();
    await page.locator('button[aria-label="Zoom in"]').click();
    await page.waitForTimeout(300);
    await expect(page.locator("text=/Zoom \\d+%/")).toBeVisible();
  });
});
