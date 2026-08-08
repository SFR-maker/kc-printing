import fs from "node:fs";

/**
 * Compiles the three scraped window-signage catalogues into one client-safe option list.
 *
 * Same split as rigid signs: the price tables total 14,391 quotes and stay server-side, and only the
 * options a customer chooses between are compiled here for the browser.
 *
 * Window signage is a simpler product than the boards. There is no thickness control, no Premium /
 * Economy type, and one print option - the film is printed on the front and applied to glass, so
 * "both sides" does not exist. What varies is the material (which is a separate GotPrint product,
 * not an option within one), the shape, the size and the quantity.
 *
 * Shape is not crossed with size. Each size in the supplier payload carries its own `shape`, and the
 * pair is a distinct product: 6" x 24" Rectangle (size 821) and 6" x 24" Rounded Rectangle (size
 * 834) share a label and nothing else. Sizes therefore carry their shape and are filtered by it.
 *
 *   node scripts/compile-window-decals.mjs
 */

const MATERIALS = [
  {
    id: "window-decals",
    label: "Window Decal",
    blurb: "Adhesive vinyl. Sticks to any clean flat surface, inside or out.",
  },
  {
    id: "window-clings",
    label: "Window Cling",
    blurb: "Static cling. Holds to glass with no adhesive and repositions freely.",
  },
  {
    id: "window-perfs",
    label: "Window Perf",
    blurb: "Perforated film. Reads as a solid graphic outside, see-through from inside.",
  },
];

/**
 * A truthful size label.
 *
 * GotPrint labels these back to front - what it calls `6" x 24" Horizontal` is 24 inches wide and 6
 * inches tall, and its own payload says so in presentationWidth/presentationHeight. Passing the
 * supplier label through would print "6 x 24" next to a document the artwork step lays out at 24 x
 * 6, so the label is rebuilt from the dimensions actually used. A square-bounded shape (a circle, an
 * octagon) is labelled with its single dimension, the way a round sign is normally sold.
 */
function sizeLabel(widthIn, heightIn, shapeLabel) {
  const n = (v) => (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2))));
  if (widthIn === heightIn && /circle|octagon/i.test(shapeLabel)) return `${n(widthIn)}"`;
  return `${n(widthIn)}" x ${n(heightIn)}"`;
}

const out = {};
let totalPrices = 0;

for (const m of MATERIALS) {
  const path = `lib/pricing/${m.id}-scraped.json`;
  if (!fs.existsSync(path)) { console.log(`  skipping ${m.id} - not scraped`); continue; }
  const d = JSON.parse(fs.readFileSync(path, "utf8"));
  totalPrices += Object.keys(d.prices).length;

  // Which size/shape pairs actually priced. A size the supplier would not quote must not reach the
  // form, or the customer configures a decal that fails at checkout rather than at selection.
  const priced = new Set(Object.keys(d.prices).map((k) => k.split("|").slice(0, 2).join("|")));

  const quantities = [...new Set(Object.keys(d.prices).map((k) => Number(k.split("|")[2])))]
    .sort((a, b) => a - b);

  const shapes = new Map();
  const sizes = [];
  for (const z of d.options.sizes) {
    if (!priced.has(`${z.id}|${z.shapeId}`)) continue;
    if (!shapes.has(z.shapeId)) shapes.set(z.shapeId, { id: z.shapeId, label: z.shapeLabel });
    sizes.push({
      id: z.id,
      shapeId: z.shapeId,
      label: sizeLabel(z.widthIn, z.heightIn, z.shapeLabel),
      widthIn: z.widthIn,
      heightIn: z.heightIn,
      // The printable trim, a touch under the nominal size - the artwork step lays out to this.
      trimWidthIn: z.trimWidthIn,
      trimHeightIn: z.trimHeightIn,
      dpi: z.dpi,
      orientationId: z.orientationId,
    });
  }
  sizes.sort((a, b) => a.widthIn * a.heightIn - b.widthIn * b.heightIn);

  /**
   * Quantity availability is uniform across window signage - every one of the 117 size/shape pairs
   * quotes all 41 breaks - so unlike rigid signs there is nothing to cap. Verified rather than
   * assumed, because silently offering a break the supplier will not quote fails after payment.
   */
  const perCombo = {};
  for (const k of Object.keys(d.prices)) {
    const combo = k.split("|").slice(0, 2).join("|");
    perCombo[combo] = (perCombo[combo] ?? 0) + 1;
  }
  const short = Object.entries(perCombo).filter(([, n]) => n !== quantities.length);
  if (short.length) {
    console.log(`  ${m.id}: ${short.length} combinations offer fewer than ${quantities.length} quantities`);
  }
  const qtyCounts = Object.fromEntries(short);

  out[m.id] = {
    label: m.label,
    blurb: m.blurb,
    material: d.options.papers[0]?.label ?? "",
    paper: String(d.options.papers[0]?.id ?? ""),
    color: String(d.options.colors[0]?.id ?? "1"),
    shapes: [...shapes.values()],
    sizes,
    quantities,
    qtyCounts,
  };
  console.log(`  ${m.id.padEnd(16)} ${String(sizes.length).padStart(3)} sizes  ${String(shapes.size).padStart(2)} shapes  ${quantities.length} qty  ${d.options.papers[0]?.label}`);
}

const target = "lib/pricing/window-decals-catalogue.json";
fs.writeFileSync(target, JSON.stringify(out) + "\n");
const kb = (fs.statSync(target).size / 1024).toFixed(0);
console.log(`\n${totalPrices.toLocaleString("en-US")} prices behind the scenes; catalogue is ${kb} KB -> ${target}`);
