import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

/**
 * Reads rigid board pricing (corrugated, PVC, foam, aluminium) from GotPrint.
 *
 * Boards do not price the way yard signs do. Their prices come from a POST:
 *
 *   POST /service/rest/v1/product/prices
 *   {"properties":{"size":"10667","printProductType":10015,"quantity":"1-150",
 *     "other":{"thicknessId":"1","shapeId":"15","color":1,...}}}
 *
 * That is the same path which answers badRequest to a GET, which is what made it look unavailable -
 * it was never a GET. The quantity field takes a range and one request returns the whole curve.
 *
 * Two things the page contradicts, and the page wins:
 *   - `paper` is inert. Thickness is carried by `thicknessId`, and the thicknesses live in a radio
 *     group rather than in the specification payload's two-entry `papers` list.
 *   - `colors` in the payload lists only front-only, yet the Print radio offers Front and Back and
 *     the API prices it. Both are therefore probed rather than read from the payload.
 *
 * Prices are cross-checked against yard signs, which are the same 4mm corrugated plastic: a 6" x 18"
 * board comes in a consistent 75c per unit under the equivalent yard sign across both print options,
 * so these are the same pricing engine rather than coincidental numbers.
 *
 *   node scripts/scrape-gotprint-boards.mjs corrugated-boards
 */

const SP = process.env.GP_SCRATCH
  ?? "C:/Users/User/AppData/Local/Temp/claude/C--Users-User/5a2dbf45-311b-44a1-a8e6-62c8a1f436f6/scratchpad";

const PRODUCT_TYPES = {
  "corrugated-boards": 10015,
  "pvc-boards": 10014,
  "foam-boards": 10013,
  "aluminum-boards": 10017,
};

/**
 * Quantity breaks worth storing.
 *
 * The API returns every integer to 150, which across four products is roughly 400,000 numbers and
 * far too much to ship to a browser. Signs sell in small counts, so every quantity to a dozen is
 * kept and the rest thinned - and, as with banners and postcards, only quantities actually quoted
 * are offered, never interpolated.
 */
const BREAKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 25, 30, 40, 50, 75, 100, 125, 150];

const product = process.argv[2];
const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const DELAY_MS = Number(arg("--delay")) || 220;
if (!PRODUCT_TYPES[product]) {
  console.error(`usage: node scripts/scrape-gotprint-boards.mjs <${Object.keys(PRODUCT_TYPES).join("|")}>`);
  process.exit(1);
}
const productType = PRODUCT_TYPES[product];

const OUT = path.join("lib/pricing", `${product}-scraped.json`);
const data = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, "utf8"))
  : { product, productType, scrapedAt: null, source: "gotprint POST /product/prices, Regular turnaround", options: {}, prices: {}, invalid: [] };
