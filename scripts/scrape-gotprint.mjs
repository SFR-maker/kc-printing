import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

/**
 * Reads live prices off GotPrint's public order configurator.
 *
 * Their /service/rest/v1/product/prices endpoint returns invalidAuthType without a logged-in
 * account, so the price has to be read from the rendered page. The configurator populates each
 * control only once the previous one is set, which is why every step re-queries the DOM rather than
 * grabbing all the selects once up front.
 *
 * Deliberately slow. This is someone else's server and the data is worth having accurately rather
 * than quickly: one combination roughly every fifteen seconds, and a longer pause between sizes.
 *
 * Writes after every size so an interrupted run loses at most one size's worth of work, and skips
 * anything already present on restart.
 *
 *   node scripts/scrape-gotprint.mjs banners [--limit 12]
 */

const PRODUCTS = {
  banners: { url: "https://www.gotprint.com/products/banners/order", vary: ["Size", "Material", "Color"], fix: [] },
  postcards: { url: "https://www.gotprint.com/products/postcards/order", vary: ["Size", "Paper", "Color"], fix: [] },
  // "Rigid Signs" is a category on GotPrint, not a product - it has no configurator. The boards
  // people actually buy are separate products, and their configurators are shaped differently
  // again: Material / Material Color / Shape / Size / Hole Drilling / Accessories, with no "Color"
  // control at all. The old fixed four-control list found no Quantity and captured nothing, so the
  // control names are per-product now. `vary` is what gets iterated; `fix` is set once to the first
  // real option and left alone, because varying drilling and accessories multiplies the run for
  // options almost nobody changes.
  "corrugated-boards": { url: "https://www.gotprint.com/products/corrugated-boards/order", vary: ["Size"], fix: ["Material", "Material Color", "Shape", "Hole Drilling", "Accessories"] },
  "foam-boards": { url: "https://www.gotprint.com/products/foam-boards/order", vary: ["Size"], fix: ["Material", "Material Color", "Shape", "Hole Drilling", "Accessories"] },
  "pvc-boards": { url: "https://www.gotprint.com/products/pvc-boards/order", vary: ["Size"], fix: ["Material", "Material Color", "Shape", "Hole Drilling", "Accessories"] },
  "aluminum-boards": { url: "https://www.gotprint.com/products/aluminum-boards/order", vary: ["Size"], fix: ["Material", "Material Color", "Shape", "Hole Drilling", "Accessories"] },
  "yard-signs": { url: "https://www.gotprint.com/products/yard-signs/order", vary: ["Size"], fix: ["Material", "Material Color", "Shape", "Hole Drilling", "Accessories"] },
};

const product = process.argv[2];
const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : null;
};
const LIMIT = Number(arg("--limit")) || Infinity;
/** Only sizes matching this pattern. Scoped to what actually sells rather than a 114-size catalogue. */
const SIZE_MATCH = arg("--sizes") ? new RegExp(arg("--sizes"), "i") : null;
/**
 * Only these quantity breaks. Banners list every integer from 1 to 40-odd; a shop needs the breaks
 * a customer actually picks, and scraping all of them turns a 25-minute job into a 19-hour one.
 */
const QUANTITIES = arg("--quantities") ? new Set(arg("--quantities").split(",").map((q) => q.trim())) : null;
if (!PRODUCTS[product]) {
  console.error(`usage: node scripts/scrape-gotprint.mjs <${Object.keys(PRODUCTS).join("|")}> [--limit N]`);
  process.exit(1);
}

const OUT = path.join("lib/pricing", `${product}-scraped.json`);
const data = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { product, scrapedAt: null, prices: {} };
const key = (size, material, color, qty) => `${size}|${material}|${color}|${qty}`;

/** Finds the select whose surrounding label matches, once it has real options. */
async function findSelect(page, label) {
  for (let i = 0; i < 15; i++) {
    const idx = await page.evaluate((l) => {
      const sels = [...document.querySelectorAll("select")];
      for (let i = 0; i < sels.length; i++) {
        const text = (sels[i].closest("div")?.innerText ?? "").split("\n")[0];
        if (new RegExp(`^${l}$`, "i").test(text.trim()) && sels[i].options.length > 1) return i;
      }
      return -1;
    }, label);
    if (idx >= 0) return idx;
    await page.waitForTimeout(900);
  }
  return -1;
}

async function optionsOf(page, idx) {
  return (await page.locator("select").nth(idx).locator("option").allTextContents())
    .map((t, i) => ({ i, t: t.trim() }))
    .filter((o) => o.t && !/please select|select option/i.test(o.t));
}

