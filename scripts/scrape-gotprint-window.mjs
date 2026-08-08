import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

/**
 * Reads window signage pricing (decals, clings, perfs) from GotPrint.
 *
 * Window signage does not price the way the rigid boards do. Boards answer a POST to
 * /product/prices carrying the whole configuration; window products reject that call outright
 * ("Invalid quantity supplied", then "sideId: Invalid key supplied" once the quantity range is
 * dropped) because they are not priced from a configuration at all. A configuration first resolves
 * to a concrete product id, and the id is what carries a price:
 *
 *   GET /service/rest/v1/products
 *       ?productType=19&turnaround=1&shape=15&size=821&orientation=1&paper=20&color=1
 *     -> {"items":[{"id":303154973}]}
 *
 *   GET /service/rest/v1/products/{productId}/prices?itemId=null&cid=
 *     -> the entire quantity curve for that product in one response
 *
 * The neighbouring /products/quantities endpoint looks like the resolver and is not - it answers
 * the same query string with quantities and turnaround availability but no id at all.
 *
 * Two calls per size, and one response covers every quantity break, so the whole catalogue is a few
 * hundred requests rather than the tens of thousands the boards needed.
 *
 * Shape is not a free choice here. Each size entry in the specification payload carries its own
 * `properties.shape`, and a size is only valid against that shape - a 6" x 24" Rectangle (size 821,
 * shape 15) and a 6" x 24" Rounded Rectangle (size 834, shape 5) are separate products at separate
 * prices that share a label. Sizes are therefore iterated and their shape read off them, never
 * crossed with the shapes list.
 *
 *   node scripts/scrape-gotprint-window.mjs window-decals
 *   node scripts/scrape-gotprint-window.mjs --all
 */

const SP = process.env.GP_SCRATCH
  ?? "C:/Users/User/AppData/Local/Temp/claude/C--Users-User/5a2dbf45-311b-44a1-a8e6-62c8a1f436f6/scratchpad";

const PRODUCT_TYPES = {
  "window-decals": 19,
  "window-clings": 18,
  "window-perfs": 41,
};

const arg = (f) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : null; };
const DELAY_MS = Number(arg("--delay")) || 200;
const targets = process.argv.includes("--all")
  ? Object.keys(PRODUCT_TYPES)
  : [process.argv[2]].filter((p) => PRODUCT_TYPES[p]);

