import { test, expect, type Page } from "@playwright/test";
import { SERVICE_SLUG_ES, ROUTE_MAP } from "@/lib/i18n/config";
import { SERVICES } from "@/lib/service-data";
import { SERVICES_ES } from "@/lib/service-data-es";

/**
 * End-to-end cover for the three features added together: window signage, the specials system, and
 * the Spanish site.
 *
 * These assert against a running server rather than against modules, because the things that broke
 * during this work were all integration failures that every unit test passed through: a client
 * component importing a Prisma-backed module, a portfolio query missing a product, a route group
 * that renders but whose footer links leave the Spanish site.
 */

/** Fails the test on a console error or a failed request, not just on a bad assertion. */
function watchForErrors(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Clerk complains loudly when it has no keys in a local build; not a page fault.
    if (/clerk/i.test(text)) return;
    problems.push(`console: ${text}`);
  });
  page.on("response", (res) => {
    if (res.status() >= 500) problems.push(`${res.status()} ${res.url()}`);
  });
  return problems;
}

test.describe("window decals", () => {
  test("the service page renders product, films and pricing entry points", async ({ page }) => {
    const problems = watchForErrors(page);
    await page.goto("/services/window-decals");

    await expect(page.getByRole("heading", { level: 1, name: "Window Decals" })).toBeVisible();
    // The three-film comparison band is the page's real job.
    await expect(page.getByRole("heading", { name: /Which film do you need/i })).toBeVisible();
    for (const film of ["Window Decal", "Window Cling", "Window Perf"]) {
      await expect(page.getByText(film, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /Start designing/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Order without designing/i }).first()).toBeVisible();

    expect(problems).toEqual([]);
  });

  test("the order page quotes a real supplier price", async ({ page }) => {
    await page.goto("/services/window-decals/order");

    await expect(page.getByRole("heading", { name: /Choose Your Print Specs/i })).toBeVisible();
    await expect(page.getByLabel("Film")).toBeVisible();
    await expect(page.getByLabel("Shape")).toBeVisible();
    await expect(page.getByLabel("Size")).toBeVisible();

    // Quantity opens unchosen, so no price is shown until the customer picks one.
    await expect(page.getByText(/Choose a quantity to see your price/i)).toBeVisible();

    await page.getByLabel("Quantity").click();
    // `exact` matters: without it "1 decal" also matches "11 decals".
    await page.getByRole("option", { name: "1 decal", exact: true }).click();

    // The cheapest decal GotPrint sells is $18.12; any real quote is a dollar figure.
    await expect(page.getByText(/^\$\d+\.\d{2}$/).first()).toBeVisible({ timeout: 15_000 });
  });

  test("the price API quotes exactly what the supplier quoted", async ({ request }) => {
    // 6" x 24" rectangle, one off - GotPrint's own published "starting at" figure for decals.
    const res = await request.post("/api/price/window-decals", {
      data: { material: "window-decals", sizeId: 821, shapeId: 15, quantity: 1 },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ valid: true, total: 18.12 });
  });

  test("the price API refuses a combination the supplier will not quote", async ({ request }) => {
    const res = await request.post("/api/price/window-decals", {
      data: { material: "window-decals", sizeId: 999999, shapeId: 15, quantity: 1 },
    });
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(false);
    expect(json.total).toBe(0);
  });

  test("the price API explains a missing quantity rather than saying 'invalid'", async ({ request }) => {
    const res = await request.post("/api/price/window-decals", {
      data: { material: "window-decals", sizeId: 821, shapeId: 15, quantity: 0 },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).error).toMatch(/Choose a quantity/i);
  });

  test("the design studio lists window decal templates", async ({ page }) => {
    await page.goto("/services/window-decals/design");
    await expect(page.getByRole("heading", { level: 1, name: /Design Your Window Decal/i })).toBeVisible();
    // Seeded templates arrive from /api/card-templates?product=window-decal.
    await expect(page.locator("img").first()).toBeVisible({ timeout: 15_000 });
  });

  test("is listed everywhere the other products are", async ({ page }) => {
    for (const [url, name] of [["/", "Window Decals"], ["/services", "Window Decals"], ["/pricing", "Window Decals"]] as const) {
      await page.goto(url);
      await expect(page.getByText(name).first(), url).toBeVisible();
    }
  });
});

test.describe("product listings", () => {
  /**
   * The homepage product grid is a hand-laid bento addressed by index (SERVICES[0]..SERVICES[4]),
   * not a map, so a new product added to the array does not appear until a cell is added for it.
   * That is exactly what happened with window decals: live on every other page, absent from the
   * homepage. This asserts against the real product catalogue rather than against a copy of it.
   */
  test("the homepage lists every product", async ({ page }) => {
    await page.goto("/");
    const grid = page.locator("section", { has: page.getByRole("heading", { name: /products\. Done well/i }) });
    for (const slug of Object.keys(SERVICES)) {
      await expect(
        grid.getByRole("link", { name: SERVICES[slug].name, exact: true }).first(),
        `${SERVICES[slug].name} is missing from the homepage product grid`,
      ).toBeVisible();
    }
  });

  test("the services and pricing pages list every product", async ({ page }) => {
    for (const url of ["/services", "/pricing"]) {
      await page.goto(url);
      for (const slug of Object.keys(SERVICES)) {
        await expect(
          page.getByText(SERVICES[slug].name).first(),
          `${SERVICES[slug].name} is missing from ${url}`,
        ).toBeVisible();
      }
    }
  });

  test("the Spanish services page lists every product", async ({ page }) => {
    await page.goto("/es/servicios");
    for (const slug of Object.keys(SERVICES_ES)) {
      await expect(
        page.getByText(SERVICES_ES[slug].name).first(),
        `${SERVICES_ES[slug].name} is missing from /es/servicios`,
      ).toBeVisible();
    }
  });

  test("does not claim a product count that has gone stale", async ({ page }) => {
    // "Four products. Done well." outlived the fourth product by one release.
    const count = Object.keys(SERVICES).length;
    const words = ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
    const wrong = words.filter((w, i) => i + 1 !== count);
    for (const url of ["/", "/services", "/pricing"]) {
      await page.goto(url);
      const body = (await page.locator("body").innerText()).toLowerCase();
      for (const w of wrong) {
        expect(body, `${url} still says "${w} products"`).not.toContain(`${w.toLowerCase()} products`);
      }
    }
  });
});

