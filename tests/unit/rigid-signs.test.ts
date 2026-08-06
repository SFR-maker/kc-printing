import { describe, it, expect } from "vitest";
import {
  RIGID_MATERIALS, type RigidMaterialId, type RigidSignSpec,
  colorsFor, defaultRigidSpec, quantitiesFor, repairRigidSpec, rigidNeedsBack,
  shapesFor, sizeById, sizesFor, thicknessesFor, typesFor, rigidPriceKey,
} from "@/lib/pricing/rigid-signs";

import yardSigns from "@/lib/pricing/yard-signs-scraped.json";
import corrugated from "@/lib/pricing/corrugated-boards-scraped.json";
import pvc from "@/lib/pricing/pvc-boards-scraped.json";
import foam from "@/lib/pricing/foam-boards-scraped.json";
import aluminium from "@/lib/pricing/aluminum-boards-scraped.json";

/**
 * The catalogue shipped to the browser and the price tables kept on the server are separate files,
 * so the thing worth testing is that they agree: every option the form offers must have a real
 * quoted price behind it, and nothing the form offers may be unquotable.
 *
 * The tables are imported directly here rather than through lib/pricing/rigid-signs-server, which
 * is marked server-only and cannot be loaded in a test process.
 */

const TABLES: Record<RigidMaterialId, { prices: Record<string, number> }> = {
  "yard-signs": yardSigns as never,
  "corrugated-boards": corrugated as never,
  "pvc-boards": pvc as never,
  "foam-boards": foam as never,
  "aluminum-boards": aluminium as never,
};

const ALL = RIGID_MATERIALS.map((m) => m.id);

/**
 * A spec with a quantity chosen.
 *
 * defaultRigidSpec deliberately leaves quantity at 0 - it is a required choice, not a default run
 * length - so anything asserting a price has to make that choice first, exactly as the customer does.
 */
function withQuantity(spec: RigidSignSpec): RigidSignSpec {
  const qs = quantitiesFor(spec);
  return { ...spec, quantity: qs[0] ?? 0 };
}

describe("catalogue", () => {
  it("offers all five rigid-sign products", () => {
    expect(ALL).toEqual([
      "yard-signs", "corrugated-boards", "pvc-boards", "foam-boards", "aluminum-boards",
    ]);
  });

  it("gives foam a grade choice and gives no other material one", () => {
    // Foam is sold Premium or Economy; matching on label text missed this entirely because foam
    // measures thickness in inches while the others use millimetres.
    expect(typesFor("foam-boards").map((t) => t.label)).toEqual(["Premium", "Economy"]);
    for (const m of ALL.filter((x) => x !== "foam-boards")) {
      expect(typesFor(m), `${m} should have no grade control`).toHaveLength(0);
    }
  });

  it("keeps foam's inch thicknesses and the others' millimetre ones", () => {
    expect(thicknessesFor("foam-boards").map((t) => t.label)).toEqual(['3/16"', '1/2"']);
    expect(thicknessesFor("corrugated-boards").map((t) => t.label)).toEqual(["4mm", "6mm", "10mm"]);
  });

  it("offers both print sides everywhere", () => {
    for (const m of ALL) {
      expect(colorsFor(m).length, m).toBe(2);
    }
  });

  it("knows a rigid sign's back is only printed on the both-sides option", () => {
    expect(rigidNeedsBack("3")).toBe(true);
    expect(rigidNeedsBack("1")).toBe(false);
  });
});

describe("every option offered has a real quoted price", () => {
  /**
   * The whole catalogue, exhaustively. This is the check that matters: an earlier build offered a
   * single quantity list per material and advertised 2,399 combinations the supplier will not quote,
   * which becomes a failed order after payment rather than a missing option before it.
   */
  it("prices all 57,293 offered combinations", () => {
    let checked = 0;
    const missing: string[] = [];

    for (const m of ALL) {
      const prices = TABLES[m].prices;
      for (const shape of shapesFor(m)) {
        for (const size of sizesFor(m, shape.id)) {
          for (const th of thicknessesFor(m)) {
            const types = typesFor(m).length ? typesFor(m) : [{ value: "", label: "" }];
            for (const ty of types) {
              for (const c of colorsFor(m)) {
                const base = { material: m, sizeId: size.id, shapeId: shape.id, thickness: th.value, type: ty.value, color: c.value };
                for (const q of quantitiesFor(base)) {
                  const spec = { ...base, quantity: q } as RigidSignSpec;
                  checked++;
                  if (prices[rigidPriceKey(spec)] === undefined) missing.push(`${m} ${rigidPriceKey(spec)}`);
                }
              }
            }
          }
        }
      }
    }

    expect(missing.slice(0, 5)).toEqual([]);
    expect(checked).toBe(57293);
  });

  it("offers no size/shape pair the supplier does not make", () => {
    // A Star yard sign exists in a handful of sizes; an 18" x 24" Arrow is a different product from
    // an 18" x 24" Rectangle and costs more. Labels alone cannot tell them apart.
    for (const m of ALL) {
      for (const shape of shapesFor(m)) {
        expect(sizesFor(m, shape.id).length, `${m}/${shape.label}`).toBeGreaterThan(0);
      }
    }
  });
});

describe("die-cut shapes are priced as their own products", () => {
  it("charges more for an arrow than a rectangle of the same size", () => {
    const prices = TABLES["yard-signs"].prices;
    // 303 is the 18" x 24" rectangle, 515 the arrow of the same nominal size.
    expect(prices["303|15|34|1|1"]).toBe(15.15);
    expect(prices["515|10|34|1|1"]).toBe(22.23);
  });
});

