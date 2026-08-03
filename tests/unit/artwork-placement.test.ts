import { describe, it, expect } from "vitest";
import {
  centred, coverScale, fitPlacement, hasUncoveredEdge, originalPlacement,
  placedDpi, placedSize, snapPlacement, type ArtworkPlacement,
} from "@/lib/business-card/placement";
import type { ArtworkInspection } from "@/lib/business-card/inspect-artwork";

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
    expect(p.scale).toBeCloseTo(1, 5);
    expect(p.offsetXIn).toBeCloseTo(0, 5);
    expect(p.offsetYIn).toBeCloseTo(0, 5);
    expect(hasUncoveredEdge(exact, p)).toBe(false);
  });

  it("scales a no-bleed file up to cover, losing a sliver off the sides", () => {
    const p = fitPlacement(noBleed);
    expect(p.scale).toBeCloseTo(1.05, 4);
    expect(hasUncoveredEdge(noBleed, p)).toBe(false);
    // 3.5 * 1.05 = 3.675 across a 3.6 document, so it hangs 0.0375in off each side.
    expect(p.offsetXIn).toBeCloseTo(-0.0375, 4);
  });

  it("reports an uncovered edge when the artwork is smaller than the sheet", () => {
    const p = originalPlacement(noBleed);
    expect(p.scale).toBe(1);
    expect(hasUncoveredEdge(noBleed, p)).toBe(true);
  });

  it("swaps width and height on a quarter turn", () => {
    const size = placedSize(exact, { scale: 1, offsetXIn: 0, offsetYIn: 0, rotation: 90 });
    expect(size.widthIn).toBeCloseTo(2.1, 5);
    expect(size.heightIn).toBeCloseTo(3.6, 5);
  });

  it("needs a much bigger scale to cover once turned on its side", () => {
    // A landscape card rotated upright must grow until its short edge spans the long one.
    expect(coverScale(exact, 90)).toBeCloseTo(3.6 / 2.1, 4);
  });

  it("centres without changing scale or rotation", () => {
    const start: ArtworkPlacement = { scale: 0.5, offsetXIn: 9, offsetYIn: -4, rotation: 180 };
    const p = centred(exact, start);
    expect(p.scale).toBe(0.5);
    expect(p.rotation).toBe(180);
    const size = placedSize(exact, p);
    expect(p.offsetXIn + size.widthIn / 2).toBeCloseTo(3.6 / 2, 4);
    expect(p.offsetYIn + size.heightIn / 2).toBeCloseTo(2.1 / 2, 4);
  });
});

describe("snapping", () => {
  it("pulls a near-miss onto the document edge so no white sliver prints", () => {
    const p = snapPlacement(exact, { scale: 1, offsetXIn: 0.012, offsetYIn: -0.009, rotation: 0 });
    expect(p.offsetXIn).toBe(0);
    expect(p.offsetYIn).toBe(0);
  });

  it("snaps the trailing edge as well as the leading one", () => {
    // Artwork half the sheet wide, dragged so its right edge is just shy of the document edge.
    const p = snapPlacement(exact, { scale: 0.5, offsetXIn: 1.79, offsetYIn: 0.5, rotation: 0 });
    const size = placedSize(exact, p);
    expect(p.offsetXIn + size.widthIn).toBeCloseTo(3.6, 4);
  });

  it("leaves a placement alone when nothing is within reach", () => {
    const p = snapPlacement(exact, { scale: 0.5, offsetXIn: 0.9, offsetYIn: 0.7, rotation: 0 });
    expect(p.offsetXIn).toBeCloseTo(0.9, 4);
    expect(p.offsetYIn).toBeCloseTo(0.7, 4);
  });

  it("snaps to the trim line, not only the document edge", () => {
    // 0.05 is the square-corner bleed, so the trim line sits there.
    const p = snapPlacement(exact, { scale: 0.5, offsetXIn: 0.06, offsetYIn: 0.5, rotation: 0 });
    expect(p.offsetXIn).toBeCloseTo(0.05, 4);
  });
});

describe("resolution follows the placement", () => {
  it("drops as the artwork is scaled up", () => {
    expect(placedDpi(exact, { scale: 1, offsetXIn: 0, offsetYIn: 0, rotation: 0 })).toBe(300);
    expect(placedDpi(exact, { scale: 2, offsetXIn: 0, offsetYIn: 0, rotation: 0 })).toBe(150);
  });

  it("rises as it is scaled down", () => {
    expect(placedDpi(exact, { scale: 0.5, offsetXIn: 0, offsetYIn: 0, rotation: 0 })).toBe(600);
  });

  it("is null for vector artwork, which has no pixel ceiling", () => {
    const pdf = { ...exact, kind: "pdf" as const, pixelWidth: null, pixelHeight: null };
    expect(placedDpi(pdf, { scale: 4, offsetXIn: 0, offsetYIn: 0, rotation: 0 })).toBeNull();
  });
});
