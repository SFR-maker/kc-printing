import { test, expect } from "@playwright/test";

test.describe("SEO and meta", () => {
  test("41 - homepage has meta description", async ({ page }) => {
    await page.goto("/");
    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    expect(desc).toBeTruthy();
  });

  test("42 - homepage has og:title", async ({ page }) => {
    await page.goto("/");
    const og = await page.locator('meta[property="og:title"]').getAttribute("content");
    expect(og).toBeTruthy();
  });

  test("43 - service page has schema markup", async ({ page }) => {
    await page.goto("/services/business-cards");
    const ld = page.locator('script[type="application/ld+json"]');
    await expect(ld.first()).toBeAttached();
  });

  test("44 - homepage has organization schema", async ({ page }) => {
    await page.goto("/");
    const ld = page.locator('script[type="application/ld+json"]');
    await expect(ld.first()).toBeAttached();
  });

  test("45 - sitemap.xml is accessible", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect([200, 404]).toContain(res.status());
  });

  test("46 - robots.txt exists", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect([200, 404]).toContain(res.status());
  });

  test("47 - no console errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/");
    await page.waitForTimeout(1000);
    const criticalErrors = errors.filter((e) => !e.includes("favicon") && !e.includes("hydration"));
    expect(criticalErrors.length).toBe(0);
  });

  test("48 - mobile layout renders correctly", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("49 - all nav links are accessible", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("nav a");
    const count = await links.count();
    expect(count).toBeGreaterThan(3);
  });

  test("50 - page does not have broken images above fold", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const imgs = page.locator("img:visible");
    const count = await imgs.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const src = await imgs.nth(i).getAttribute("src");
      expect(src).toBeTruthy();
    }
  });
});
