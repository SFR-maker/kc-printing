import { describe, it, expect } from "vitest";
import { rebleedSide } from "@/lib/business-card/rebleed";
import type { CardSide, ShapeElement, TextElement } from "@/lib/business-card/schema";

function shape(partial: Pick<ShapeElement, "x" | "y" | "width" | "height">): ShapeElement {
  return {
    id: "s", type: "shape", rotation: 0, zIndex: 0, opacity: 1, locked: false, visible: true,
    shape: "rect", fill: "#000000", stroke: null, strokeWidthPx: 0, cornerRadiusIn: 0, gradient: null,
    ...partial,
  };
}

function text(partial: Pick<TextElement, "x" | "y" | "width" | "height">): TextElement {
  return {
    id: "t", type: "text", rotation: 0, zIndex: 1, opacity: 1, locked: false, visible: true,
    text: "hello", fontFamily: "Inter", fontSizePt: 8, fontWeight: "400", italic: false, underline: false,
    textTransform: "none", align: "left", lineHeight: 1.15, letterSpacing: 0, color: "#111111", backgroundColor: null,
    ...partial,
  };
}

/** A business card as authored historically: 3.5 x 2 trim with a 0.125in bleed. */
function oldSide(elements: CardSide["elements"]): CardSide {
  return {
    physicalWidthIn: 3.75,
    physicalHeightIn: 2.25,
    bleedIn: 0.125,
    safeZoneInsetIn: 0.125,
    shapeMask: "rectangle",
    background: { type: "solid", color: "#FFFFFF", gradient: null },
    elements,
  };
}

describe("rebleedSide", () => {
  it("resizes the document to the new bleed while keeping the trim size", () => {
    const out = rebleedSide(oldSide([]), 0.05);
    expect(out.physicalWidthIn).toBeCloseTo(3.6, 5);
    expect(out.physicalHeightIn).toBeCloseTo(2.1, 5);
    expect(out.bleedIn).toBe(0.05);
    // Trim is unchanged: 3.6 - 0.05*2 === 3.5
    expect(out.physicalWidthIn - out.bleedIn * 2).toBeCloseTo(3.5, 5);
    expect(out.physicalHeightIn - out.bleedIn * 2).toBeCloseTo(2, 5);
  });

  it("keeps interior elements in the same place relative to the trim edge", () => {
    // 0.32 from the bleed corner under a 0.125 bleed sits 0.195 inside the trim edge.
    const out = rebleedSide(oldSide([text({ x: 0.32, y: 0.5, width: 3.1, height: 0.32 })]), 0.05);
    const el = out.elements[0];
    expect(el.x).toBeCloseTo(0.245, 5);
    expect(el.y).toBeCloseTo(0.425, 5);
    // Distance inside the trim edge is preserved.
    expect(el.x - out.bleedIn).toBeCloseTo(0.195, 5);
    // Interior elements keep their size.
    expect(el.width).toBeCloseTo(3.1, 5);
    expect(el.height).toBeCloseTo(0.32, 5);
  });

  it("re-fits a full-bleed element to the new document box instead of overhanging it", () => {
    const out = rebleedSide(oldSide([shape({ x: 0, y: 0, width: 3.75, height: 2.25 })]), 0.05);
    const el = out.elements[0];
    expect(el.x).toBe(0);
    expect(el.y).toBe(0);
    expect(el.width).toBeCloseTo(3.6, 5);
    expect(el.height).toBeCloseTo(2.1, 5);
  });

  it("clamps an element that bleeds off one edge only", () => {
    // A left-hand colour rail: bleeds off the left, ends 1.025in inside the trim edge.
    const out = rebleedSide(oldSide([shape({ x: 0, y: 0, width: 1.15, height: 2.25 })]), 0.05);
    const el = out.elements[0];
    expect(el.x).toBe(0);
    // Right edge stays where it was relative to trim: 1.15 - 0.125 = 1.025 inside trim,
    // which under the new bleed is 0.05 + 1.025 = 1.075 from the document edge.
    expect(el.width).toBeCloseTo(1.075, 5);
    expect(el.height).toBeCloseTo(2.1, 5);
  });

  it("is a no-op when the bleed already matches", () => {
    const side = oldSide([text({ x: 0.32, y: 0.5, width: 3.1, height: 0.32 })]);
    expect(rebleedSide(side, 0.125)).toBe(side);
  });

  it("round-trips back to the original geometry", () => {
    const original = oldSide([
      text({ x: 0.32, y: 0.5, width: 3.1, height: 0.32 }),
      shape({ x: 0, y: 1.7, width: 3.75, height: 0.55 }),
    ]);
    const roundTripped = rebleedSide(rebleedSide(original, 0.05), 0.125);
    expect(roundTripped.physicalWidthIn).toBeCloseTo(3.75, 5);
    expect(roundTripped.elements[0].x).toBeCloseTo(0.32, 5);
    expect(roundTripped.elements[0].y).toBeCloseTo(0.5, 5);
    // The full-bleed panel comes back spanning the full width.
    expect(roundTripped.elements[1].x).toBe(0);
    expect(roundTripped.elements[1].width).toBeCloseTo(3.75, 5);
  });
});

describe("rebleedSide element-type rules", () => {
  it("never resizes a text box that happens to end on the document edge", () => {
    // A real template had a contact line at y=2.15 h=0.1 in a 2.25in-tall document, i.e. its box
    // ended exactly on the edge. Treating that as a bleeding background squashed it to 0.025in tall
    // and clipped the line.
    const out = rebleedSide(oldSide([text({ x: 0.32, y: 2.15, width: 3.1, height: 0.1 })]), 0.05);
    const el = out.elements[0];
    expect(el.height).toBeCloseTo(0.1, 5);
    expect(el.width).toBeCloseTo(3.1, 5);
    expect(el.y).toBeCloseTo(2.075, 5);
  });

  it("still anchors a background shape that ends on the document edge", () => {
    const out = rebleedSide(oldSide([shape({ x: 0, y: 1.7, width: 3.75, height: 0.55 })]), 0.05);
    const el = out.elements[0];
    expect(el.x).toBe(0);
    expect(el.width).toBeCloseTo(3.6, 5);
    expect(el.y).toBeCloseTo(1.625, 5);
    expect(el.height).toBeCloseTo(0.475, 5);
  });
});