data.invalid ??= [];
const invalid = new Set(data.invalid);

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
  console.log("session lapsed - signing in");
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
await page.goto(`https://www.gotprint.com/products/${product}/order`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(6000);

const specRes = await page.evaluate(async (pt) => {
  const r = await fetch(`/service/rest/v1/settings/product/specifications?requestValues=true&productType=${pt}`, { headers: { accept: "application/json" } });
  return { status: r.status, json: await r.json() };
}, productType);
if (specRes.status !== 200) throw new Error(`specifications failed: ${specRes.status}`);
const spec = specRes.json;

/** Radio groups carry Thickness and Print, neither of which the specification payload states fully. */
const radios = await page.evaluate(() => {
  const out = {};
  for (const r of document.querySelectorAll('input[type="radio"]')) {
    const label = ((r.closest("label") ?? r.parentElement)?.innerText ?? "").split("\n")[0].trim();
    if (!label) continue;
    (out[r.name] ??= []).push({ value: r.value, label });
  }
  return out;
});
/**
 * Radio options belonging to one logical control, identified by the `name` prefix.
 *
 * Each radio in a group gets its own name - `thickness0`, `thickness1` - so grouping by name puts
 * every option in a group of one. Matching on the prefix reassembles them.
 *
 * The prefix is also the only dependable signal: matching on label text found `4mm` and `6mm` for
 * corrugated but nothing at all for foam, which measures in inches (`3/16"`, `1/2"`). That fell
 * through to a one-entry fallback and quietly captured a quarter of foam's catalogue.
 */
function radioGroup(prefix) {
  const seen = new Map();
  for (const [name, opts] of Object.entries(radios)) {
    if (!new RegExp(`^${prefix}\\d*$`, "i").test(name)) continue;
    for (const o of opts) if (!seen.has(o.value)) seen.set(o.value, o);
  }
  return [...seen.values()].sort((a, b) => Number(a.value) - Number(b.value));
}

const thicknesses = radioGroup("thickness").length ? radioGroup("thickness") : [{ value: null, label: "standard" }];
/** Foam is sold as Premium or Economy; the other boards have no such control. */
const types = radioGroup("type").length ? radioGroup("type") : [{ value: null, label: "" }];
console.log(`${product} (productType=${productType})`);
console.log(`  thicknesses: ${thicknesses.map((t) => `${t.label}=${t.value}`).join(", ")}`);

/** Front-only and both-sides, probed because the payload under-reports them. */
const PRINT = [
  { color: 1, sideId: "1", label: "Full Color Front, No Back" },
  { color: 3, sideId: "2", label: "Full Color Both Sides" },
];

/** Flattens sizes.list, including each entry's otherShapes, which carry their own sizeId. */
function variants(spec) {
  const out = [];
  for (const [key, v] of Object.entries(spec.sizes?.list ?? {})) {
    const p = v.properties ?? {};
    const common = { label: v.label, widthIn: p.presentationWidth ?? p.width, heightIn: p.presentationHeight ?? p.height, trimWidthIn: p.width, trimHeightIn: p.height, dpi: p.dpi };
    out.push({ sizeId: Number(key.replace(/^size_/, "")), shapeId: v.shapeId, shapeLabel: v.shapeLabel, ...common });
    for (const s of v.otherShapes ?? []) out.push({ sizeId: Number(s.sizeId), shapeId: Number(s.id), shapeLabel: s.label, ...common });
  }
  return out;
}

const allVariants = variants(spec);
data.options = { variants: allVariants, thicknesses, types, print: PRINT, quantities: BREAKS };
console.log(`  types: ${types.map((t) => t.label || "(none)").join(", ")}`);
console.log(`  ${allVariants.length} size/shape variants x ${thicknesses.length} thicknesses x ${types.length} types x ${PRINT.length} print options`);
console.log(`  ${Object.keys(data.prices).length} prices already captured\n`);

const save = () => {
  data.scrapedAt = new Date().toISOString();
  data.invalid = [...invalid];
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
};

const priceCurve = (other) => page.evaluate(async ({ o, pt }) => {
  const r = await fetch("/service/rest/v1/product/prices?itemId=null&cid=", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ properties: { size: o.sizeId, printProductType: pt, turnaround: 1, quantity: "1-150", other: o } }),
  });
  const t = await r.text();
  try { return { s: r.status, j: JSON.parse(t) }; } catch { return { s: r.status }; }
}, { o: other, pt: productType });

// A key is size|shape|thickness|type|color|quantity, so the combination is everything but the last.
const have = new Set(Object.keys(data.prices).map((k) => k.split("|").slice(0, 5).join("|")));
const wanted = new Set(BREAKS);
let done = 0, fresh = 0, valid = 0;
const started = Date.now();
const total = allVariants.length * thicknesses.length * types.length * PRINT.length;

for (const v of allVariants) {
  for (const th of thicknesses) {
    for (const ty of types) {
      for (const pr of PRINT) {
        const combo = [v.sizeId, v.shapeId, th.value ?? "-", ty.value ?? "-", pr.color].join("|");
        done++;
        if (invalid.has(combo) || have.has(combo)) { if (have.has(combo)) valid++; continue; }

        const other = {
          paper: 34, color: pr.color, sideId: pr.sideId, holeDrillingId: "1", accessoriesId: "1",
          sizeId: String(v.sizeId), widthId: String(v.widthIn), heightId: String(v.heightIn),
          materialColorId: "1", coreColorId: "1", materialId: "1",
          shapeId: String(v.shapeId), orientationId: "1",
        };
        if (th.value != null) other.thicknessId = th.value;
        if (ty.value != null) other.typeId = ty.value;

        const res = await priceCurve(other);
        const items = res.j?.items ?? [];
        const usable = items.filter((i) => wanted.has(i.quantity) && parsePrice(i.productPrice) !== null);
        if (!usable.length) { invalid.add(combo); continue; }
        for (const i of usable) { data.prices[`${combo}|${i.quantity}`] = parsePrice(i.productPrice); fresh++; }
        have.add(combo); valid++;
        await page.waitForTimeout(DELAY_MS);
      }
    }
  }
  if (done % 30 < PRINT.length * thicknesses.length * types.length) {
    save();
    console.log(`${v.label.padEnd(22)} ${((done / total) * 100).toFixed(1).padStart(5)}% | ${Object.keys(data.prices).length} prices | ${((Date.now() - started) / 60000).toFixed(1)}m`);
  }
}

save();
console.log(`\ndone. ${Object.keys(data.prices).length} prices (${fresh} new), ${valid} valid combinations, ${invalid.size} invalid -> ${OUT}`);
await browser.close();
