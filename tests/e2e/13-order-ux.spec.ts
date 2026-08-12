import { test, expect, type Page } from "@playwright/test";

/**
 * The shared ordering experience: one-click selectors, the persistent summary, and the journeys
 * from the UX audit that this work is responsible for.
 *
 * Everything here drives the real controls. The bugs this track produced were all of a kind unit
 * tests cannot see - a summary stuck on "Pricing…" because a spec was undefined, a price shown twice
 * on one screen, a quantity silently chosen for the customer - and they were found by configuring a
 * product and looking at what came back.
 */

const PRODUCTS = ["business-cards", "postcards", "banners", "rigid-signs", "window-decals"] as const;

/** Desktop renders the summary as a sticky rail and mobile as a bottom bar; one at a time. */
const summaryOf = (page: Page) => page.locator('[data-testid="order-summary"]:visible').first();

/** Opens the mobile summary, which is collapsed to a total and a CTA until asked. */
async function openSummary(page: Page) {
  const toggle = summaryOf(page).getByRole("button", { name: /Order details/i });
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(400);
  }
}

async function priceIn(page: Page): Promise<string | null> {
  const text = await summaryOf(page).innerText();
  return (text.match(/\$[\d,]+\.\d{2}/) ?? [null])[0];
}

test.describe("order summary panel", () => {
  for (const product of PRODUCTS) {
    test(`${product}: shows a summary with a reachable call to action`, async ({ page }) => {
      await page.goto(`/services/${product}/order`);
      const summary = summaryOf(page);
      await expect(summary).toBeVisible();

      const cta = summary.getByRole("button", { name: /Continue/i });
      await expect(cta).toBeVisible();

      /*
       * The CTA must never sit on "Pricing…" forever.
       *
       * Postcards did exactly that: the price was computed from a spec the form had no default for,
       * so it read null - which the panel treats as "still loading" - and the button stayed disabled
       * until something was clicked.
       */
      await expect(cta).not.toHaveText(/Pricing/i, { timeout: 15_000 });
    });

    test(`${product}: keeps the running total out of the form`, async ({ page }) => {
      await page.goto(`/services/${product}/order`);
      await page.waitForTimeout(1200);
      /*
       * The invariant is that the total lives in the summary and nowhere else.
       *
       * Asserting on a count of prices across the whole page cannot express that: the panel renders
       * its desktop rail and its mobile bar into the same DOM and hides one with CSS, so the total
       * legitimately appears twice. Scoping to the form says the thing that actually matters -
       * every picker used to carry its own total, and the step navigation carried a third.
       */
      const inForm = await page.locator("form").getByText(/^\$[\d,]+\.\d{2}$/).count();
      expect(inForm, "the form is showing its own total alongside the summary").toBe(0);
    });
  }
});

test.describe("one-click selection", () => {
  test("size, orientation and sides are radios, not dropdowns", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    for (const group of ["Size", "Orientation", "Sides"]) {
      await expect(page.getByRole("radiogroup", { name: group })).toBeVisible();
    }
  });

  test("the selected option is the one exposed as checked", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    const vertical = page.getByRole("radio", { name: /Vertical/ });
    await vertical.click();
    await expect(vertical).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: /Horizontal/ })).toHaveAttribute("aria-checked", "false");
  });

  test("arrow keys move between options and take focus with them", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "No hardware keyboard on the mobile profile");
    await page.goto("/services/business-cards/order");
    const horizontal = page.getByRole("radio", { name: /Horizontal/ });
    await horizontal.focus();
    await page.keyboard.press("ArrowRight");
    // Selection moves, and so does focus - under a roving tabindex the old card leaves the tab
    // order, so without moving focus the next arrow press would go nowhere.
    await expect(page.getByRole("radio", { name: /Vertical/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radio", { name: /Vertical/ })).toBeFocused();
  });
});

