import { describe, it, expect } from "vitest";
import { emptyCardSide } from "@/lib/business-card/schema";
import { renderSideToSvg } from "@/lib/business-card/render-svg";
import type { TextElement, ShapeElement, QrElement } from "@/lib/business-card/schema";

describe("renderSideToSvg", () => {
  it("sizes the SVG in pixels at the target DPI, with the viewBox in inches", () => {
    const side = emptyCardSide();
    const svg = renderSideToSvg(side, 300);
    expect(svg).toContain(`width="${Math.round(side.physicalWidthIn * 300)}"`);
    expect(svg).toContain(`height="${Math.round(side.physicalHeightIn * 300)}"`);
    expect(svg).toContain(`viewBox="0 0 ${side.physicalWidthIn} ${side.physicalHeightIn}"`);
  });

  it("renders text content and escapes unsafe characters", () => {
    const side = emptyCardSide();
    const el: TextElement = {
      id: "t1", type: "text", x: 0.3, y: 0.3, width: 2, height: 0.3, rotation: 0, zIndex: 0, opacity: 1,
      locked: false, visible: true, text: "Jane & <Doe>", fontFamily: "Inter", fontSizePt: 14, fontWeight: "400",
      italic: false, underline: false, textTransform: "none", align: "left", lineHeight: 1.2, letterSpacing: 0,
      color: "#111111", backgroundColor: null,
    };
    side.elements.push(el);
    const svg = renderSideToSvg(side);
    expect(svg).toContain("Jane &amp; &lt;Doe&gt;");
    expect(svg).not.toContain("Jane & <Doe>");
  });

  it("skips invisible elements", () => {
    const side = emptyCardSide();
    const el: ShapeElement = {
      id: "s1", type: "shape", x: 0, y: 0, width: 1, height: 1, rotation: 0, zIndex: 0, opacity: 1,
      locked: false, visible: false, shape: "rect", fill: "#FF0000", stroke: null, strokeWidthPx: 0, cornerRadiusIn: 0, gradient: null,
    };
    side.elements.push(el);
    const svg = renderSideToSvg(side);
    expect(svg).not.toContain("#FF0000");
  });

  it("renders a QR code as vector rects, not an <image>", () => {
    const side = emptyCardSide();
    const el: QrElement = {
      id: "q1", type: "qr", x: 0.3, y: 0.3, width: 0.8, height: 0.8, rotation: 0, zIndex: 0, opacity: 1,
      locked: false, visible: true, payloadType: "url", value: "https://kcprinting.com",
      foreground: "#000000", background: "#FFFFFF", errorCorrection: "M",
    };
    side.elements.push(el);
    const svg = renderSideToSvg(side);
    expect(svg).not.toContain("<image");
    expect((svg.match(/<rect/g) ?? []).length).toBeGreaterThan(10);
  });
});
