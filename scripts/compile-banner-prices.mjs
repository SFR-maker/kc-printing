import fs from "node:fs";

/**
 * Compiles the full 215-size banner scrape into the label-keyed table the site prices from.
 *
 * The API scrape keys by the supplier's numeric ids; lib/pricing/banners reads
 * `size|material|colour|quantity` labels. This converts one to the other and, before writing
 * anything, checks the new numbers against the twelve sizes already on sale. Those were scraped a
 * different way months earlier, so if the two disagree the new data is wrong and the run stops
 * rather than quietly repricing the catalogue.
 *
 *   node scripts/compile-banner-prices.mjs
 */

const SRC = "lib/pricing/banners-api-scraped.json";
const DEST = "lib/pricing/banners-scraped.json";

const api = JSON.parse(fs.readFileSync(SRC, "utf8"));
const current = JSON.parse(fs.readFileSync(DEST, "utf8"));

const sizeById = new Map(api.options.variants.map((v) => [String(v.sizeId), v.label]));
const paperById = new Map(api.options.papers.map((p) => [String(p.id), p.label]));
const colorById = new Map(api.options.colors.map((c) => [String(c.id), c.label]));

/** Orientation is a label suffix on the supplier's side; the price is the same either way. */
const normalise = (label) => label.replace(/\s*(Horizontal|Vertical)\s*$/i, "").trim();

const prices = {};
let skipped = 0;
for (const [key, price] of Object.entries(api.prices)) {
  const [sizeId, , paperId, colorId, qty] = key.split("|");
  const size = sizeById.get(sizeId);
  const paper = paperById.get(paperId);
  const color = colorById.get(colorId);
  if (!size || !paper || !color) { skipped++; continue; }

  const label = `${normalise(size)}|${paper}|${color}|${qty}`;
  // Horizontal and vertical collapse onto the same label and were verified to price identically;
  // keep the cheaper if they ever differ, so a collision can never raise a customer's price.
  if (prices[label] === undefined || price < prices[label]) prices[label] = price;
}

/* Check the overlap before trusting any of it. */
const shared = Object.keys(current.prices).filter((k) => prices[k] !== undefined);
const disagree = shared.filter((k) => Math.abs(current.prices[k] - prices[k]) > 0.005);
const missing = Object.keys(current.prices).filter((k) => prices[k] === undefined);

console.log(`existing table:      ${Object.keys(current.prices).length} prices`);
console.log(`new table:           ${Object.keys(prices).length} prices (${skipped} unmapped keys skipped)`);
console.log(`overlap:             ${shared.length} shared, ${disagree.length} disagree`);
console.log(`in old but not new:  ${missing.length}`);

if (disagree.length) {
  console.log("\nDISAGREEMENTS - not writing:");
  for (const k of disagree.slice(0, 10)) console.log(`  ${k}  old $${current.prices[k]}  new $${prices[k]}`);
  process.exitCode = 1;
} else if (missing.length) {
  console.log("\nThe new table does not cover everything already on sale - not writing:");
  for (const k of missing.slice(0, 10)) console.log(`  ${k}`);
  process.exitCode = 1;
} else {
  const sizes = new Set(Object.keys(prices).map((k) => k.split("|")[0]));
  fs.writeFileSync(DEST, JSON.stringify({
    product: "banners",
    scrapedAt: api.scrapedAt,
    source: "gotprint price API, Regular turnaround, full size catalogue",
    prices,
  }, null, 2) + "\n");
  console.log(`\nwritten: ${sizes.size} sizes, ${Object.keys(prices).length} prices -> ${DEST}`);
  console.log(`file is ${(fs.statSync(DEST).size / 1024).toFixed(0)} KB`);
}