if (!targets.length) {
  console.error(`usage: node scripts/scrape-gotprint-window.mjs <${Object.keys(PRODUCT_TYPES).join("|")}|--all>`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(path.join(SP, "gp.env"), "utf8").split("\n").filter(Boolean)
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

/**
 * Parses a supplier price.
 *
 * markupPrice arrives as a formatted string and gains thousands separators above $999.99, so
 * Number("1,035.24") is NaN. Guarding on non-finite values without stripping separators silently
 * drops every price over a thousand dollars, which is exactly how the banner and yard sign tables
 * came to top out at $999.
 */
function parsePrice(value) {
  const n = Number(String(value ?? "").replace(/,/g, "").trim());
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

const getJson = (url) => page.evaluate(async (u) => {
  const r = await fetch(u, { headers: { accept: "application/json" } });
  const t = await r.text();
  try { return { s: r.status, j: JSON.parse(t) }; } catch { return { s: r.status, t: t.slice(0, 300) }; }
}, url);

await ensureSession();

for (const product of targets) {
  const productType = PRODUCT_TYPES[product];
  const OUT = path.join("lib/pricing", `${product}-scraped.json`);
  const data = fs.existsSync(OUT)
    ? JSON.parse(fs.readFileSync(OUT, "utf8"))
    : {
        product, productType, scrapedAt: null,
        source: "gotprint GET /products/quantities -> GET /products/{id}/prices, Regular turnaround",
        options: {}, prices: {}, invalid: [],
      };
  data.invalid ??= [];
  const invalid = new Set(data.invalid);

  console.log(`\n================ ${product} (productType=${productType}) ================`);
  await page.goto(`https://www.gotprint.com/products/${product}/order`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(5000);

  const specRes = await getJson(`/service/rest/v1/settings/product/specifications?requestValues=true&productType=${productType}`);
  if (specRes.s !== 200) throw new Error(`specifications failed for ${product}: ${specRes.s}`);
  const spec = specRes.j;

  const shapeLabels = new Map((spec.shapes ?? []).map((s) => [Number(s.id), s.label]));
  const papers = (spec.papers ?? []).map((p) => ({ value: String(p.id), label: p.label }));
  const colors = (spec.colors ?? []).map((c) => ({ value: String(c.id), label: c.label }));
  const turnarounds = (spec.turnarounds ?? []).map((t) => ({ value: String(t.id), label: t.label }));

  /**
   * Sizes carry their own shape and orientation. `presentationWidth` is the size as sold ("18 x 24")
   * and `width` is the printable trim, a touch under it; both are kept because the storefront quotes
   * the first and the print pipeline needs the second.
   */
  const sizes = (spec.sizes ?? []).map((z) => ({
    id: Number(z.id),
    label: z.label,
    shapeId: Number(z.properties?.shape),
    shapeLabel: shapeLabels.get(Number(z.properties?.shape)) ?? "",
    widthIn: z.properties?.presentationWidth ?? z.properties?.width,
    heightIn: z.properties?.presentationHeight ?? z.properties?.height,
    trimWidthIn: z.properties?.width,
    trimHeightIn: z.properties?.height,
    dpi: z.properties?.dpi ?? 150,
    orientationId: Number(z.orientation?.id ?? 1),
    orientationLabel: z.orientation?.label ?? "",
  })).filter((z) => Number.isFinite(z.id) && Number.isFinite(z.shapeId));

  const paper = papers[0]?.value ?? "";
  const color = colors[0]?.value ?? "1";

  data.options = { sizes, shapes: [...shapeLabels].map(([id, label]) => ({ id, label })), papers, colors, turnarounds };
  console.log(`  ${sizes.length} sizes | papers: ${papers.map((p) => p.label).join(", ")} | colors: ${colors.map((c) => c.label).join(", ")}`);
  console.log(`  ${Object.keys(data.prices).length} prices already captured`);

  const save = () => {
    data.scrapedAt = new Date().toISOString();
    data.invalid = [...invalid];
    fs.writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
  };

  // A key is size|shape|quantity, so the combination is everything but the last field.
  const have = new Set(Object.keys(data.prices).map((k) => k.split("|").slice(0, 2).join("|")));
  const quantitySet = new Set();
  let done = 0, fresh = 0, valid = 0;
  const started = Date.now();

  for (const z of sizes) {
    done++;
    const combo = `${z.id}|${z.shapeId}`;
    if (invalid.has(combo) || have.has(combo)) { if (have.has(combo)) valid++; continue; }

    const qRes = await getJson(
      `/service/rest/v1/products?productType=${productType}&turnaround=1`
      + `&shape=${z.shapeId}&size=${z.id}&orientation=${z.orientationId}&paper=${paper}&color=${color}`,
    );
    // Guarded rather than assumed present: a missing id would otherwise be interpolated straight
    // into /products/undefined/prices, which answers 200 with an empty item list and so reads as
    // "this size is not sold" instead of "the resolver changed shape".
    const productId = qRes.j?.items?.[0]?.id ?? null;
    if (qRes.s !== 200 || !productId) { invalid.add(combo); continue; }

    const pRes = await getJson(`/service/rest/v1/products/${productId}/prices?itemId=null&cid=`);
    const items = (pRes.j?.items ?? []).filter((i) => parsePrice(i.markupPrice) !== null);
    if (!items.length) { invalid.add(combo); continue; }

    for (const i of items) {
      data.prices[`${combo}|${i.quantity}`] = parsePrice(i.markupPrice);
      quantitySet.add(i.quantity);
      fresh++;
    }
    have.add(combo); valid++;

    if (done % 15 === 0) {
      save();
      console.log(`  ${z.label.padEnd(26)} ${((done / sizes.length) * 100).toFixed(1).padStart(5)}% | ${Object.keys(data.prices).length} prices | ${((Date.now() - started) / 60000).toFixed(1)}m`);
    }
    await page.waitForTimeout(DELAY_MS);
  }

  // Recovered from the responses rather than the select, so the stored list can never claim a
  // quantity break no price was actually returned for.
  data.options.quantities = [...quantitySet].sort((a, b) => a - b);
  save();
  console.log(`  done. ${Object.keys(data.prices).length} prices (${fresh} new), ${valid} valid sizes, ${invalid.size} invalid -> ${OUT}`);
}

await browser.close();
