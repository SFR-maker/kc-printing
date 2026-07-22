import { describe, it, expect } from "vitest";
import { emptyCardSide } from "@/lib/business-card/schema";
import { validateSide, isOutsideSafeZone, isTextTooSmall, imageEffectiveDpi } from "@/lib/business-card/validate";
import type { TextElement, ImageElement, QrElement } from "@/lib/business-card/schema";

function textEl(overrides: Partial<TextElement> = {}): TextElement {
  return {
    id: "t1",
    type: "text",
    x: 0.2,
    y: 0.2,
    width: 2,
    height: 0.3,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text: "Jane Doe",
    fontFamily: "Inter",
    fontSizePt: 14,
    fontWeight: "400",
    italic: false,
    underline: false,
    textTransform: "none",
    align: "left",
    lineHeight: 1.2,
    letterSpacing: 0,
    color: "#111111",
    backgroundColor: null,
    ...overrides,
  };
}

describe("safe zone detection", () => {
  it("flags an element positioned in the bleed strip", () => {
    const side = emptyCardSide();
    expect(isOutsideSafeZone(textEl({ x: 0, y: 0 }), side)).toBe(true);
  });

  it("does not flag an element fully inside the safe zone", () => {
    const side = emptyCardSide();
    expect(isOutsideSafeZone(textEl({ x: 0.3, y: 0.3, width: 1, height: 0.3 }), side)).toBe(false);
  });
});

describe("text size validation", () => {
  it("flags text below the minimum print size", () => {
    expect(isTextTooSmall(4)).toBe(true);
    expect(isTextTooSmall(12)).toBe(false);
  });
});

describe("image DPI validation", () => {
  it("computes low effective DPI for an undersized source image", () => {
    expect(imageEffectiveDpi(150, 3)).toBe(50);
  });
});

describe("validateSide", () => {
  it("reports empty text as an error", () => {
    const side = emptyCardSide();
    side.elements.push(textEl({ text: "" }));
    const warnings = validateSide(side, "front");
    expect(warnings.some((w) => w.code === "empty-text" && w.severity === "error")).toBe(true);
  });

  it("reports low-DPI images as an error below 150 DPI", () => {
    const side = emptyCardSide();
    const img: ImageElement = {
      id: "i1",
      type: "image",
      x: 0.3,
      y: 0.3,
      width: 2,
      height: 1,
      rotation: 0,
      zIndex: 0,
      opacity: 1,
      locked: false,
      visible: true,
      src: "https://example.com/logo.png",
      naturalWidthPx: 200,
      naturalHeightPx: 100,
      crop: null,
      borderWidthPx: 0,
      borderColor: "#000000",
      cornerRadiusIn: 0,
    };
    side.elements.push(img);
    const warnings = validateSide(side, "front");
    expect(warnings.some((w) => w.code === "low-dpi" && w.severity === "error")).toBe(true);
  });

  it("reports a QR code with low contrast", () => {
    const side = emptyCardSide();
    const qr: QrElement = {
      id: "q1",
      type: "qr",
      x: 0.3,
      y: 0.3,
      width: 0.7,
      height: 0.7,
      rotation: 0,
      zIndex: 0,
      opacity: 1,
      locked: false,
      visible: true,
      payloadType: "url",
      value: "https://kcprinting.com",
      foreground: "#AAAAAA",
      background: "#BBBBBB",
      errorCorrection: "M",
    };
    side.elements.push(qr);
    const warnings = validateSide(side, "front");
    expect(warnings.some((w) => w.code === "qr-contrast" && w.severity === "error")).toBe(true);
  });

  it("returns no warnings for a clean, well-formed side", () => {
    const side = emptyCardSide();
    side.elements.push(textEl({ x: 0.3, y: 0.3, width: 1.5, height: 0.3, fontSizePt: 14 }));
    const warnings = validateSide(side, "front");
    expect(warnings.filter((w) => w.severity === "error")).toHaveLength(0);
  });
});
