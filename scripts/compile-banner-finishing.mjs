import fs from "node:fs";

/**
 * Trims the raw finishing scrape to the sizes actually on sale, and normalises orientation away.
 *
 * The scrape walks the supplier's 215 size entries, which are the 110 real sizes counted twice -
 * once horizontal, once vertical. Those were checked and price identically for every option and
 * quantity, so the pair collapses to one label matching lib/pricing/banners.
 *
 * Run after scripts/scrape-banner-finishing.mjs, against its raw output.
 *
 *   node scripts/compile-banner-finishing.mjs
 */

const RAW = "lib/pricing/banner-finishing.json";
const raw = JSON.parse(fs.readFileSync(RAW, "utf8"));
const catalogue = JSON.parse(fs.readFileSync("lib/pricing/banners-catalogue.json", "utf8"));

const sellable = new Set(catalogue.sizes);
const normalise = (label) => label.replace(/\s*(Horizontal|Vertical)\s*$/i, "").trim();

const prices = {};
const conflicts = [];
for (const [key, price] of Object.entries(raw.prices)) {
  const [size, option, qty] = key.split("|");
  const label = normalise(size);
  if (!sellable.has(label)) continue;

  const target = `${label}|${option}|${qty}`;
  if (prices[target] !== undefined && Math.abs(prices[target] - price) > 0.005) {
    conflicts.push(`${target}: ${prices[target]} vs ${price}`);
  }
  // Keep the lower of a colliding pair, so collapsing orientations can never raise a price.
  prices[target] = prices[target] === undefined ? price : Math.min(prices[target], price);
}

if (conflicts.length) {
  console.log(`orientation pairs that disagree (${conflicts.length}) - keeping the lower of each:`);
  for (const c of conflicts.slice(0, 5)) console.log(`  ${c}`);
}

const sizes = new Set(Object.keys(prices).map((k) => k.split("|")[0]));
const missing = [...sellable].filter((s) => !sizes.has(s));

const out = {
  scrapedAt: raw.scrapedAt,
  note: "Finishing options priced per banner, on top of the base curve.",
  groups: raw.groups,
  quantities: [...new Set(Object.keys(prices).map((k) => Number(k.split("|")[2])))].sort((a, b) => a - b),
  prices,
};

if (missing.length) {
  console.log(`\n${missing.length} sellable sizes have no finishing prices - not writing:`);
  for (const m of missing.slice(0, 8)) console.log(`  ${m}`);
  process.exitCode = 1;
} else {
  fs.writeFileSync(RAW, JSON.stringify(out, null, 2) + "\n");
  console.log(`\n${sizes.size} sizes, ${Object.keys(prices).length} finishing prices -> ${RAW}`);
  console.log(`file is ${(fs.statSync(RAW).size / 1024).toFixed(0)} KB`);
}