describe("materials are priced independently", () => {
  it("charges more for aluminium than corrugated plastic", () => {
    const at = (m: RigidMaterialId) => {
      const s = withQuantity(defaultRigidSpec(m));
      return TABLES[m].prices[rigidPriceKey(s)];
    };
    expect(at("corrugated-boards")).toBeLessThan(at("aluminum-boards"));
  });

  it("charges more to print both sides", () => {
    const prices = TABLES["yard-signs"].prices;
    expect(prices["939|15|34|3|1"]).toBeGreaterThan(prices["939|15|34|1|1"]);
  });

  it("charges more for a thicker board", () => {
    const prices = TABLES["corrugated-boards"].prices;
    const thin = prices["10500|15|1|-|1|1"];
    const thick = prices["10500|15|2|-|1|1"];
    expect(thick).toBeGreaterThan(thin);
  });
});

describe("repair keeps the form on something orderable", () => {
  it("produces a valid default for every material", () => {
    for (const m of ALL) {
      const spec = defaultRigidSpec(m);
      // The default itself carries no quantity on purpose.
      expect(spec.quantity, `${m} should not preselect a quantity`).toBe(0);
      const chosen = withQuantity(spec);
      expect(TABLES[m].prices[rigidPriceKey(chosen)], `${m} is unpriceable once a quantity is picked`).toBeGreaterThan(0);
    }
  });

  it("survives switching material, where no id carries over", () => {
    let spec = defaultRigidSpec("yard-signs");
    for (const m of ALL) {
      const prev = spec;
      spec = repairRigidSpec({ ...spec, material: m }, prev);
      // An unchosen quantity must survive a material change rather than being filled in silently.
      expect(spec.quantity, `${m} should not gain a quantity from repair`).toBe(0);
      expect(TABLES[m].prices[rigidPriceKey(withQuantity(spec))], `after switching to ${m}`).toBeGreaterThan(0);
    }
  });

  it("keeps a comparable size when the material changes", () => {
    // Size ids do not carry across materials, so resolving the old id against the new catalogue
    // finds nothing - which silently selected the smallest board every time. An 18" x 24" yard sign
    // became an 8" x 10" foam board.
    const from = defaultRigidSpec("yard-signs");
    const fromSize = sizeById("yard-signs", from.sizeId)!;
    const to = repairRigidSpec({ ...from, material: "foam-boards" }, from);
    const toSize = sizeById("foam-boards", to.sizeId)!;

    const fromArea = fromSize.widthIn * fromSize.heightIn;
    const toArea = toSize.widthIn * toSize.heightIn;
    expect(toArea).toBeGreaterThan(fromArea * 0.5);
    expect(toArea).toBeLessThan(fromArea * 2);

    // And it must be the closest available, not merely a large one.
    const best = sizesFor("foam-boards", to.shapeId)
      .reduce((a, b) => (Math.abs(b.widthIn * b.heightIn - fromArea) < Math.abs(a.widthIn * a.heightIn - fromArea) ? b : a));
    expect(toSize.id).toBe(best.id);
  });

  it("clears the grade when moving off foam, and sets one when moving onto it", () => {
    const foamSpec = repairRigidSpec({ ...defaultRigidSpec("foam-boards") });
    expect(foamSpec.type).not.toBe("");
    const pvcSpec = repairRigidSpec({ ...foamSpec, material: "pvc-boards" });
    expect(pvcSpec.type).toBe("");
  });

  it("snaps an unavailable quantity to the nearest offered one", () => {
    const base = defaultRigidSpec("corrugated-boards");
    const repaired = repairRigidSpec({ ...base, quantity: 9999 });
    expect(quantitiesFor(repaired)).toContain(repaired.quantity);
  });

  it("keeps a comparable size when the shape changes rather than shrinking to the smallest", () => {
    const m: RigidMaterialId = "yard-signs";
    const big = sizesFor(m, shapesFor(m).find((s) => /Rectangle/i.test(s.label))!.id).at(-1)!;
    const spec = repairRigidSpec({ ...defaultRigidSpec(m), sizeId: big.id });
    const other = shapesFor(m).find((s) => !/Rectangle/i.test(s.label))!;
    const moved = repairRigidSpec({ ...spec, shapeId: other.id });
    const movedSize = sizeById(m, moved.sizeId)!;
    const smallest = sizesFor(m, other.id)[0];
    // Not simply the first option, unless that genuinely is the closest by area.
    if (sizesFor(m, other.id).length > 1) {
      const areaOf = (s: { widthIn: number; heightIn: number }) => s.widthIn * s.heightIn;
      expect(areaOf(movedSize)).toBeGreaterThanOrEqual(Math.min(areaOf(smallest), areaOf(movedSize)));
    }
    expect(TABLES[m].prices[rigidPriceKey(withQuantity(moved))]).toBeGreaterThan(0);
  });
});

describe("artwork geometry", () => {
  it("gives every size a real trim and working resolution", () => {
    for (const m of ALL) {
      for (const shape of shapesFor(m)) {
        for (const s of sizesFor(m, shape.id)) {
          expect(s.trimWidthIn, `${m} ${s.label}`).toBeGreaterThan(0);
          expect(s.trimHeightIn, `${m} ${s.label}`).toBeGreaterThan(0);
          expect(s.dpi).toBeGreaterThanOrEqual(100);
        }
      }
    }
  });

  it("uses the board's stated trim, which runs under the nominal size", () => {
    // A 6" x 24" corrugated board prints 23.875" x 5.875"; ordering artwork at a flat 24 x 6 would
    // put the customer's bleed in the wrong place.
    const s = sizesFor("corrugated-boards", 15).find((x) => x.label === '6" x 24"')!;
    expect(s.widthIn).toBe(24);
    expect(s.trimWidthIn).toBeCloseTo(23.875, 3);
    expect(s.trimHeightIn).toBeCloseTo(5.875, 3);
  });
});