async function choose(page, label, optionIndex) {
  const idx = await findSelect(page, label);
  if (idx < 0) return false;
  await page.locator("select").nth(idx).selectOption({ index: optionIndex }, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(3200);
  return true;
}

async function readSubtotal(page) {
  for (let i = 0; i < 8; i++) {
    const v = await page.evaluate(() => {
      const m = document.body.innerText.match(/Subtotal[^$]*\$([\d,]+\.\d\d)/);
      return m ? Number(m[1].replace(/,/g, "")) : null;
    });
    if (v && v > 0) return v;
    await page.waitForTimeout(1200);
  }
  return null;
}

const save = () => {
  data.scrapedAt = new Date().toISOString();
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
const cfg = PRODUCTS[product];

await page.goto(cfg.url, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(7000);

/**
 * Set every control that is not being iterated to its first real option.
 *
 * Boards will not price at all until material, colour, shape, drilling and accessories are all
 * chosen - the Quantity control does not even appear before then, which is why an earlier run
 * completed a size and captured nothing.
 */
async function applyFixed() {
  for (const label of cfg.fix) {
    const idx = await findSelect(page, label);
    if (idx < 0) continue;
    const opts = await optionsOf(page, idx);
    if (opts.length) await choose(page, label, opts[0].i);
  }
}

/** Recursively walks the varying controls, then sweeps quantity at the leaf. */
async function walk(depth, chosen) {
  if (depth === cfg.vary.length) {
    const qIdx = await findSelect(page, "Quantity");
    if (qIdx < 0) { console.log(`  no Quantity control for ${chosen.join(" | ")}`); return; }
    let quantities = await optionsOf(page, qIdx);
    if (QUANTITIES) quantities = quantities.filter((q) => QUANTITIES.has(q.t.replace(/[^\d]/g, "")) || QUANTITIES.has(q.t));
    for (const q of quantities) {
      const k = [...chosen, q.t].join("|");
      if (data.prices[k] != null) { done++; continue; }
      await choose(page, "Quantity", q.i);
      const price = await readSubtotal(page);
      if (price != null) { data.prices[k] = price; fresh++; }
      done++;
      if (done % 20 === 0) console.log(`  ${done} combos (${fresh} new) - last: ${k} = ${price ?? "?"}`);
    }
    return;
  }

  const label = cfg.vary[depth];
  const idx = await findSelect(page, label);
  if (idx < 0) { console.log(`  control "${label}" not found`); return; }
  let opts = await optionsOf(page, idx);
  if (depth === 0) {
    const total = opts.length;
    if (SIZE_MATCH) opts = opts.filter((o) => SIZE_MATCH.test(o.t));
    opts = opts.slice(0, LIMIT);
    console.log(`${product}: ${total} ${label.toLowerCase()}s offered, scraping ${opts.length}`);
    if (QUANTITIES) console.log(`  quantities: ${[...QUANTITIES].join(", ")}`);
  }

  for (const o of opts) {
    // Skip a top-level option whose every combination is already captured. On a resume the run
    // otherwise re-walks completed sizes, performing thousands of page interactions against the
    // supplier for zero new prices - which is what a flat price count across consecutive saves
    // turned out to mean.
    if (depth === 0 && isSizeComplete(o.t)) {
      console.log(`skipping ${o.t} - already captured`);
      continue;
    }
    await choose(page, label, o.i);
    if (depth === 0) await applyFixed();
    await walk(depth + 1, [...chosen, o.t]);
    if (depth === 0) {
      save();
      console.log(`saved after ${o.t} - ${Object.keys(data.prices).length} prices total`);
      await page.waitForTimeout(2000);
    }
  }
}

/**
 * True when a size already has as many prices as the most complete size in the file.
 *
 * A resume should not spend twenty minutes re-selecting options for data it already holds.
 */
function isSizeComplete(sizeLabel) {
  const counts = {};
  for (const key of Object.keys(data.prices)) {
    const size = key.split("|")[0];
    counts[size] = (counts[size] ?? 0) + 1;
  }
  const best = Math.max(0, ...Object.values(counts));
  return best > 0 && (counts[sizeLabel] ?? 0) >= best;
}

let done = 0;
let fresh = 0;
await applyFixed();
await walk(0, []);

save();
console.log(`
done. ${Object.keys(data.prices).length} prices in ${OUT}`);
await browser.close();
