import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

/**
 * Reads rigid-sign pricing from GotPrint's own price API, using a logged-in session.
 *
 * Logged out, /service/rest/v1/product/prices answers invalidAuthType and the board configurators
 * never leave $0.00 - which is why rigid signs had no pricing at all. A signed-in session changes
 * that response to badRequest, i.e. the credentials are accepted, and watching the configurator work
 * showed the shape it actually uses:
 *
 *   GET /products?productType=..&shape=..&size=..&paper=..&color=..&turnaround=1&orientation=1
 *       -> resolves the combination to a product id, or fails if it is not a real product
 *   GET /products/{id}/prices
 *       -> the entire quantity curve in one response
 *
 * That last point is what makes this viable: the DOM scraper needed roughly fifteen seconds per
 * single quantity, where this returns all fifty-odd breaks in one request. A yard sign's full price
 * list costs two HTTP calls rather than fifteen minutes of clicking.
 *
 * Only Regular turnaround is captured. Rush is a surcharge on the same base price and doubling the
 * run to record it would be paying twice for one number.
 *
 * The size x shape cross product is mostly invalid - a Star shape exists in a handful of sizes only -
 * so combinations are probed and the misses recorded, rather than assumed.
 *
 *   node scripts/scrape-gotprint-api.mjs yard-signs
 */

const SP = process.env.GP_SCRATCH
  ?? "C:/Users/User/AppData/Local/Temp/claude/C--Users-User/5a2dbf45-311b-44a1-a8e6-62c8a1f436f6/scratchpad";

const PRODUCT_TYPES = {
  "yard-signs": 37,
  "corrugated-boards": 10015,
  "pvc-boards": 10014,
  "foam-boards": 10013,
  "aluminum-boards": 10017,
};

const product = process.argv[2];
const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const LIMIT_SIZES = Number(arg("--limit-sizes")) || Infinity;
const DELAY_MS = Number(arg("--delay")) || 250;

if (!PRODUCT_TYPES[product]) {
  console.error(`usage: node scripts/scrape-gotprint-api.mjs <${Object.keys(PRODUCT_TYPES).join("|")}>`);
  process.exit(1);
}
const productType = PRODUCT_TYPES[product];

const OUT = path.join("lib/pricing", `${product}-scraped.json`);
const data = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, "utf8"))
  : { product, productType, scrapedAt: null, source: "gotprint price API, Regular turnaround", options: {}, prices: {}, invalid: [] };
data.invalid ??= [];
const invalid = new Set(data.invalid);

