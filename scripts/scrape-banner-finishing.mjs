import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

/**
 * Scrapes banner finishing options, which the base price scrape never captured.
 *
 * The order page carries grommets and hemming as separate priced options on top of the size /
 * material / quantity curve. Our builder asserted "hemmed with grommets" and charged for neither, so
 * every banner sold with grommets lost the grommet cost - print is sold at cost, so that came
 * straight off the job.
 *
 * Grommet price was measured to depend on size alone: 1ft x 2ft costs $0.90 for Every-2ft on both
 * glossy and matte. Materials are therefore not iterated; whichever one exists for a size is used to
 * resolve a product id, and only the size varies.
 *
 *   node scripts/scrape-banner-finishing.mjs
 */

const SP = process.env.GP_SCRATCH
  ?? "C:/Users/User/AppData/Local/Temp/claude/C--Users-User/5a2dbf45-311b-44a1-a8e6-62c8a1f436f6/scratchpad";
const PRODUCT_TYPE = 16;
const OUT = "lib/pricing/banner-finishing.json";

const env = Object.fromEntries(
  fs.readFileSync(path.join(SP, "gp.env"), "utf8").split("\n").filter(Boolean)
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

/**
 * Parses a supplier price.
 *
 * markupPrice arrives as a formatted string and gains thousands separators above $999.99, so
 * Number("1,035.24") is NaN. The guard that skipped non-finite values then dropped every price over
 * a thousand dollars without a word, which silently truncated the higher quantities out of the
 * catalogue - banners and yard signs both topped out at exactly $999.
 */
function parsePrice(value) {
  const n = Number(String(value ?? "").replace(/,/g, "").trim());
  // Zero is a real quote, not a missing one: "No Grommets" and "Hemming - 4 Sides" are free, and
  // rejecting non-positive values dropped them from the table entirely.
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  storageState: fs.existsSync(path.join(SP, "gp-state.json")) ? path.join(SP, "gp-state.json") : undefined,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});
const page = await ctx.newPage();

async function ensureSession() {
  await page.goto("https://www.gotprint.com/user/account", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  if ((await page.locator('input[type="password"]').count()) === 0) return;
  await page.goto("https://www.gotprint.com/user/login", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.locator('input[type="email"], input[name*="mail" i]').first().fill(env.GOTPRINT_EMAIL);
  await page.locator('input[type="password"]').first().fill(env.GOTPRINT_PASSWORD);
  await page.getByText(/Keep Me Logged In/i).first().click({ timeout: 8000 }).catch(() => {});
  await page.getByRole("button", { name: /^log in$/i }).first().click({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(9000);
  if ((await page.locator('input[type="password"]').count()) > 0) throw new Error("could not sign in");
  await ctx.storageState({ path: path.join(SP, "gp-state.json") });
}

await ensureSession();
await page.goto("https://www.gotprint.com/products/banners/order", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(3000);

const api = (u) => page.evaluate(async (uu) => {
  const r = await fetch(uu, { headers: { accept: "application/json" } });
  try { return await r.json(); } catch { return null; }
}, u);

const spec = await api(`/service/rest/v1/settings/product/specifications?requestValues=true&productType=${PRODUCT_TYPE}`);
const sizes = spec?.sizes ?? [];
const papers = spec?.papers ?? [];
console.log(`${sizes.length} sizes, ${papers.length} materials`);

const out = { scrapedAt: null, note: "Finishing options priced per banner, on top of the base curve.", groups: {}, prices: {} };

for (const size of sizes) {
  // Any material that yields a product will do: grommet price tracks size, not material.
  let productId = null;
  for (const paper of papers) {
    const prod = await api(`/service/rest/v1/products?productType=${PRODUCT_TYPE}&turnaround=1&size=${size.id}&orientation=1&paper=${paper.id}&color=1`);
    productId = prod?.items?.[0]?.id ?? null;
    if (productId) break;
    await page.waitForTimeout(120);
  }
  if (!productId) { console.log(`  ${size.label.padEnd(16)} no product`); continue; }

  const opts = await api(`/service/rest/v1/products/${productId}/options?requestValues=true&eddm=false`);
  const finishing = (opts?.items ?? []).filter((o) => /grommet|hemming/i.test(o.group?.label ?? ""));
  if (!finishing.length) { console.log(`  ${size.label.padEnd(16)} no finishing options`); continue; }

  const line = [];
  for (const o of finishing) {
    const group = o.group.label;
    const label = o.type?.label ?? o.name;
    (out.groups[group] ??= []);
    if (!out.groups[group].includes(label)) out.groups[group].push(label);

    // The whole curve, not a per-unit figure: linearity held on the sizes checked by hand, but
    // storing quoted numbers keeps this honest if any size breaks the pattern.
    const pr = await api(`/service/rest/v1/products/${productId}/options/${o.id}/prices`);
    for (const item of pr?.items ?? []) {
      const price = parsePrice(item.markupPrice);
      if (price !== null) out.prices[`${size.label}|${label}|${item.quantity}`] = price;
    }
    const one = pr?.items?.find((i) => i.quantity === 1)?.markupPrice;
    line.push(`${label}=$${one}`);
    await page.waitForTimeout(150);
  }
  console.log(`  ${size.label.padEnd(16)} ${line.join("  ")}`);
}

out.scrapedAt = new Date().toISOString();
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(`\n${Object.keys(out.prices).length} finishing prices -> ${OUT}`);
console.log("groups:", JSON.stringify(out.groups));
await browser.close();