test.describe("specials", () => {
  test("the specials page lists what is running", async ({ page }) => {
    const problems = watchForErrors(page);
    await page.goto("/specials");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(problems).toEqual([]);
  });

  test("the promo bar shows and can be dismissed for good", async ({ page }) => {
    await page.goto("/");
    const dismiss = page.getByRole("button", { name: /Dismiss this announcement/i });

    // The seeded launch special is set to show in the bar; skip cleanly if the shop turned it off.
    if (await dismiss.count() === 0) test.skip(true, "no special is currently flagged for the bar");

    await expect(dismiss).toBeVisible();
    await dismiss.click();
    await expect(dismiss).toBeHidden();

    // Dismissal is remembered per special across navigations, which is the whole point.
    await page.goto("/services");
    await expect(page.getByRole("button", { name: /Dismiss this announcement/i })).toHaveCount(0);
  });

  test("the admin API refuses anonymous writes", async ({ request }) => {
    const res = await request.post("/api/admin/specials", {
      data: { title: "Injected", blurb: "Should never be created" },
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test("the admin API refuses an off-site call to action", async ({ request }) => {
    // Rejected at auth before validation is even reached, but the point is that it is never created.
    const res = await request.post("/api/admin/specials", {
      data: { title: "Evil", blurb: "x", ctaHref: "https://evil.example.com" },
    });
    expect(res.status()).not.toBe(201);
  });
});

test.describe("spanish site", () => {
  test("every mapped route renders in Spanish", async ({ page }) => {
    for (const es of Object.values(ROUTE_MAP)) {
      const problems = watchForErrors(page);
      const res = await page.goto(es);
      expect(res?.status(), es).toBeLessThan(400);
      await expect(page.getByRole("heading", { level: 1 }), es).toBeVisible();
      expect(problems, es).toEqual([]);
    }
  });

  test("marks the page as Spanish for screen readers and crawlers", async ({ page }) => {
    await page.goto("/es");
    await expect(page.locator("[lang='es']").first()).toBeAttached();
    // hreflang pairs both ways.
    await expect(page.locator("link[hreflang='es-US']")).toHaveCount(1);
    await expect(page.locator("link[hreflang='en-US']")).toHaveCount(1);
  });

  /**
   * On a narrow viewport the switcher sits inside the collapsed menu, exactly like every other nav
   * link, so it has to be opened before it can be clicked.
   */
  async function clickLanguage(page: Page, name: RegExp) {
    const link = page.getByRole("link", { name }).first();
    if (!(await link.isVisible())) {
      await page.getByRole("button", { name: /Toggle navigation/i }).click();
    }
    await link.click();
  }

  test("the language switcher moves between equivalent pages", async ({ page }) => {
    await page.goto("/services/window-decals");
    await clickLanguage(page, /Español/i);
    await expect(page).toHaveURL(/\/es\/servicios\/calcomanias-para-ventanas$/);
    await expect(page.getByRole("heading", { level: 1, name: /Calcomanías para Ventanas/i })).toBeVisible();

    await clickLanguage(page, /English/i);
    await expect(page).toHaveURL(/\/services\/window-decals$/);
  });

  test("hides the switcher on pages that have no translation", async ({ page }) => {
    await page.goto("/services/window-decals/order");
    await expect(page.getByRole("link", { name: /Español/i })).toHaveCount(0);
  });

  test("keeps navigation inside the Spanish site", async ({ page }) => {
    await page.goto("/es");
    // Footer links are the usual place a translated site leaks back to English.
    const hrefs = await page.locator("footer a[href^='/']").evaluateAll((els) =>
      els.map((e) => e.getAttribute("href") ?? ""),
    );
    const leaks = hrefs.filter((h) => !h.startsWith("/es") && !/^\/(terms|privacy|refund-policy)/.test(h));
    expect(leaks, `these footer links leave the Spanish site: ${leaks.join(", ")}`).toEqual([]);
  });

  test("every Spanish product page carries translated content", async ({ page }) => {
    for (const es of Object.values(SERVICE_SLUG_ES)) {
      await page.goto(`/es/servicios/${es}`);
      // The section headings come from the Spanish dictionary rather than the English one.
      await expect(page.getByRole("heading", { name: /Tamaños, materiales y archivos/i }), es).toBeVisible();
      await expect(page.getByRole("heading", { name: /Elija su paquete/i }), es).toBeVisible();
      // And the honest caveat about the order flow being English.
      await expect(page.getByText(/se realizan en inglés/i), es).toBeVisible();
    }
  });

  test("returns 404 for a Spanish slug that is not a product", async ({ page }) => {
    const res = await page.goto("/es/servicios/no-existe");
    expect(res?.status()).toBe(404);
  });
});