const env = Object.fromEntries(
  fs.readFileSync(path.join(SP, "gp.env"), "utf8").split("\n").filter(Boolean)
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

const browser = await chromium.launch();
const ctx = await browser.newContext({
  storageState: fs.existsSync(path.join(SP, "gp-state.json")) ? path.join(SP, "gp-state.json") : undefined,
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
});
const page = await ctx.newPage();

/** Signs in when the restored session has lapsed. A long run outlives a short cookie. */
async function ensureSession() {
  await page.goto("https://www.gotprint.com/user/account", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  if ((await page.locator('input[type="password"]').count()) === 0) return true;

  console.log("session lapsed - signing in");
  await page.goto("https://www.gotprint.com/user/login", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  await page.locator('input[type="email"], input[name*="mail" i]').first().fill(env.GOTPRINT_EMAIL);
  await page.locator('input[type="password"]').first().fill(env.GOTPRINT_PASSWORD);
  await page.getByText(/Keep Me Logged In/i).first().click({ timeout: 8000 }).catch(() => {});
  await page.getByRole("button", { name: /^log in$/i }).first().click({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(9000);
  const ok = /dashboard|account/.test(page.url()) && (await page.locator('input[type="password"]').count()) === 0;
  if (!ok) throw new Error("could not sign in to GotPrint");
  await ctx.storageState({ path: path.join(SP, "gp-state.json") });
  return true;
}

const api = (url) => page.evaluate(async (u) => {
  const r = await fetch(u, { headers: { accept: "application/json" } });
  const text = await r.text();
  try { return { status: r.status, json: JSON.parse(text) }; } catch { return { status: r.status, text: text.slice(0, 200) }; }
}, url);

await ensureSession();

const specRes = await api(`/service/rest/v1/settings/product/specifications?requestValues=true&productType=${productType}`);
if (specRes.status !== 200) throw new Error(`specifications failed: ${specRes.status}`);
const spec = specRes.json;

/**
 * Flattens a product's sizes into concrete size/shape variants.
 *
 * The two product families describe themselves differently. Yard signs list sizes and shapes as
 * independent arrays, so which pairs exist has to be probed - most do not. Boards instead nest sizes
 * under `sizes.list`, each carrying its own shape plus an `otherShapes` array where every entry has
 * its own sizeId. For boards the valid pairs are therefore stated outright, which turns 1,326 guesses
 * into 108 real variants and avoids hammering the supplier for combinations they already told us
 * about.
 *
 * Board entries also carry `properties`, giving the true trim size (an 8" x 10" board prints at
 * 7.875 x 9.875) and the working resolution.
 */
function sizeVariants(spec) {
  if (spec.sizes && !Array.isArray(spec.sizes) && spec.sizes.list) {
    const out = [];
    for (const [key, v] of Object.entries(spec.sizes.list)) {
      const p = v.properties ?? {};
      const common = { label: v.label, widthIn: p.width, heightIn: p.height, dpi: p.dpi };
      out.push({ sizeId: Number(key.replace(/^size_/, "")), shapeId: v.shapeId, shapeLabel: v.shapeLabel, ...common });
      for (const s of v.otherShapes ?? []) {
        out.push({ sizeId: Number(s.sizeId), shapeId: Number(s.id), shapeLabel: s.label, ...common });
      }
    }
    return out;
  }
  const shapes = spec.shapes?.length ? spec.shapes : [{ id: null, label: "" }];
  const out = [];
  for (const s of spec.sizes ?? []) {
    for (const sh of shapes) out.push({ sizeId: s.id, label: s.label, shapeId: sh.id, shapeLabel: sh.label });
  }
  return out;
}

const allVariants = sizeVariants(spec);
const papers = spec.papers?.length ? spec.papers : [{ id: null, label: "" }];
const colors = spec.colors?.length ? spec.colors : [{ id: null, label: "" }];

/** Grouped by size label so progress reports per size rather than per variant. */
const bySizeLabel = [...new Set(allVariants.map((v) => v.label))].slice(0, LIMIT_SIZES);

/**
 * Labels are not unique, so prices are keyed by the supplier's numeric ids.
 *
 * Yard signs list `18" x 24" Horizontal` under two ids and `23" x 23"` under three - the die-cut
 * variants share a bounding box. Keying on the label silently dropped the second and third of each,
 * because a key that already held prices was treated as work already done. Ids keep every distinct
 * product, and the label map below turns them back into something a customer can read.
 */
data.options = { variants: allVariants, papers, colors };

const totalCombos = allVariants.length * papers.length * colors.length;
console.log(`${product} (productType=${productType})`);
console.log(`  ${allVariants.length} size/shape variants x ${papers.length} papers x ${colors.length} colors = ${totalCombos} combinations`);
console.log(`  ${Object.keys(data.prices).length} prices already captured, ${invalid.size} combinations known invalid\n`);

const save = () => {
  data.scrapedAt = new Date().toISOString();
  data.invalid = [...invalid];
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
};

let checked = 0, valid = 0, fresh = 0, skipped = 0;
const started = Date.now();

// A key already carrying prices means the whole curve is present, because a curve arrives in one
// response rather than one quantity at a time. Precomputed so the check is not a scan per combo.
const havePrefix = new Set(Object.keys(data.prices).map((k) => k.split("|").slice(0, 4).join("|")));

for (const sizeLabel of bySizeLabel) {
  let sizeHits = 0;
  for (const v of allVariants.filter((x) => x.label === sizeLabel)) {
    for (const paper of papers) {
      for (const color of colors) {
        const combo = [v.sizeId, v.shapeId, paper.id, color.id].join("|");
        checked++;

        if (invalid.has(combo)) { skipped++; continue; }
        if (havePrefix.has(combo)) { skipped++; valid++; sizeHits++; continue; }

        const q = new URLSearchParams({ productType: String(productType), turnaround: "1", orientation: "1" });
        if (v.shapeId != null) q.set("shape", String(v.shapeId));
        if (v.sizeId != null) q.set("size", String(v.sizeId));
        if (paper.id != null) q.set("paper", String(paper.id));
        if (color.id != null) q.set("color", String(color.id));

        const res = await api(`/service/rest/v1/products?${q}`);
        const id = res.json?.id ?? res.json?.items?.[0]?.id ?? null;
        if (res.status !== 200 || !id) { invalid.add(combo); continue; }

        const pr = await api(`/service/rest/v1/products/${id}/prices?itemId=null&cid=`);
        const items = pr.json?.items ?? [];
        if (!items.length) { invalid.add(combo); continue; }

        for (const it of items) {
          const price = Number(it.markupPrice ?? it.listPrice);
          if (Number.isFinite(price) && price > 0) { data.prices[`${combo}|${it.quantity}`] = price; fresh++; }
        }
        havePrefix.add(combo);
        valid++; sizeHits++;
        await page.waitForTimeout(DELAY_MS);
      }
    }
  }
  save();
  const pct = ((checked / totalCombos) * 100).toFixed(1);
  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`${sizeLabel.padEnd(26)} ${String(sizeHits).padStart(3)} valid | ${pct}% | ${Object.keys(data.prices).length} prices | ${mins}m`);
}

save();
console.log(`\ndone. ${Object.keys(data.prices).length} prices (${fresh} new) across ${valid} valid combinations`);
console.log(`${invalid.size} combinations do not exist, ${skipped} skipped as already known -> ${OUT}`);
await browser.close();
