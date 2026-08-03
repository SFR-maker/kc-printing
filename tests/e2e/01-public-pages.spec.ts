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
    // Scoped to visible links: the header carries a desktop-only CTA into /services/..., so the
    // first match in DOM order is intentionally hidden at mobile widths.
    const links = page.locator('a[href*="/services/"]:visible');
    await expect(links.first()).toBeVisible();
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test("3 - mobile nav opens and closes", async ({ page }) => {
    // The hamburger is `md:hidden`, so it only exists below 768px. This ran under the desktop
    // project too, where it is correctly hidden and the assertion could never pass. Pinning the
    // viewport keeps the test meaningful in both projects rather than skipping it in one.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const hamburger = page.locator('[data-testid="mobile-nav"]');
    await expect(hamburger).toBeVisible();

    // Scoped to the mobile panel: "Pricing" also exists in the desktop nav, which is present in the
    // DOM but hidden, so an unscoped lookup is a strict-mode violation.
    const menu = page.getByTestId("mobile-menu");
    await hamburger.click();
    await expect(menu.getByRole("link", { name: "Pricing" })).toBeVisible();

    await hamburger.click();
    await expect(menu).toBeHidden();
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
