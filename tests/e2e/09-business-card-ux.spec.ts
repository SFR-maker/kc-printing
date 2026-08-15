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

  test("46 - zoom controls sit on the canvas, not behind a menu", async ({ page }) => {
    /*
     * They used to be three taps deep in the overflow menu, which on a banner meant being unable to
     * work at all: a 4 x 12ft banner fits at about 1%, so nothing is touchable until you zoom, and
     * nothing on screen said zooming was possible.
     */
    await page.goto("/services/business-cards/design/new");
    await page.waitForTimeout(1500);

    const readout = page.locator("button").filter({ hasText: /^\d[\d.]*%$/ }).first();
    await expect(readout).toBeVisible();
    const before = await readout.textContent();

    await page.locator('button[aria-label="Zoom in"]').first().click();
    await page.waitForTimeout(500);
    expect(await readout.textContent()).not.toBe(before);

    // "Fit to screen" re-fits rather than jumping to 100%, which on a banner is 28,800px wide.
    await page.locator('button[aria-label="Fit to screen"]').first().click();
    await page.waitForTimeout(700);
    const box = await page.locator("canvas").first().boundingBox();
    expect(box!.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  });
});

test.describe("Business card editor — editing text by touch", () => {
  // Not the full iPhone descriptor: spreading it sets defaultBrowserType, which Playwright
  // refuses inside a describe block.
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  // The editor is the heaviest route in the app; under a full parallel run the dev server needs the
  // extra headroom.
  test.slow();

  /** Inserts a Heading and dismisses the sheet that inserted it. */
  async function insertHeading(page: import("@playwright/test").Page, url: string) {
    await page.goto(url, { waitUntil: "networkidle" });
    // Waited on rather than slept through: under a loaded dev server the editor can take seconds to
    // become interactive, and a fixed delay either flakes or wastes time on every run.
    await expect(page.locator("canvas").first()).toBeVisible();
    const textTab = page.locator("button", { hasText: "Text" }).last();
    await expect(textTab).toBeVisible();
    await textTab.tap();
    const heading = page.getByRole("button", { name: "Heading", exact: true });
    await expect(heading).toBeVisible();
    await heading.tap();
    // The element exists once Konva has a Text node to find.
    await expect
      .poll(() => page.evaluate(() =>
        (window as never as { Konva?: { stages: { find: (s: string) => unknown[] }[] } }).Konva?.stages.at(-1)?.find("Text").length ?? 0
      ))
      .toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    // The canvas re-fits when webfonts land, which moves the artwork; callers re-measure anyway.
    await page.waitForTimeout(600);
  }

  /** Where the first text element sits on screen, right now. */
  async function textPoint(page: import("@playwright/test").Page) {
    return page.evaluate(() => {
      const stage = (window as never as { Konva: { stages: never[] } }).Konva.stages.at(-1) as never as {
        content: HTMLElement;
        scaleX: () => number;
        find: (s: string) => { getClientRect: (o: object) => { x: number; y: number; width: number; height: number } }[];
      };
      const rect = stage.content.getBoundingClientRect();
      const zoom = stage.scaleX();
      const box = stage.find("Text")[0].getClientRect({ relativeTo: stage });
      return { x: rect.left + (box.x + box.width / 2) * zoom, y: rect.top + (box.y + box.height / 2) * zoom };
    });
  }

  /**
   * Taps the text until it is selected, and reports where it was tapped.
   *
   * Retried because the canvas re-fits whenever a webfont or the layout settles, which moves the
   * artwork away from a point measured a moment earlier - a race in the test, not in the editor.
   */
  async function selectText(page: import("@playwright/test").Page) {
    const editBtn = page.locator('button[aria-label="Edit text"]');
    for (let attempt = 0; attempt < 4; attempt++) {
      const pt = await textPoint(page);
      await page.touchscreen.tap(pt.x, pt.y);
      if (await editBtn.isVisible({ timeout: 1500 }).catch(() => false)) return pt;
      await page.waitForTimeout(400);
    }
    throw new Error("could not select the text element");
  }

  /**
   * Double-taps until the editor opens.
   *
   * Retried because the editor only counts two taps as one gesture within 400ms - the same window a
   * browser uses - and two CDP round trips on a loaded machine can take longer than that. A finger
   * is not rate-limited by CDP, so this is a limit of the harness, not of the gesture.
   */
  async function doubleTap(page: import("@playwright/test").Page, pt: { x: number; y: number }) {
    const editor = page.locator("[data-canvas-text-editor]");
    for (let attempt = 0; attempt < 4; attempt++) {
      await page.touchscreen.tap(pt.x, pt.y);
      await page.touchscreen.tap(pt.x, pt.y);
      if (await editor.isVisible({ timeout: 1500 }).catch(() => false)) return;
      await page.waitForTimeout(500);
    }
  }

  test("47 - double-tapping text on a phone opens the editor, focused and legible", async ({ page }) => {
    /*
     * This was impossible before. Konva's `dbltap` never arrives once an element is selected,
     * because the Transformer's finger-sized anchors blanket a small element and the first tap of
     * the pair lands on a handle instead of the text — so there was no way to reword text on a
     * phone at all.
     */
    await insertHeading(page, "/services/business-cards/design/new");
    await doubleTap(page, await selectText(page));

    const editor = page.locator("[data-canvas-text-editor]");
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
    // Under 16px iOS zooms the whole page on focus, and at banner zoom the true size is ~5px.
    const fontSize = await editor.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test("48 - selecting an element does not move the canvas out from under the finger", async ({ page }) => {
    // The quick toolbar used to sit above the canvas in the flow, so selecting anything re-fitted
    // the design and shifted it ~112px mid-gesture.
    await insertHeading(page, "/services/business-cards/design/new");
    const editBtn = page.locator('button[aria-label="Edit text"]');
    let before: { x: number; y: number } | null = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      const pt = await textPoint(page);
      before = await page.locator("canvas").first().boundingBox();
      await page.touchscreen.tap(pt.x, pt.y);
      if (await editBtn.isVisible({ timeout: 1500 }).catch(() => false)) break;
      await page.waitForTimeout(400);
    }
    await expect(editBtn).toBeVisible();
    const after = await page.locator("canvas").first().boundingBox();
    expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(2);
    expect(Math.abs(after!.x - before!.x)).toBeLessThanOrEqual(2);
  });

  test("49 - the Edit text button opens the editor without needing the gesture", async ({ page }) => {
    await insertHeading(page, "/services/business-cards/design/new");
    await selectText(page);
    const editBtn = page.locator('button[aria-label="Edit text"]');
    await editBtn.tap();
    await expect(page.locator("[data-canvas-text-editor]")).toBeFocused();
  });

  test("50 - editing text on a banner works at its fitted zoom, and the box does not balloon", async ({ page }) => {
    // A banner fits at ~8%, where a heading is under 5px tall on screen.
    await insertHeading(page, "/services/banners/design/new");
    const pt = await selectText(page);
    const heightBefore = await page.evaluate(() =>
      (window as never as { Konva: { stages: { find: (s: string) => { height: () => number }[] }[] } }).Konva.stages.at(-1)!.find("Text")[0].height()
    );
    await doubleTap(page, pt);
    await expect(page.locator("[data-canvas-text-editor]")).toBeFocused();

    await page.keyboard.press("Control+a");
    await page.keyboard.type("GRAND OPENING");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(900);

    const after = await page.evaluate(() => {
      const t = (window as never as { Konva: { stages: { find: (s: string) => { text: () => string; height: () => number }[] }[] } }).Konva.stages.at(-1)!.find("Text")[0];
      return { text: t.text(), height: t.height() };
    });
    expect(after.text).toBe("GRAND OPENING");
    // scrollHeight used to be read against the editor's 44px floor, growing every commit by a third.
    expect(after.height).toBeLessThanOrEqual(heightBefore * 1.1);
  });
});

/**
 * Double-clicking a line of text on a template, with a mouse, at a laptop size.
 *
 * This template is a full-card background rectangle with every line of text sitting on top of it —
 * the arrangement a shop owner hit when she tried to change the phone number and got Fill, Stroke
 * and Corner radius instead. Two separate faults produced that:
 *
 *  - the pointer was resolved against where the canvas had ended up *after* the first click made
 *    the quick toolbar appear and pushed the artwork down 26px, so the second click was read
 *    against the line above the one she aimed at; and
 *  - Konva's own `click`, which fires after `pointerup`, then overwrote whatever the double-click
 *    handler had correctly worked out.
 *
 * Between them, double-clicking the phone line selected the background shape, and double-clicking
 * the website line opened the phone line. Each line is checked here by name.
 */
test.describe("Business card editor — double-clicking text on a template", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === "mobile-chrome", "Mouse double-click at laptop size; the touch gesture is covered by tests 47-50");
  });

  /** The template's own geometry, in inches on a 3.6 x 2.1in document. */
  const LINES: { label: string; xIn: number; yIn: number; expected: string }[] = [
    { label: "the name", xIn: 1.8, yIn: 0.625, expected: "Dana Whitfield" },
    { label: "the job title", xIn: 1.8, yIn: 0.885, expected: "Realtor · Whitfield & Co. Realty" },
    { label: "the phone and email line", xIn: 1.8, yIn: 1.335, expected: "(816) 555-0142   •   dana@whitfieldrealty.com" },
    { label: "the website line", xIn: 1.8, yIn: 1.535, expected: "whitfieldrealty.com" },
    // Inside the line's box but clear of the glyphs — still that line, as far as the customer is
    // concerned, and the full-card shape is what used to answer here.
    { label: "the name's box, left of the words", xIn: 0.4, yIn: 0.625, expected: "Dana Whitfield" },
  ];

  for (const { label, xIn, yIn, expected } of LINES) {
    test(`51 - double-clicking ${label} opens that line's own wording`, async ({ page }) => {
      await page.goto("/services/business-cards/design/t-real-estate-bordered-frame");
      await page.waitForSelector("canvas", { timeout: 30000 });
      await page.waitForTimeout(1500);

      const box = await page.locator("canvas").first().boundingBox();
      expect(box).not.toBeNull();
      const pxPerIn = box!.width / 3.6;
      await page.mouse.dblclick(box!.x + xIn * pxPerIn, box!.y + yIn * pxPerIn);
      await page.waitForTimeout(700);

      // The properties panel's text box is the answer to "what did that select?".
      await expect(page.locator("#element-text")).toHaveValue(expected);
      // And it must not be answering with a shape's controls.
      await expect(page.locator('label:text-is("Corner radius")')).toHaveCount(0);
    });
  }
});
