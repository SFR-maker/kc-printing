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
    /*
     * A range, not a fixed count.
     *
     * This asserted exactly 9 - the procedural and AI archetypes that existed when it was written.
     * The photographic library has since added ten more per industry, so the number moved and the
     * test failed for a library that had grown, which is not a defect. What matters is that the
     * filter narrows and still returns a usable set.
     */
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  });

  test("25 - opening a template loads the canvas editor", async ({ page }) => {
    await page.goto("/services/business-cards/design/t-real-estate-centered-stack");
    await expect(page.locator("text=Front").first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("26 - blank editor loads with empty canvas and tool panel", async ({ page }, testInfo) => {
    await page.goto("/services/business-cards/design/new");
    await expect(page.locator("text=Text").first()).toBeVisible({ timeout: 15000 });
    if (testInfo.project.name === "mobile-chrome") {
      // Tools live in bottom sheets on mobile rather than an always-visible panel; "Add QR Code"
      // only appears once its sheet is opened, so just confirm the tab bar itself is present.
      await expect(page.getByRole("button", { name: "QR", exact: true })).toBeVisible();
    } else {
      await expect(page.locator("text=Add QR Code")).toBeVisible();
    }
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("27 - adding text updates the canvas and enables undo", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "Desktop-only left panel; mobile equivalent covered in 09-business-card-ux.spec.ts");
    await page.goto("/services/business-cards/design/new");
    await page.getByRole("button", { name: "Heading", exact: true }).click();
    await page.waitForTimeout(300);
    const undoBtn = page.locator('button[aria-label="Undo (Ctrl+Z)"]');
    await expect(undoBtn).toBeEnabled();
  });

  test("28 - switching between front and back works", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "Desktop TopCommandBar; mobile equivalent covered in 09-business-card-ux.spec.ts");
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(300);
    // Targeted by role, not by text: the toolbar now also carries an "Add back" / "Remove back"
    // button, so `button` filtered on "Back" matches two things. The tab's accessible name stays
    // exactly "Back" whatever is on the face - the "empty" hint beside it is aria-hidden.
    const back = page.getByRole("tab", { name: "Back" });
    await back.click();
    // Asserted on aria-selected, not on a class name: bg-white is what the *inactive* tab wears, so
    // this assertion was checking that clicking Back did nothing.
    await expect(back).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "Front" })).toHaveAttribute("aria-selected", "false");
  });

  test("29 - zoom controls change zoom percentage", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "Desktop TopCommandBar; mobile zoom lives in the overflow menu, covered in 09-business-card-ux.spec.ts");
    await page.goto("/services/business-cards/design/new");
    // The canvas auto-fits to the available space on load, so zoom won't always read exactly
    // 100% — capture whatever it starts at and just confirm zooming in actually changes it.
    const zoomText = page.locator("text=/^\\d+%$/");
    await expect(zoomText).toBeVisible({ timeout: 15000 });
    const before = await zoomText.textContent();
    await page.locator('button[aria-label="Zoom in"]').click();
    await expect(zoomText).not.toHaveText(before ?? "");
  });

  test("30 - export downloads a PDF file", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "Desktop TopCommandBar; mobile export lives in the overflow menu, covered in 09-business-card-ux.spec.ts");
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
    // Assert the destination, not the label. CTA copy is deliberately standardised across the site
    // (one label per intent) and has changed once already; the link target is what this test cares
    // about.
    await expect(
      page.locator('a[href="/services/business-cards/design"]:visible').first()
    ).toBeVisible();
  });
});
