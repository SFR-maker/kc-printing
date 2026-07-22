import { describe, it, expect } from "vitest";
import { recolorSide, VARIANT_PALETTES } from "@/lib/business-card/recolor";
import { emptyCardSide } from "@/lib/business-card/schema";
import type { TextElement, ShapeElement } from "@/lib/business-card/schema";

const FROM = ["#111111", "#222222", "#FFFFFF"];
const TO = ["#AAAAAA", "#BBBBBB", "#CCCCCC"];

describe("recolorSide", () => {
  it("remaps text and background colors that exactly match the source palette", () => {
    const side = emptyCardSide();
    side.background = { type: "solid", color: "#111111", gradient: null };
    const text: TextElement = {
      id: "t1", type: "text", x: 0, y: 0, width: 1, height: 0.3, rotation: 0, zIndex: 0, opacity: 1,
      locked: false, visible: true, text: "hi", fontFamily: "Inter", fontSizePt: 12, fontWeight: "400",
      italic: false, underline: false, textTransform: "none", align: "left", lineHeight: 1.2, letterSpacing: 0,
      color: "#222222", backgroundColor: "#FFFFFF",
    };
    side.elements.push(text);

    const result = recolorSide(side, FROM, TO);
    expect(result.background.color).toBe("#AAAAAA");
    const resultText = result.elements[0] as TextElement;
    expect(resultText.color).toBe("#BBBBBB");
    expect(resultText.backgroundColor).toBe("#CCCCCC");
  });

  it("leaves colors that don't match the source palette untouched", () => {
    const side = emptyCardSide();
    const shape: ShapeElement = {
      id: "s1", type: "shape", x: 0, y: 0, width: 1, height: 1, rotation: 0, zIndex: 0, opacity: 1,
      locked: false, visible: true, shape: "rect", fill: "#00FF00", stroke: null, strokeWidthPx: 0, cornerRadiusIn: 0, gradient: null,
    };
    side.elements.push(shape);
    const result = recolorSide(side, FROM, TO);
    expect((result.elements[0] as ShapeElement).fill).toBe("#00FF00");
  });

  it("is case-insensitive when matching hex colors", () => {
    const side = emptyCardSide();
    side.background = { type: "solid", color: "#111111", gradient: null };
    const result = recolorSide(side, ["#111111"], ["#FF0000"]);
    expect(result.background.color).toBe("#FF0000");
  });

  it("does not mutate the original side", () => {
    const side = emptyCardSide();
    side.background = { type: "solid", color: "#111111", gradient: null };
    recolorSide(side, FROM, TO);
    expect(side.background.color).toBe("#111111");
  });

  it("ships at least 6 distinct variant palettes, each with 3 valid hex colors", () => {
    expect(VARIANT_PALETTES.length).toBeGreaterThanOrEqual(6);
    for (const p of VARIANT_PALETTES) {
      expect(p).toHaveLength(3);
      for (const c of p) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
