import { describe, it, expect } from "vitest";
import {
  baseSize, centred, coverScale, fitPlacement, hasUncoveredEdge, originalPlacement,
  guideLines, placedDpi, placedSize, placementFromBox, snapPlacement, type ArtworkPlacement,
} from "@/lib/business-card/placement";
import type { ArtworkInspection } from "@/lib/business-card/inspect-artwork";
import { printSpec } from "@/lib/print/spec";

/** Square-corner business card: the geometry these placements were written against. */
const CARD_SPEC = printSpec("business-cards", 3.5, 2);

/** A 3.6 x 2.1 raster at 300 DPI, already the right size for a square-corner card. */
const exact: ArtworkInspection = {
  kind: "raster", widthIn: 3.6, heightIn: 2.1, pixelWidth: 1080, pixelHeight: 630,
  effectiveDpi: 300, declaredDpi: null, requiredWidthIn: 3.6, requiredHeightIn: 2.1,
  matchesRequiredSize: true, fit: { scale: 1, offsetXIn: 0, offsetYIn: 0, cropsContent: false },
  warnings: [],
};

/** Supplied at trim size with no bleed - the common mistake. */
const noBleed: ArtworkInspection = { ...exact, widthIn: 3.5, heightIn: 2, matchesRequiredSize: false };

describe("placement geometry", () => {
  it("fills the sheet exactly when the file is already the right size", () => {
    const p = fitPlacement(exact);
    expect(p.scaleX).toBeCloseTo(1, 5);
    expect(p.scaleY).toBeCloseTo(1, 5);
    expect(p.offsetXIn).toBeCloseTo(0, 5);
    expect(p.offsetYIn).toBeCloseTo(0, 5);
    expect(hasUncoveredEdge(exact, p)).toBe(false);
  });

  it("scales a no-bleed file up to cover, losing a sliver off the sides", () => {
    const p = fitPlacement(noBleed);
    expect(p.scaleX).toBeCloseTo(1.05, 4);
    expect(p.scaleY).toBeCloseTo(1.05, 4);
    expect(hasUncoveredEdge(noBleed, p)).toBe(false);
    // 3.5 * 1.05 = 3.675 across a 3.6 document, so it hangs 0.0375in off each side.
    expect(p.offsetXIn).toBeCloseTo(-0.0375, 4);
  });

  it("reports an uncovered edge when the artwork is smaller than the sheet", () => {
    const p = originalPlacement(noBleed);
    expect(p.scaleX).toBe(1);
    expect(p.scaleY).toBe(1);
    expect(hasUncoveredEdge(noBleed, p)).toBe(true);
  });

  it("stretches each axis independently, which is what non-proportional resizing needs", () => {
    const size = placedSize(exact, { scaleX: 2, scaleY: 0.5, offsetXIn: 0, offsetYIn: 0, rotation: 0 });
    expect(size.widthIn).toBeCloseTo(7.2, 5);
    expect(size.heightIn).toBeCloseTo(1.05, 5);
  });

  it("maps a dragged box back onto scales that reproduce it", () => {
    const box = { x: 0.2, y: -0.3, width: 5, height: 1.4 };
    const p = placementFromBox(exact, 0, box);
    const size = placedSize(exact, p);
    expect(size.widthIn).toBeCloseTo(box.width, 3);
    expect(size.heightIn).toBeCloseTo(box.height, 3);
    expect(p.offsetXIn).toBeCloseTo(box.x, 4);
    expect(p.offsetYIn).toBeCloseTo(box.y, 4);
  });

  it("measures a dragged box against the turned dimensions when rotated", () => {
    // scaleX must stay the on-screen width even though the artwork's own long edge is now vertical.
    const p = placementFromBox(exact, 90, { x: 0, y: 0, width: 2.1, height: 3.6 });
    expect(p.scaleX).toBeCloseTo(1, 4);
    expect(p.scaleY).toBeCloseTo(1, 4);
    expect(baseSize(exact, 90)).toEqual({ widthIn: 2.1, heightIn: 3.6 });
  });

  it("swaps width and height on a quarter turn", () => {
    const size = placedSize(exact, { scaleX: 1, scaleY: 1, offsetXIn: 0, offsetYIn: 0, rotation: 90 });
    expect(size.widthIn).toBeCloseTo(2.1, 5);
    expect(size.heightIn).toBeCloseTo(3.6, 5);
  });

  it("needs a much bigger scale to cover once turned on its side", () => {
    // A landscape card rotated upright must grow until its short edge spans the long one.
    expect(coverScale(exact, 90)).toBeCloseTo(3.6 / 2.1, 4);
  });

  it("centres without changing scale or rotation", () => {
    const start: ArtworkPlacement = { scaleX: 0.5, scaleY: 0.5, offsetXIn: 9, offsetYIn: -4, rotation: 180 };
    const p = centred(exact, start);
    expect(p.scaleX).toBe(0.5);
    expect(p.scaleY).toBe(0.5);
    expect(p.rotation).toBe(180);
    const size = placedSize(exact, p);
    expect(p.offsetXIn + size.widthIn / 2).toBeCloseTo(3.6 / 2, 4);
    expect(p.offsetYIn + size.heightIn / 2).toBeCloseTo(2.1 / 2, 4);
  });
});

