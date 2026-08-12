import { test, expect, type Page } from "@playwright/test";

/**
 * Keyboard and screen-reader cover for the order flow.
 *
 * Every assertion here corresponds to a defect a keyboard-only QA pass actually hit. They are worth
 * keeping because none of them is visible: the page looked fine throughout, and the whole flow was
 * operable by mouse. What was broken was what the flow *said* - the price changed in silence, a
 * required-field error was rendered but never announced, and focus was dropped to the body at every
 * step change so the next Tab restarted from the top of the document.
 */

/** The summary's own announcement. Next renders its own route announcer, which is not ours. */
const liveRegion = (page: Page) => page.locator('[aria-live="polite"].sr-only').first();

test.describe("the price is perceivable without sight", () => {
  test("the running total is announced, once", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    await page.waitForTimeout(1200);

    // Exactly one, or a screen reader hears every price twice: the panel renders a desktop rail and
    // a mobile bar into the same DOM and hides one with CSS, and CSS does not silence a live region.
    await expect(page.locator('[aria-live="polite"].sr-only')).toHaveCount(1);

    await page.getByLabel("Quantity").click();
    await page.getByRole("option", { name: "250 cards", exact: true }).click();
    await page.waitForTimeout(1000);

    // The total and what it buys, not a bare number - "sixteen eighty" alone says nothing.
    await expect(liveRegion(page)).toContainText(/\$\d+\.\d{2}/);
    await expect(liveRegion(page)).toContainText("250 cards");
  });

  test("the announcement follows the configuration", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    await page.getByLabel("Quantity").click();
    await page.getByRole("option", { name: "250 cards", exact: true }).click();
    await page.waitForTimeout(1000);
    const before = await liveRegion(page).innerText();

    await page.getByRole("radio", { name: /Both sides/ }).click();
    await page.waitForTimeout(1000);
    expect(await liveRegion(page).innerText(), "the price changed silently").not.toBe(before);
  });

  test("says what is missing before a price exists", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    await page.waitForTimeout(1000);
    await expect(liveRegion(page)).toContainText(/quantity/i);
  });
});

test.describe("keyboard operation", () => {
  test("the skip link moves the reading position, not just the tab point", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "No hardware keyboard on the mobile profile");
    await page.goto("/services/business-cards/order");
    await page.waitForTimeout(600);
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);
    // Without tabindex="-1" on <main>, Chrome moves its sequential-focus point but activeElement
    // stays on <body>, so a screen reader carries on reading from the top of the page.
    const landed = await page.evaluate(() => document.activeElement?.id);
    expect(landed).toBe("main-content");
  });

  test("every step indicator is named and states where you are", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    const steps = page.locator('button[aria-label^="Step "]');
    expect(await steps.count()).toBeGreaterThan(1);

    // These were bare buttons labelled "1" "2" "3" "4", and a completed step's label became an
    // aria-hidden tick - so its accessible name went empty entirely.
    for (const s of await steps.all()) {
      expect((await s.getAttribute("aria-label"))?.length ?? 0).toBeGreaterThan(5);
    }
    await expect(page.locator('button[aria-current="step"]')).toHaveCount(1);
    // The current step stays focusable: it is how a keyboard user works out where they are.
    await expect(page.locator('button[aria-current="step"]')).toBeEnabled();
  });

  test("contact fields are named without relying on the placeholder", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    await page.waitForTimeout(900);
    await page.getByLabel("Quantity").click();
    await page.getByRole("option", { name: "250 cards", exact: true }).click();
    await page.getByText(/Design it for me/i).first().click();
    await page.waitForTimeout(700);

    // The contact fields live on Project Details, which is two steps past the specs: specs ->
    // design service -> details. Advance until the heading appears rather than counting clicks,
    // so the test does not break the next time a step is added or removed.
    const details = page.getByRole("heading", { name: "Project Details" });
    for (let i = 0; i < 3 && !(await details.isVisible().catch(() => false)); i++) {
      await page.locator('[data-testid="order-summary"]:visible').first()
        .getByRole("button", { name: /Continue/i }).click();
      await page.waitForTimeout(900);
    }
    await expect(details).toBeVisible();

    // A placeholder is dropped from the accessible name the moment the field has a value, so these
    // read as "edit, blank" with nothing to say which was which.
    for (const name of ["Phone", "Email", "Website"]) {
      await expect(page.getByRole("textbox", { name }), `${name} has no accessible name`).toBeVisible();
    }
  });
});

test.describe("landmarks", () => {
  test("the order summary is a named region", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    // An anonymous "complementary" in the landmark list tells a screen reader user nothing.
    await expect(page.locator('[data-testid="order-summary"][aria-label="Order summary"]').first()).toBeAttached();
  });
});
