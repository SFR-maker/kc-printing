import { describe, it, expect } from "vitest";
import {
  buildCustomBusinessCard, buildCustomPostcard, buildCustomBanner, type CustomDesignInfo,
} from "@/lib/business-card/templates/ai-custom";
import { validateSide } from "@/lib/business-card/validate";
import type { CardSide, CardElement } from "@/lib/business-card/schema";

/**
 * Geometry cover for the AI design builders.
 *
 * A generated card shipped with its QR tile hanging off the top-right corner and its website line
 * sitting on the cut edge. Neither was caught, for two separate reasons worth keeping in mind:
 *
 *   - the builders author on a 3.75 x 2.25 canvas that rebleedSide then shifts by 0.075in, so the
 *     literals in the source are not the coordinates that print;
 *   - validateSide checks text, QR and images against the safe zone but deliberately not shapes,
 *     because scrims and colour rails are *meant* to bleed. The QR's white backing tile is a shape,
 *     so the one element that most needed checking was the one exempt from the check.
 *
 * These tests therefore work on the built output, and check the QR tile explicitly.
 */

const INFO: CustomDesignInfo = {
  businessName: "611 Printing",
  tagline: "Print at cost, design done right",
  phone: "9136747047",
  email: "elqadii@gmail.com",
  website: "611printing.com",
  linkedin: "linkedin.com/company/611printing",
  address: "Kansas City, MO",
  palette: ["#123C69", "#C9A24B", "#111111"],
  headingFont: "Inter",
  bodyFont: "Inter",
  includeQrCode: true,
};

/** Same bounds the validator uses, so a failure here reads in the same terms as a design warning. */
function bounds(el: CardElement) {
  return { left: el.x, top: el.y, right: el.x + el.width, bottom: el.y + el.height };
}

/**
 * Everything a customer is meant to be able to read, which is everything except the deliberately
 * bleeding background layers: the full-bleed photograph and the scrim panels behind the type.
 */
function contentElements(side: CardSide): CardElement[] {
  return side.elements.filter((el) => {
    const b = bounds(el);
    const fullBleed = b.left <= 0 && b.top <= 0
      && b.right >= side.physicalWidthIn && b.bottom >= side.physicalHeightIn;
    if (el.type === "image" && el.locked && fullBleed) return false;
    // A scrim spans the full width and is anchored to an edge; it is background, not content.
    if (el.type === "shape" && b.left <= 0 && b.right >= side.physicalWidthIn) return false;
    return true;
  });
}

function expectInsideSafeZone(side: CardSide, label: string) {
  const inset = side.safeZoneInsetIn;
  for (const el of contentElements(side)) {
    const b = bounds(el);
    expect(b.left, `${label}: ${el.type} ${el.id} crosses the left safe edge`).toBeGreaterThanOrEqual(inset - 1e-6);
    expect(b.top, `${label}: ${el.type} ${el.id} crosses the top safe edge`).toBeGreaterThanOrEqual(inset - 1e-6);
    expect(b.right, `${label}: ${el.type} ${el.id} crosses the right safe edge`).toBeLessThanOrEqual(side.physicalWidthIn - inset + 1e-6);
    expect(b.bottom, `${label}: ${el.type} ${el.id} crosses the bottom safe edge`).toBeLessThanOrEqual(side.physicalHeightIn - inset + 1e-6);
  }
}

/** Nothing may extend past the trim, which is where the guillotine actually cuts. */
function expectInsideTrim(side: CardSide, label: string) {
  for (const el of contentElements(side)) {
    const b = bounds(el);
    expect(b.right, `${label}: ${el.type} ${el.id} is cut by the trim`).toBeLessThanOrEqual(side.physicalWidthIn - side.bleedIn + 1e-6);
    expect(b.bottom, `${label}: ${el.type} ${el.id} is cut by the trim`).toBeLessThanOrEqual(side.physicalHeightIn - side.bleedIn + 1e-6);
    expect(b.left, `${label}: ${el.type} ${el.id} is cut by the trim`).toBeGreaterThanOrEqual(side.bleedIn - 1e-6);
    expect(b.top, `${label}: ${el.type} ${el.id} is cut by the trim`).toBeGreaterThanOrEqual(side.bleedIn - 1e-6);
  }
}

const IMG = "/images/templates/generated.jpg";

/**
 * Warnings that mean the artwork is actually wrong, as opposed to warnings these layouts earn by
 * construction.
 *
 * `overlap` is excluded deliberately: every one of these designs layers type over a scrim and a QR
 * over its white backing tile, which is exactly what the overlap rule is meant to flag when a
 * *customer* does it by accident. Keeping it in the assertion would mean 68 expected failures and
 * a test nobody could read.
 *
 * `low-dpi` is excluded for the same kind of reason: it compares against a 300 DPI recommendation
 * written for a card held in the hand, and a banner is specified at 150 DPI on purpose (see
 * lib/print/spec.ts). A banner hitting exactly its own target is not a defect.
 */
const BLOCKING = new Set(["unsafe-zone", "clipped", "empty-text", "small-text", "qr-small", "qr-contrast", "qr-empty"]);

