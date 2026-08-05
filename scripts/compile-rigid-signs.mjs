import fs from "node:fs";

/**
 * Compiles the five scraped rigid-sign catalogues into one client-safe option list.
 *
 * The price tables total roughly two megabytes, which is fine on a server and unacceptable in a
 * browser bundle - banners and postcards are imported by client components and ship to the browser,
 * and rigid signs are twenty times their size. So prices stay server-side and only the options a
 * customer chooses between are compiled here.
 *
 * The two families describe themselves differently and are normalised to one shape:
 *
 *   yard signs   size|shape|paper|color|qty          paper carries thickness, 53 quantities
 *   boards       size|shape|thickness|type|color|qty type is foam-only, 22 quantities
 *
 * Only size/shape pairs that actually priced are emitted. A yard sign lists 315 combinations of 35
 * sizes and 9 shapes but only 140 exist - a Star is made in a handful of sizes - and offering the
 * rest would let someone configure a sign that cannot be quoted.
 */

const MATERIALS = [
  { id: "yard-signs", label: "Yard Sign", file: "yard-signs", family: "yard" },
  { id: "corrugated-boards", label: "Corrugated Plastic Board", file: "corrugated-boards", family: "board" },
  { id: "pvc-boards", label: "PVC Board", file: "pvc-boards", family: "board" },
  { id: "foam-boards", label: "Foam Board", file: "foam-boards", family: "board" },
  { id: "aluminum-boards", label: "Aluminium Board", file: "aluminum-boards", family: "board" },
];

/**
 * Finished size in inches, from a label like `18" x 24" Horizontal` or `23"`.
 *
 * Boards state their dimensions outright; yard signs only carry a label, and the artwork step needs
 * real inches to size the document and place the bleed. A round sign is labelled with one number,
 * which is its diameter and therefore both sides of the bounding box.
 */
function parseSize(label) {
  const two = label.match(/([\d.]+)"?\s*x\s*([\d.]+)"/i);
  if (two) return { widthIn: Number(two[1]), heightIn: Number(two[2]) };
  const one = label.match(/^([\d.]+)"/);
  if (one) return { widthIn: Number(one[1]), heightIn: Number(one[1]) };
  return null;
}

const out = {};
let totalPrices = 0;

for (const m of MATERIALS) {
  const path = `lib/pricing/${m.file}-scraped.json`;
  if (!fs.existsSync(path)) { console.log(`  skipping ${m.id} - not scraped`); continue; }
  const d = JSON.parse(fs.readFileSync(path, "utf8"));
  totalPrices += Object.keys(d.prices).length;

  const isYard = m.family === "yard";
  // Thickness lives in `papers` for yard signs and in a radio group for boards.
  const thicknesses = isYard
    ? d.options.papers.map((p) => ({ value: String(p.id), label: p.label.replace(/\s*Corrugated Plastic.*/i, "").trim() || p.label }))
    : d.options.thicknesses.map((t) => ({ value: t.value == null ? "-" : String(t.value), label: t.label }));
  const types = isYard ? [] : (d.options.types ?? []).filter((t) => t.value != null).map((t) => ({ value: String(t.value), label: t.label }));
  const colors = isYard
    ? d.options.colors.map((c) => ({ value: String(c.id), label: c.label }))
    : d.options.print.map((p) => ({ value: String(p.color), label: p.label }));

  const quantities = isYard
    ? [...new Set(Object.keys(d.prices).map((k) => Number(k.split("|")[4])))].sort((a, b) => a - b)
    : d.options.quantities;

  // Which size/shape pairs actually priced.
  const priced = new Set(Object.keys(d.prices).map((k) => {
    const p = k.split("|");
    return `${p[0]}|${p[1]}`;
  }));

  const shapes = new Map();
  const sizes = new Map();
  const pairs = [];
  for (const v of d.options.variants) {
    const key = `${v.sizeId}|${v.shapeId}`;
    if (!priced.has(key)) continue;
    if (!shapes.has(v.shapeId)) shapes.set(v.shapeId, { id: v.shapeId, label: v.shapeLabel });
    if (!sizes.has(v.sizeId)) {
      const dim = v.widthIn != null && v.heightIn != null
        ? { widthIn: v.widthIn, heightIn: v.heightIn }
        : parseSize(v.label);
      if (!dim) { console.log(`  ${m.id}: cannot size "${v.label}" - skipped`); continue; }
      sizes.set(v.sizeId, {
        id: v.sizeId,
        label: v.label,
        widthIn: dim.widthIn,
        heightIn: dim.heightIn,
        // Boards state the real trim, which is a touch under the nominal size.
        trimWidthIn: v.trimWidthIn ?? dim.widthIn,
        trimHeightIn: v.trimHeightIn ?? dim.heightIn,
        dpi: v.dpi ?? 150,
      });
    }
    if (sizes.has(v.sizeId)) pairs.push([v.sizeId, v.shapeId]);
  }

  /**
   * How many quantity breaks each combination supports.
   *
   * Availability is not uniform: printing both sides of a 5" x 18" yard sign stops well short of
   * the quantities the front-only version reaches. Offering the material's full list everywhere
   * advertised 2,399 combinations the supplier will not quote, which becomes a failure after
   * payment rather than a missing option before it.
   *
   * Every one of the 2,516 combinations turns out to support a prefix of the material's quantity
   * list, so a single count says exactly which breaks are available.
   */
  const qtyCounts = {};
  const perCombo = {};
  for (const k of Object.keys(d.prices)) {
    const p = k.split("|");
    const combo = p.slice(0, -1).join("|");
    perCombo[combo] = (perCombo[combo] ?? 0) + 1;
  }
  for (const [combo, n] of Object.entries(perCombo)) {
    // Only keep counts that differ from the full list; the common case needs no entry.
    if (n !== quantities.length) qtyCounts[combo] = n;
  }

  out[m.id] = {
    label: m.label,
    family: m.family,
    thicknesses, types, colors, quantities,
    shapes: [...shapes.values()],
    sizes: [...sizes.values()].sort((a, b) => a.widthIn * a.heightIn - b.widthIn * b.heightIn),
    pairs,
    qtyCounts,
  };
  const capped = Object.keys(qtyCounts).length;
  if (capped) console.log(`    ${capped} of ${Object.keys(perCombo).length} combinations offer fewer than ${quantities.length} quantities`);
  console.log(`  ${m.id.padEnd(19)} ${String(sizes.size).padStart(3)} sizes  ${String(shapes.size).padStart(2)} shapes  ${String(pairs.length).padStart(4)} pairs  ${thicknesses.length} thickness  ${types.length || "-"} type  ${quantities.length} qty`);
}

const target = "lib/pricing/rigid-signs-catalogue.json";
fs.writeFileSync(target, JSON.stringify(out) + "\n");
const kb = (fs.statSync(target).size / 1024).toFixed(0);
console.log(`\n${totalPrices.toLocaleString("en-US")} prices behind the scenes; catalogue is ${kb} KB -> ${target}`);
