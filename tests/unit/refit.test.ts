import { describe, it, expect } from "vitest";
import { refitSide } from "@/lib/business-card/refit";
import type { CardSide, CardElement } from "@/lib/business-card/schema";

/**
 * Templates are authored landscape at 3.5 x 2 plus bleed, but four sizes and two orientations are
 * sold. These lock the properties that make a refit trustworthy: the photograph is never distorted,
 * the type never leaves the safe area, and nothing silently keeps a point size chosen for a card
 * twice as wide.
 */

const bg = (w: number, h: number): CardElement => ({
  id: "bed", type: "image", src: "/x.jpg", naturalWidthPx: 1125, naturalHeightPx: 675,
  crop: null, borderWidthPx: 0, borderColor: "#000", cornerRadiusIn: 0,
  x: 0, y: 0, width: w, height: h, rotation: 0, opacity: 1, locked: true, visible: true,
} as CardElement);

const txt = (x: number, y: number, w: number, pt: number): CardElement => ({
  id: "t" + x, type: "text", text: "Your Name", fontFamily: "Inter", fontSizePt: pt,
  fontWeight: "700", italic: false, underline: false, textTransform: "none", align: "left",
  lineHeight: 1.2, letterSpacing: 0, color: "#111", backgroundColor: null,
  x, y, width: w, height: 0.2, rotation: 0, opacity: 1, locked: false, visible: true,
} as CardElement);

const side = (): CardSide => ({
  physicalWidthIn: 3.75, physicalHeightIn: 2.25, bleedIn: 0.125, safeZoneInsetIn: 0.125,
  shapeMask: "rectangle",
  background: { type: "solid", color: "#fff", gradient: null },
  elements: [bg(3.75, 2.25), txt(2.35, 0.6, 1.1, 15)],
} as CardSide);

/** Every size the shop sells, plus bleed, in both orientations. */
const TARGETS = [
  { widthIn: 3.6, heightIn: 2.1 }, { widthIn: 2.1, heightIn: 3.6 },
  { widthIn: 3.1, heightIn: 2.1 }, { widthIn: 2.1, heightIn: 3.1 },
  { widthIn: 3.1, heightIn: 1.85 }, { widthIn: 1.85, heightIn: 3.1 },
  { widthIn: 3.6, heightIn: 1.85 }, { widthIn: 1.85, heightIn: 3.6 },
];

describe("refitSide", () => {
  it("adopts the target geometry", () => {
    const r = refitSide(side(), { widthIn: 2.1, heightIn: 3.6 });
    expect(r.physicalWidthIn).toBe(2.1);
    expect(r.physicalHeightIn).toBe(3.6);
  });

  it("covers with the background instead of stretching it", () => {
    // A landscape bed on a portrait card: squashing the photograph is the one unacceptable outcome.
    const r = refitSide(side(), { widthIn: 2.1, heightIn: 3.6 });
    const el = r.elements[0];
    const originalRatio = 3.75 / 2.25;
    expect(el.width / el.height).toBeCloseTo(originalRatio, 5);
    // And it must still fill the card on both axes.
    expect(el.width).toBeGreaterThanOrEqual(2.1 - 1e-6);
    expect(el.height).toBeGreaterThanOrEqual(3.6 - 1e-6);
  });

  it("centres the background overflow", () => {
    const r = refitSide(side(), { widthIn: 2.1, heightIn: 3.6 });
    const el = r.elements[0];
    expect(el.x + el.width / 2).toBeCloseTo(2.1 / 2, 5);
    expect(el.y + el.height / 2).toBeCloseTo(3.6 / 2, 5);
  });

  it("keeps text inside the safe area at every size sold", () => {
    for (const t of TARGETS) {
      const r = refitSide(side(), t);
      const inset = r.bleedIn + r.safeZoneInsetIn;
      for (const el of r.elements.slice(1)) {
        expect(el.x, `x on ${t.widthIn}x${t.heightIn}`).toBeGreaterThanOrEqual(inset - 1e-6);
        expect(el.y, `y on ${t.widthIn}x${t.heightIn}`).toBeGreaterThanOrEqual(inset - 1e-6);
        expect(el.x + el.width, `right on ${t.widthIn}x${t.heightIn}`)
          .toBeLessThanOrEqual(t.widthIn - inset + 1e-6);
        expect(el.y + el.height, `bottom on ${t.widthIn}x${t.heightIn}`)
          .toBeLessThanOrEqual(t.heightIn - inset + 1e-6);
      }
    }
  });

  it("shrinks type when the card shrinks, and never below a legible floor", () => {
    for (const t of TARGETS) {
      const r = refitSide(side(), t);
      const el = r.elements[1] as Extract<CardElement, { type: "text" }>;
      expect(el.fontSizePt).toBeGreaterThanOrEqual(4);
      // Every target is smaller than the 3.75 x 2.25 source on at least one axis.
      expect(el.fontSizePt).toBeLessThanOrEqual(15 + 1e-6);
    }
  });

  it("scales type by the tighter axis, not by width alone", () => {
    // 3.6 wide but only 1.85 tall: scaling on width (0.96) would leave type too big for the height
    // ratio (0.82), which is how text ends up overflowing a short card.
    const r = refitSide(side(), { widthIn: 3.6, heightIn: 1.85 });
    const el = r.elements[1] as Extract<CardElement, { type: "text" }>;
    expect(el.fontSizePt).toBeCloseTo(15 * (1.85 / 2.25), 4);
  });

  it("is identity for the geometry it was authored at", () => {
    const r = refitSide(side(), { widthIn: 3.75, heightIn: 2.25 });
    expect(r.elements[1].x).toBeCloseTo(2.35, 6);
    expect((r.elements[1] as Extract<CardElement, { type: "text" }>).fontSizePt).toBeCloseTo(15, 6);
  });

  it("leaves a degenerate target alone rather than producing NaN geometry", () => {
    const s = side();
    expect(refitSide(s, { widthIn: 0, heightIn: 2 })).toEqual(s);
  });
});
