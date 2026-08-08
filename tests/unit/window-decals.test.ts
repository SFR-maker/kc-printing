import { describe, it, expect } from "vitest";
import {
  WINDOW_MATERIALS, type WindowMaterialId, type WindowDecalSpec,
  defaultWindowDecalSpec, materialFilm, materialLabel, quantitiesFor, repairWindowDecalSpec,
  shapeLabel, shapesFor, sizeById, sizesFor, windowDecalPriceKey, windowNeedsBack,
} from "@/lib/pricing/window-decals";
import { WINDOW_DECAL_SIZES, sizePresetsFor, PRODUCT_DB_VALUE, PRODUCT_ROUTE_SEGMENT } from "@/lib/business-card/print-spec";
import { SERVICES } from "@/lib/service-data";

import decals from "@/lib/pricing/window-decals-scraped.json";
import clings from "@/lib/pricing/window-clings-scraped.json";
import perfs from "@/lib/pricing/window-perfs-scraped.json";

/**
 * The catalogue shipped to the browser and the price tables kept on the server are separate files,
 * so the thing worth testing is that they agree: every option the form offers must have a real
 * quoted price behind it, and nothing the form offers may be unquotable.
 *
 * The tables are imported directly here rather than through lib/pricing/window-decals-server, which
 * is marked server-only and cannot be loaded in a test process.
 */

const TABLES: Record<WindowMaterialId, { prices: Record<string, number> }> = {
  "window-decals": decals as never,
  "window-clings": clings as never,
  "window-perfs": perfs as never,
};

const ALL = WINDOW_MATERIALS.map((m) => m.id);

/**
 * A spec with a quantity chosen.
 *
 * defaultWindowDecalSpec deliberately leaves quantity at 0 - it is a required choice, not a default
 * run length - so anything asserting a price has to make that choice first, as the customer does.
 */
function withQuantity(spec: WindowDecalSpec): WindowDecalSpec {
  const qs = quantitiesFor(spec);
  return { ...spec, quantity: qs[0] ?? 0 };
}

describe("catalogue", () => {
  it("offers all three window films", () => {
    expect(ALL).toEqual(["window-decals", "window-clings", "window-perfs"]);
  });

  it("names the film each material is printed on", () => {
    expect(materialFilm("window-decals")).toMatch(/adhesive vinyl/i);
    expect(materialFilm("window-clings")).toMatch(/cling/i);
    expect(materialFilm("window-perfs")).toMatch(/perforated/i);
  });

  it("gives every material a label and at least one shape", () => {
    for (const m of ALL) {
      expect(materialLabel(m)).toBeTruthy();
      expect(shapesFor(m).length).toBeGreaterThan(0);
    }
  });

  it("lists every size under exactly the shape it is cut to", () => {
    for (const m of ALL) {
      for (const shape of shapesFor(m)) {
        const sizes = sizesFor(m, shape.id);
        expect(sizes.length).toBeGreaterThan(0);
        for (const s of sizes) expect(s.shapeId).toBe(shape.id);
      }
    }
  });

  it("never returns sizes for a shape that does not exist", () => {
    expect(sizesFor("window-decals", 999_999)).toEqual([]);
  });

  it("prints on the face only", () => {
    expect(windowNeedsBack()).toBe(false);
  });
});

