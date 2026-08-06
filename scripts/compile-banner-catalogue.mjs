import fs from "node:fs";

/**
 * Compiles the banner price table into a client-safe option list.
 *
 * The full table is 13,530 prices across 110 sizes and comes to 1.1MB. lib/pricing/banners is
 * imported by the spec picker, so that whole file was shipping to the browser - three 1.1MB chunks
 * in the build. Prices stay on the server behind /api/price/banners, exactly as rigid signs already
 * do, and only the options a customer chooses between are compiled here.
 *
 * Availability is per combination and every one of the 330 turns out to support a prefix of the
 * quantity list, so a single count says where each stops.
 *
 *   node scripts/compile-banner-catalogue.mjs
 */

const src = JSON.parse(fs.readFileSync("lib/pricing/banners-scraped.json", "utf8"));
const OUT = "lib/pricing/banners-catalogue.json";

const keys = Object.keys(src.prices);
const quantities = [...new Set(keys.map((k) => Number(k.split("|")[3])))].sort((a, b) => a - b);

/** Finished area, used to order the size list the way a customer scans it. */
function areaSqFt(label) {
  const m = label.match(/([\d.]+)\s*ft\s*x\s*([\d.]+)\s*ft/i);
  return m ? Number(m[1]) * Number(m[2]) : 0;
}

const sizes = [...new Set(keys.map((k) => k.split("|")[0]))].sort((a, b) => areaSqFt(a) - areaSqFt(b));
const materials = [...new Set(keys.map((k) => k.split("|")[1]))];
const colors = [...new Set(keys.map((k) => k.split("|")[2]))];

/** How many quantity breaks each size/material/colour supports. Omitted when it is the full list. */
const perCombo = {};
for (const k of keys) {
  const combo = k.split("|").slice(0, 3).join("|");
  perCombo[combo] = (perCombo[combo] ?? 0) + 1;
}
const qtyCounts = {};
for (const [combo, count] of Object.entries(perCombo)) {
  if (count !== quantities.length) qtyCounts[combo] = count;
}

const out = { scrapedAt: src.scrapedAt, sizes, materials, colors, quantities, qtyCounts };
fs.writeFileSync(OUT, JSON.stringify(out) + "\n");

console.log(`  sizes: ${sizes.length}, materials: ${materials.length}, colours: ${colors.length}`);
console.log(`  quantity breaks: ${quantities.length}; ${Object.keys(qtyCounts).length} of ${Object.keys(perCombo).length} combinations offer fewer`);
console.log(`  ${(fs.statSync(OUT).size / 1024).toFixed(0)} KB -> ${OUT}`);
console.log(`  (prices stay server-side: ${keys.length} of them, ${(fs.statSync("lib/pricing/banners-scraped.json").size / 1024).toFixed(0)} KB)`);
