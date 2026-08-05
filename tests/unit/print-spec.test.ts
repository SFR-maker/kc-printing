import { describe, it, expect } from "vitest";
import { assessDpi, docSize, isVertical, orientSpec, parseTrimSize, printSpec } from "@/lib/print/spec";
import { businessCardDocSpec } from "@/lib/business-card/print-spec";

describe("document size", () => {
  it("adds bleed to every edge", () => {
    const s = printSpec("business-cards", 3.5, 2);
    expect(docSize(s)).toEqual({ widthIn: 3.6, heightIn: 2.1 });
  });

  it("reproduces the rounded-corner card document via the bleed override", () => {
    // A die has more positional play than a guillotine, so the rounded card needs a wider margin.
    const s = printSpec("business-cards", 3.5, 2, 0.1625);
    expect(docSize(s)).toEqual({ widthIn: 3.825, heightIn: 2.325 });
  });

  it("agrees with the existing business-card spec, so nothing shifts under the card flow", () => {
    for (const rounded of [false, true]) {
      const legacy = businessCardDocSpec(rounded);
      const shared = printSpec("business-cards", 3.5, 2, rounded ? 0.1625 : 0.05);
      expect(docSize(shared)).toEqual({ widthIn: legacy.docWidthIn, heightIn: legacy.docHeightIn });
      expect(shared.safeZoneInsetIn).toBe(legacy.safeZoneInsetIn);
    }
  });

  it("gives a banner its own bleed and a far larger document", () => {
    const s = printSpec("banners", 96, 48);
    expect(s.bleedIn).toBe(0.125);
    expect(docSize(s)).toEqual({ widthIn: 96.25, heightIn: 48.25 });
  });
});

describe("resolution floors differ by product", () => {
  it("asks 300 DPI of a business card", () => {
    expect(printSpec("business-cards", 3.5, 2).recommendedDpi).toBe(300);
  });

  it("asks only 150 DPI of a banner", () => {
    // A 4x8ft banner at 300 DPI is a 14,400 x 28,800 pixel file. Nobody produces that, and the
    // printer does not ask for it - a shared 300 floor would reject perfectly good artwork.
    expect(printSpec("banners", 96, 48).recommendedDpi).toBe(150);
  });

  it("judges a banner file acceptable that a card would reject", () => {
    const banner = printSpec("banners", 96, 48);
    const card = printSpec("business-cards", 3.5, 2);
    // 160 DPI across the placed size.
    expect(assessDpi(banner, 1600, 10).level).toBe("ok");
    expect(assessDpi(card, 1600, 10).level).toBe("reject");
  });

  it("rejects below the floor and warns between floor and recommended", () => {
    const card = printSpec("business-cards", 3.5, 2);
    expect(assessDpi(card, 350, 3.5).level).toBe("reject"); // 100 dpi
    expect(assessDpi(card, 875, 3.5).level).toBe("low");    // 250 dpi
    expect(assessDpi(card, 1200, 3.5).level).toBe("ok");    // 342 dpi
  });
});

describe("parseTrimSize", () => {
  it("reads feet, as banners are listed", () => {
    expect(parseTrimSize("4 ft x 8 ft")).toEqual({ widthIn: 48, heightIn: 96 });
    expect(parseTrimSize("2.5 ft x 6 ft")).toEqual({ widthIn: 30, heightIn: 72 });
  });

  it("reads inches, as cards, postcards and boards are listed", () => {
    expect(parseTrimSize('2" x 3.5" Horizontal U.S. Standard')).toEqual({ widthIn: 2, heightIn: 3.5 });
    expect(parseTrimSize('18" x 24"')).toEqual({ widthIn: 18, heightIn: 24 });
  });

  it("returns null on anything it cannot read, rather than inventing a size", () => {
    // A silent fallback would turn an unparsed label into a 1x1in document and a nonsense proof.
    expect(parseTrimSize("Custom")).toBeNull();
    expect(parseTrimSize("")).toBeNull();
  });
});

describe("orientation", () => {
  it("detects vertical from the label", () => {
    expect(isVertical("2 ft x 4 ft Vertical")).toBe(true);
    expect(isVertical("2 ft x 4 ft")).toBe(false);
  });

  it("puts the long edge down the page when vertical", () => {
    const s = printSpec("banners", 48, 24);
    expect(orientSpec(s, true)).toMatchObject({ trimWidthIn: 24, trimHeightIn: 48 });
    expect(orientSpec(s, false)).toMatchObject({ trimWidthIn: 48, trimHeightIn: 24 });
  });

  it("is stable when applied twice", () => {
    const s = printSpec("banners", 48, 24);
    expect(orientSpec(orientSpec(s, true), true)).toEqual(orientSpec(s, true));
  });
});

describe("the inspector is now product-aware", () => {
  it("holds a banner to 150 DPI and a card to 300", async () => {
    // The whole point of moving resolution into the spec: the same file is fine on one product and
    // rejected on another, and previously both went through a hardcoded 300 floor.
    const { inspectArtwork } = await import("@/lib/business-card/inspect-artwork");
    const sharp = (await import("sharp")).default;

    // 1200x600px. On a 3.6x2.1in card doc that is ~285 DPI; on a 4x2ft banner it is ~25 DPI.
    const png = await sharp({
      create: { width: 1200, height: 600, channels: 3, background: { r: 200, g: 200, b: 200 } },
    }).png().toBuffer();

    // 1200x600 is ~285 DPI on a 3.6x2.1in card document, and ~24 DPI spread over a 4x2ft banner.
    const card = await inspectArtwork(png, "art.png", printSpec("business-cards", 3.5, 2));
    expect(card.effectiveDpi).toBeGreaterThan(200);
    expect(card.warnings.some((w) => w.level === "block")).toBe(false);

    const banner = await inspectArtwork(png, "art.png", printSpec("banners", 48, 24));
    expect(banner.effectiveDpi).toBeLessThan(100);
    expect(banner.warnings.some((w) => w.code === "dpi-too-low" && w.level === "block")).toBe(true);
  });

  it("measures against the product's own document size", async () => {
    const { inspectArtwork } = await import("@/lib/business-card/inspect-artwork");
    const sharp = (await import("sharp")).default;
    const png = await sharp({
      create: { width: 900, height: 600, channels: 3, background: { r: 1, g: 1, b: 1 } },
    }).png().toBuffer();

    const banner = await inspectArtwork(png, "b.png", printSpec("banners", 48, 24));
    // 48x24in trim plus 0.125in bleed each edge.
    expect(banner.requiredWidthIn).toBe(48.25);
    expect(banner.requiredHeightIn).toBe(24.25);
  });
});