test.describe("pricing follows the configuration", () => {
  test("a quantity is never chosen on the customer's behalf", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    await page.waitForTimeout(900);
    await openSummary(page);
    await expect(summaryOf(page)).toContainText("Not chosen");

    // Changing paper or sides used to snap quantity from "not chosen" to the smallest run.
    await page.getByRole("radio", { name: /Both sides/ }).click();
    await page.waitForTimeout(700);
    await openSummary(page);
    await expect(summaryOf(page), "a quantity was picked for the customer").toContainText("Not chosen");
  });

  test("the total moves when the quantity does", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    await page.getByLabel("Quantity").click();
    await page.getByRole("option", { name: "500 cards", exact: true }).click();
    await page.waitForTimeout(900);
    const at500 = await priceIn(page);
    expect(at500).toBeTruthy();

    await page.getByLabel("Quantity").click();
    await page.getByRole("option", { name: "1,000 cards", exact: true }).click();
    await page.waitForTimeout(900);
    expect(await priceIn(page)).not.toBe(at500);
  });

  test("says what is missing rather than just refusing", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    await page.waitForTimeout(900);
    await expect(summaryOf(page).getByRole("button", { name: /Continue/i })).toBeDisabled();
    await expect(summaryOf(page)).toContainText(/quantity/i);
  });

  test("the summary and the picker call the sides the same thing", async ({ page }) => {
    await page.goto("/services/business-cards/order");
    await page.getByRole("radio", { name: /Front only/ }).click();
    await page.waitForTimeout(600);
    await openSummary(page);
    // The summary read the raw supplier label ("Full Color Front, No Back") beside a card saying
    // "Front only" - two names for one choice, on screen together.
    await expect(summaryOf(page)).toContainText("Front only");
  });
});

test.describe("banner orientation", () => {
  test("swaps which edge is the width without changing the price", async ({ page }) => {
    await page.goto("/services/banners/order");
    await page.waitForTimeout(1200);
    await openSummary(page);
    await expect(summaryOf(page)).toContainText("6 ft x 3 ft");
    const before = await priceIn(page);

    await page.getByRole("radio", { name: /Vertical/ }).click();
    await page.waitForTimeout(1200);
    await openSummary(page);
    await expect(summaryOf(page)).toContainText("3 ft x 6 ft");
    // Same area of vinyl, so the same money.
    expect(await priceIn(page)).toBe(before);
  });

  test("vertical banners have templates of their own", async ({ page }) => {
    /*
     * This used to assert the fallback, because every banner template was landscape and filtering
     * to vertical emptied the gallery. The occasion library ships portrait layouts, so the correct
     * assertion is now the opposite: real results, and no apology for the lack of them.
     */
    await page.goto("/services/banners/design?orientation=vertical");
    await page.waitForTimeout(2500);
    expect(await page.locator('a[href*="/design/t-"]').count()).toBeGreaterThan(0);
    await expect(page.getByText(/don't have vertical templates yet/i)).toHaveCount(0);
    await expect(page.getByText(/Showing vertical designs/i)).toBeVisible();
  });

  test("still falls back rather than showing an empty gallery", async ({ page }) => {
    // The safety net stays: a product with no templates in the requested orientation shows the
    // full set with an explanation instead of nothing at all.
    await page.goto("/services/rigid-signs/design?orientation=vertical");
    await page.waitForTimeout(2000);
    expect(await page.locator('a[href*="/design/t-"]').count()).toBeGreaterThan(0);
  });
});

test.describe("editor front and back", () => {
  test("a two-sided design can drop its back and get it back", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "Desktop TopCommandBar");
    await page.goto("/services/business-cards/design/t-real-estate-centered-stack");
    await page.waitForTimeout(3000);

    await page.getByRole("button", { name: /Remove back/i }).click();
    await expect(page.getByRole("alertdialog", { name: /Remove the back/i })).toBeVisible();
    await page.getByRole("button", { name: /Remove the back/i }).click();

    await expect(page.getByRole("button", { name: /Add back/i })).toBeVisible();
    // The tab's accessible name stays "Back" whatever is on the face.
    await expect(page.getByRole("tab", { name: "Back" })).toBeVisible();
  });
});
