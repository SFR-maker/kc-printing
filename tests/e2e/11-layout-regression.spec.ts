import { test, expect } from "@playwright/test";

/**
 * The page must never scroll sideways.
 *
 * The header switched its desktop nav and CTA cluster on at the `md` breakpoint, but those two
 * groups need about 810px side by side. At exactly 768px - iPad portrait, and the width `md` turns
 * on at - every page on the site overflowed by 42px. Nothing caught it because the e2e projects
 * only ever ran at 1280px and 393px, stepping straight over the broken width.
 *
 * 768 and 1024 are the breakpoint boundaries themselves, which is where this class of bug lives.
 */
const WIDTHS = [360, 390, 768, 1024, 1280];

const ROUTES = [
  "/",
  "/about",
  "/contact",
  "/faq",
  "/pricing",
  "/services",
  "/services/business-cards",
  "/services/business-cards/order",
  "/terms",
];

test.describe("no horizontal overflow at any breakpoint", () => {
  for (const width of WIDTHS) {
    for (const route of ROUTES) {
      test(`${width}px ${route}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);

        const { scrollWidth, clientWidth, offender } = await page.evaluate(() => {
          const de = document.documentElement;
          const scroll = Math.max(de.scrollWidth, document.body.scrollWidth);
          let offender = "";
          if (scroll > de.clientWidth + 1) {
            for (const el of Array.from(document.querySelectorAll("*"))) {
              const r = el.getBoundingClientRect();
              if (r.right > de.clientWidth + 2 && r.width > 8) {
                const e = el as HTMLElement;
                offender = `<${e.tagName.toLowerCase()} class="${String(e.className).slice(0, 80)}"> extends to ${Math.round(r.right)}px`;
                break;
              }
            }
          }
          return { scrollWidth: scroll, clientWidth: de.clientWidth, offender };
        });

        expect(
          scrollWidth,
          `${route} at ${width}px scrolls horizontally (${scrollWidth}px of content). First offender: ${offender}`
        ).toBeLessThanOrEqual(clientWidth + 1);
      });
    }
  }
});