function realWarnings(side: CardSide, label: "front" | "back") {
  return validateSide(side, label).filter((w) => BLOCKING.has(w.code));
}

describe("AI business card", () => {
  const { front, back } = buildCustomBusinessCard(INFO, IMG, 1500, 900);

  it("keeps every element inside the safe zone", () => {
    expectInsideSafeZone(front, "front");
    expectInsideSafeZone(back, "back");
  });

  it("keeps every element inside the trim", () => {
    expectInsideTrim(front, "front");
    expectInsideTrim(back, "back");
  });

  it("puts a scannable QR on the back, with its white tile inside the safe zone", () => {
    // The regression that shipped: the tile is a shape, so no validator rule covered it, and the
    // code itself was 0.5in against the shop's own 0.8in floor for a reliable scan.
    expect(front.elements.some((e) => e.type === "qr"), "the front should stay free of the QR").toBe(false);

    const qr = back.elements.find((e) => e.type === "qr")!;
    expect(qr, "no QR was generated").toBeDefined();
    expect(qr.width, "the QR is below the shop's own scannable minimum").toBeGreaterThanOrEqual(0.8);

    const tile = back.elements.find(
      (e) => e.type === "shape" && e.fill === "#FFFFFF" && bounds(e).left < qr.x && bounds(e).right > qr.x + qr.width,
    );
    expect(tile, "the QR has no white backing tile").toBeDefined();

    const inset = back.safeZoneInsetIn;
    for (const el of [qr, tile!]) {
      const b = bounds(el);
      expect(b.right).toBeLessThanOrEqual(back.physicalWidthIn - inset + 1e-6);
      expect(b.top).toBeGreaterThanOrEqual(inset - 1e-6);
      expect(b.bottom).toBeLessThanOrEqual(back.physicalHeightIn - inset + 1e-6);
    }
  });

  it("keeps the back text clear of the QR tile", () => {
    const qr = back.elements.find((e) => e.type === "qr")!;
    const tileLeft = qr.x - qr.width * 0.12;
    for (const el of back.elements.filter((e) => e.type === "text")) {
      expect(bounds(el).right, `"${el.text}" runs under the QR`).toBeLessThanOrEqual(tileLeft + 1e-6);
    }
  });

  it("produces no print-blocking warnings", () => {
    expect(realWarnings(front, "front")).toEqual([]);
    expect(realWarnings(back, "back")).toEqual([]);
  });

  it("still generates cleanly with only the required fields", () => {
    // Optional fields empty is the common case, and an empty TextElement is a print-blocking error.
    const minimal: CustomDesignInfo = {
      ...INFO, tagline: "", email: "", website: "", linkedin: "", address: "",
    };
    const built = buildCustomBusinessCard(minimal, IMG, 1500, 900);
    expectInsideSafeZone(built.front, "front");
    expectInsideTrim(built.front, "front");
    expect(realWarnings(built.front, "front")).toEqual([]);
    expect(realWarnings(built.back, "back")).toEqual([]);
  });

  it("puts the contact details on the back as well as the front", () => {
    // The back used to be the business name alone on a flat colour.
    const backText = back.elements.filter((e) => e.type === "text").map((e) => e.text).join(" | ");
    expect(backText).toContain(INFO.businessName);
    expect(backText).toContain(INFO.phone);
  });

  it("dissolves the photograph into the type area rather than cutting it with one hard edge", () => {
    const scrims = front.elements.filter(
      (e) => e.type === "shape" && e.fill === "#000000" && e.x <= 0 && e.x + e.width >= front.physicalWidthIn,
    );
    expect(scrims.length).toBeGreaterThanOrEqual(3);
    // Opacity has to increase downward or the ramp reads backwards.
    const sorted = [...scrims].sort((a, b) => a.y - b.y);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].opacity).toBeGreaterThan(sorted[i - 1].opacity);
    }
  });
});

describe("AI postcard", () => {
  const { front, back } = buildCustomPostcard(INFO, IMG, 1800, 1200);

  it("keeps every element inside the safe zone and the trim", () => {
    expectInsideSafeZone(front, "front");
    expectInsideTrim(front, "front");
    expectInsideSafeZone(back, "back");
  });

  it("produces no print warnings", () => {
    expect(realWarnings(front, "front")).toEqual([]);
    expect(realWarnings(back, "back")).toEqual([]);
  });
});

/** 150 DPI at finished size, which is what the banner spec asks for. */
const BANNER_PX: Record<"rollup" | "vinyl", [number, number]> = {
  rollup: [33 * 150, 81 * 150],
  vinyl: [96 * 150, 48 * 150],
};

describe("AI banners", () => {
  for (const format of ["rollup", "vinyl"] as const) {
    it(`keeps every ${format} element inside the safe zone`, () => {
      const { front } = buildCustomBanner(INFO, IMG, ...BANNER_PX[format], format);
      expectInsideSafeZone(front, format);
      expectInsideTrim(front, format);
    });

    it(`produces no ${format} print warnings`, () => {
      const { front } = buildCustomBanner(INFO, IMG, ...BANNER_PX[format], format);
      expect(realWarnings(front, "front")).toEqual([]);
    });
  }
});
