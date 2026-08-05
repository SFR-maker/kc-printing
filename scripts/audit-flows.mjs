import { chromium } from "@playwright/test";

/**
 * Walks the first step of every order flow in a real browser.
 *
 * The specs step previously refused to advance on the upload path without saying why: choosing
 * "I have my own design" clears the design package, and the gate then set an error on a field that
 * step does not render. Nothing appeared and the button simply did nothing.
 */

const BASE = process.env.AUDIT_BASE ?? "https://611printing.com";
const SP = "C:/Users/User/AppData/Local/Temp/claude/C--Users-User/5a2dbf45-311b-44a1-a8e6-62c8a1f436f6/scratchpad";

const browser = await chromium.launch();

for (const slug of ["business-cards", "banners", "postcards", "rigid-signs"]) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 1200 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 90)); });
  page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 90)));

  await page.goto(`${BASE}/services/${slug}/order`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(4500);

  const price = () => page.evaluate(() => {
    const m = document.body.innerText.match(/PRINT TOTAL[\s\S]{0,220}?\$([\d,]+\.\d\d)/i);
    return m ? m[1] : null;
  });
  const before = await price();

  // Choose the upload path - the one the gate used to block.
  await page.getByText("I have my own design", { exact: false }).first().click({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const step0 = await page.evaluate(() => document.body.innerText.match(/Choose Your Print Specs/i) ? "specs" : "other");
  await page.getByRole("button", { name: /^next/i }).first().click({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3500);

  const after = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      onSpecs: /Choose Your Print Specs/i.test(t),
      askedForArtwork: /Upload your artwork|approve every proof|upload a print-ready/i.test(t),
      packageError: /Please select a package/i.test(t),
      reachedNext: /Review|Payment|Contact details|Your details/i.test(t) && !/Choose Your Print Specs/i.test(t),
    };
  });

  console.log(`${slug.padEnd(15)} price=${String(before ?? "-").padStart(8)}  step0=${step0}  ` +
    `-> ${after.reachedNext ? "ADVANCED" : after.askedForArtwork ? "asked for artwork (correct)" : after.packageError ? "PACKAGE ERROR" : "stayed, no reason given"}`);
  if (errors.length) console.log(`   console errors: ${errors.slice(0, 2).join(" | ")}`);
  await page.screenshot({ path: `${SP}/flow-${slug}.png` });
  await ctx.close();
}
await browser.close();
