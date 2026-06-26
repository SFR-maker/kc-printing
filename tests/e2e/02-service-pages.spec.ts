import { test, expect } from "@playwright/test";

const SERVICES = [
  { slug: "business-cards", name: "Business Cards" },
  { slug: "postcards", name: "Postcards" },
  { slug: "logo-design", name: "Logo Design" },
  { slug: "web-design", name: "Website Design" },
  { slug: "roll-up-banners", name: "Roll-Up Banner" },
  { slug: "vinyl-banners", name: "Vinyl Banner" },
  { slug: "print-design", name: "Print" },
];

test.describe("Service pages", () => {
  test("8 - services hub loads", async ({ page }) => {
    await page.goto("/services");
    await expect(page.locator("h1")).toBeVisible();
  });

  for (let i = 0; i < SERVICES.length; i++) {
    const svc = SERVICES[i];
    test(`${9 + i} - ${svc.slug} service page loads`, async ({ page }) => {
      await page.goto(`/services/${svc.slug}`);
      await expect(page).toHaveURL(`/services/${svc.slug}`);
      await expect(page.locator("h1").first()).toBeVisible();
    });
  }
});