describe("snapping", () => {
  it("pulls a near-miss onto the document edge so no white sliver prints", () => {
    const p = snapPlacement(exact, { scaleX: 1, scaleY: 1, offsetXIn: 0.012, offsetYIn: -0.009, rotation: 0 }, CARD_SPEC);
    expect(p.offsetXIn).toBe(0);
    expect(p.offsetYIn).toBe(0);
  });

  it("snaps the trailing edge as well as the leading one", () => {
    // Artwork half the sheet wide, dragged so its right edge is just shy of the document edge.
    const p = snapPlacement(exact, { scaleX: 0.5, scaleY: 0.5, offsetXIn: 1.79, offsetYIn: 0.5, rotation: 0 }, CARD_SPEC);
    const size = placedSize(exact, p);
    expect(p.offsetXIn + size.widthIn).toBeCloseTo(3.6, 4);
  });

  it("leaves a placement alone when nothing is within reach", () => {
    const p = snapPlacement(exact, { scaleX: 0.5, scaleY: 0.5, offsetXIn: 0.9, offsetYIn: 0.7, rotation: 0 }, CARD_SPEC);
    expect(p.offsetXIn).toBeCloseTo(0.9, 4);
    expect(p.offsetYIn).toBeCloseTo(0.7, 4);
  });

  it("snaps to the trim line, not only the document edge", () => {
    // 0.05 is the square-corner bleed, so the trim line sits there.
    const p = snapPlacement(exact, { scaleX: 0.5, scaleY: 0.5, offsetXIn: 0.06, offsetYIn: 0.5, rotation: 0 }, CARD_SPEC);
    expect(p.offsetXIn).toBeCloseTo(0.05, 4);
  });
});

describe("resolution follows the placement", () => {
  it("drops as the artwork is scaled up", () => {
    expect(placedDpi(exact, { scaleX: 1, scaleY: 1, offsetXIn: 0, offsetYIn: 0, rotation: 0 })).toBe(300);
    expect(placedDpi(exact, { scaleX: 2, scaleY: 2, offsetXIn: 0, offsetYIn: 0, rotation: 0 })).toBe(150);
  });

  it("rises as it is scaled down", () => {
    expect(placedDpi(exact, { scaleX: 0.5, scaleY: 0.5, offsetXIn: 0, offsetYIn: 0, rotation: 0 })).toBe(600);
  });

  it("takes the softer axis when the artwork has been stretched unevenly", () => {
    // Stretched to double width, the horizontal pixels are spread thinnest and set the quality.
    expect(placedDpi(exact, { scaleX: 2, scaleY: 1, offsetXIn: 0, offsetYIn: 0, rotation: 0 })).toBe(150);
    expect(placedDpi(exact, { scaleX: 1, scaleY: 2, offsetXIn: 0, offsetYIn: 0, rotation: 0 })).toBe(150);
  });

  it("is null for vector artwork, which has no pixel ceiling", () => {
    const pdf = { ...exact, kind: "pdf" as const, pixelWidth: null, pixelHeight: null };
    expect(placedDpi(pdf, { scaleX: 4, scaleY: 4, offsetXIn: 0, offsetYIn: 0, rotation: 0 })).toBeNull();
  });
});

describe("guides come from the spec, not from a hardcoded card", () => {
  /**
   * guideLines used to compute bleed as (requiredWidthIn - 3.5) / 2, baking in the business card's
   * trim width. On a banner that produced guides in entirely the wrong place, with nothing to
   * signal it - the proof simply drew its trim line somewhere arbitrary and the customer approved
   * it. These pin the geometry to the spec instead.
   */
  const banner: ArtworkInspection = {
    ...exact,
    widthIn: 48.25, heightIn: 24.25,
    requiredWidthIn: 48.25, requiredHeightIn: 24.25,
    pixelWidth: 7238, pixelHeight: 3638,
  };
  const BANNER_SPEC = printSpec("banners", 48, 24);

  it("puts a card's trim line at its own 0.05in bleed", () => {
    const g = guideLines(exact, CARD_SPEC);
    expect(g.x).toContain(0.05);
    expect(g.x).toContain(3.6 - 0.05);
  });

  it("puts a banner's trim line at 0.125in, not at the card-derived figure", () => {
    const g = guideLines(banner, BANNER_SPEC);
    expect(g.x).toContain(0.125);
    // The old formula would have given (48.25 - 3.5) / 2 = 22.375 - most of the way across the banner.
    expect(g.x).not.toContain(22.375);
  });

  it("offsets the safe zone from the trim line by the product's own inset", () => {
    // Banners keep text well clear because grommets sit along the edges.
    expect(guideLines(banner, BANNER_SPEC).x).toContain(0.125 + 0.5);
    expect(guideLines(exact, CARD_SPEC).x).toContain(0.05 + 0.125);
  });
});