describe("prices", () => {
  it("has a quoted price for every size, shape and quantity the form offers", () => {
    for (const m of ALL) {
      const table = TABLES[m].prices;
      for (const shape of shapesFor(m)) {
        for (const size of sizesFor(m, shape.id)) {
          const qs = quantitiesFor({ material: m, sizeId: size.id, shapeId: shape.id });
          expect(qs.length).toBeGreaterThan(0);
          for (const q of qs) {
            const key = windowDecalPriceKey({ material: m, sizeId: size.id, shapeId: shape.id, quantity: q });
            expect(table[key], `${m} ${key}`).toBeTypeOf("number");
          }
        }
      }
    }
  });

  it("offers every combination the supplier quoted", () => {
    for (const m of ALL) {
      const offered = new Set<string>();
      for (const shape of shapesFor(m)) {
        for (const size of sizesFor(m, shape.id)) {
          for (const q of quantitiesFor({ material: m, sizeId: size.id, shapeId: shape.id })) {
            offered.add(windowDecalPriceKey({ material: m, sizeId: size.id, shapeId: shape.id, quantity: q }));
          }
        }
      }
      for (const key of Object.keys(TABLES[m].prices)) {
        expect(offered.has(key), `${m} ${key} is priced but not offered`).toBe(true);
      }
    }
  });

  it("prices rise with quantity", () => {
    for (const m of ALL) {
      const spec = defaultWindowDecalSpec(m);
      const qs = quantitiesFor(spec);
      const table = TABLES[m].prices;
      let previous = 0;
      for (const q of qs) {
        const price = table[windowDecalPriceKey({ ...spec, quantity: q })];
        expect(price).toBeGreaterThanOrEqual(previous);
        previous = price;
      }
    }
  });

  /**
   * The published "starting at" figures on gotprint.com/products/window-signage. These are the check
   * that the price resolver was followed to the right product rather than a neighbouring one - the
   * three films are quoted by three separate product types and it would be entirely possible to
   * scrape one table three times without noticing.
   */
  it("matches the supplier's published starting prices", () => {
    const cheapest = (m: WindowMaterialId) => Math.min(...Object.values(TABLES[m].prices));
    expect(cheapest("window-decals")).toBeCloseTo(18.12, 2);
    expect(cheapest("window-clings")).toBeCloseTo(14.37, 2);
    expect(cheapest("window-perfs")).toBeCloseTo(17.87, 2);
  });

  it("never quotes a non-positive price", () => {
    for (const m of ALL) {
      for (const [key, price] of Object.entries(TABLES[m].prices)) {
        expect(price, `${m} ${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("repair", () => {
  it("opens on a configuration that can be quoted", () => {
    for (const m of ALL) {
      const spec = withQuantity(defaultWindowDecalSpec(m));
      expect(TABLES[m].prices[windowDecalPriceKey(spec)]).toBeTypeOf("number");
    }
  });

  it("leaves the unchosen quantity alone", () => {
    // 0 is the picker's "not chosen yet" sentinel. If repair filled it in, changing any other
    // control would silently pick a run length on the customer's behalf.
    const spec = defaultWindowDecalSpec();
    expect(spec.quantity).toBe(0);
    expect(repairWindowDecalSpec({ ...spec, shapeId: shapesFor("window-decals")[0].id }).quantity).toBe(0);
  });

  it("moves to a valid size when the shape changes", () => {
    const m: WindowMaterialId = "window-decals";
    const circle = shapesFor(m).find((s) => /circle/i.test(s.label))!;
    const start = withQuantity(defaultWindowDecalSpec(m));
    const moved = repairWindowDecalSpec({ ...start, shapeId: circle.id }, start);
    expect(sizesFor(m, circle.id).some((s) => s.id === moved.sizeId)).toBe(true);
    expect(TABLES[m].prices[windowDecalPriceKey(moved)]).toBeTypeOf("number");
  });

  it("keeps a comparable size rather than snapping to the smallest", () => {
    const m: WindowMaterialId = "window-decals";
    const rect = shapesFor(m).find((s) => /^Rectangle$/i.test(s.label))!;
    const sizes = sizesFor(m, rect.id);
    const largest = sizes[sizes.length - 1];
    const square = shapesFor(m).find((s) => /^Square$/i.test(s.label))!;

    const from: WindowDecalSpec = { material: m, shapeId: rect.id, sizeId: largest.id, quantity: 1 };
    const moved = repairWindowDecalSpec({ ...from, shapeId: square.id }, from);
    const landed = sizeById(m, moved.sizeId)!;
    const smallest = sizesFor(m, square.id)[0];
    // The largest rectangle is 60 x 40; snapping to the smallest square would land on 18 x 18.
    expect(landed.widthIn * landed.heightIn).toBeGreaterThan(smallest.widthIn * smallest.heightIn);
  });

  it("survives a change of film", () => {
    const start = withQuantity(defaultWindowDecalSpec("window-decals"));
    for (const m of ALL) {
      const moved = repairWindowDecalSpec({ ...start, material: m }, start);
      expect(TABLES[m].prices[windowDecalPriceKey(moved)], `${m}`).toBeTypeOf("number");
    }
  });

  it("repairs a shape that does not exist", () => {
    const spec = repairWindowDecalSpec({ material: "window-decals", shapeId: 999_999, sizeId: 1, quantity: 0 });
    expect(shapesFor("window-decals").some((s) => s.id === spec.shapeId)).toBe(true);
    expect(sizesFor("window-decals", spec.shapeId).some((s) => s.id === spec.sizeId)).toBe(true);
  });

  it("snaps an unavailable quantity to the nearest available one", () => {
    const spec = defaultWindowDecalSpec();
    const repaired = repairWindowDecalSpec({ ...spec, quantity: 10_000 });
    expect(quantitiesFor(spec)).toContain(repaired.quantity);
  });
});

describe("geometry", () => {
  it("states a trim a touch under the nominal size", () => {
    for (const m of ALL) {
      for (const shape of shapesFor(m)) {
        for (const size of sizesFor(m, shape.id)) {
          expect(size.trimWidthIn).toBeLessThanOrEqual(size.widthIn);
          expect(size.trimHeightIn).toBeLessThanOrEqual(size.heightIn);
          expect(size.trimWidthIn).toBeGreaterThan(0);
          expect(size.dpi).toBeGreaterThan(0);
        }
      }
    }
  });

  /**
   * Labels are rebuilt from the real dimensions rather than passed through from the supplier, which
   * labels these back to front - what GotPrint calls `6" x 24" Horizontal` is 24 wide and 6 tall.
   * A label that disagreed with the document would show one size on the order and print another.
   */
  it("labels sizes with the dimensions they actually print at", () => {
    for (const m of ALL) {
      for (const shape of shapesFor(m)) {
        for (const size of sizesFor(m, shape.id)) {
          const nums = (size.label.match(/[\d.]+/g) ?? []).map(Number);
          if (nums.length === 2) {
            expect([size.widthIn, size.heightIn], size.label).toEqual(nums);
          } else {
            // A circle or octagon is labelled with its single dimension, which is both sides.
            expect(size.widthIn, size.label).toBe(size.heightIn);
            expect(nums[0], size.label).toBe(size.widthIn);
          }
        }
      }
    }
  });
});

describe("design studio", () => {
  it("only offers sizes on the studio that can actually be bought", () => {
    // Every studio preset must map onto a real sellable trim, or a design made in the editor
    // cannot be ordered at the size it was designed for.
    const sellable = new Set<string>();
    for (const shape of shapesFor("window-decals")) {
      for (const s of sizesFor("window-decals", shape.id)) {
        sellable.add(`${s.trimWidthIn}x${s.trimHeightIn}`);
      }
    }
    for (const preset of WINDOW_DECAL_SIZES) {
      expect(sellable.has(`${preset.trimWidthIn}x${preset.trimHeightIn}`), preset.key).toBe(true);
    }
  });

  it("is wired into the design product maps", () => {
    expect(sizePresetsFor("window-decal")).toBe(WINDOW_DECAL_SIZES);
    expect(PRODUCT_DB_VALUE["window-decal"]).toBe("WINDOW_DECAL");
    expect(PRODUCT_ROUTE_SEGMENT["window-decal"]).toBe("window-decals");
  });
});

describe("storefront", () => {
  it("is listed as a service with packages, add-ons and FAQs", () => {
    const service = SERVICES["window-decals"];
    expect(service).toBeDefined();
    expect(service.packages.length).toBeGreaterThan(0);
    expect(service.addOns.length).toBeGreaterThan(0);
    expect(service.faqs.length).toBeGreaterThan(0);
  });

  it("names the shape labels the catalogue actually offers", () => {
    for (const shape of shapesFor("window-decals")) {
      expect(shapeLabel("window-decals", shape.id)).toBe(shape.label);
    }
  });
});
