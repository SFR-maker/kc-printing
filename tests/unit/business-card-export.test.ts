import { describe, it, expect } from "vitest";
import { emptyCardSide } from "@/lib/business-card/schema";
import { exportSidePng, exportCardPdf } from "@/lib/business-card/export";
import { BLEED_PX_HEIGHT, BLEED_PX_WIDTH } from "@/lib/business-card/print-spec";

describe("exportSidePng", () => {
  it("rasterizes a side to the exact full-bleed pixel dimensions at 300 DPI", async () => {
    const side = emptyCardSide();
    side.elements.push({
      id: "t1", type: "text", x: 0.3, y: 0.3, width: 2, height: 0.3, rotation: 0, zIndex: 0, opacity: 1,
      locked: false, visible: true, text: "Jane Doe", fontFamily: "Helvetica", fontSizePt: 14, fontWeight: "400",
      italic: false, underline: false, textTransform: "none", align: "left", lineHeight: 1.2, letterSpacing: 0,
      color: "#111111", backgroundColor: null,
    } as never);
    const result = await exportSidePng(side);
    expect(result.widthPx).toBe(BLEED_PX_WIDTH);
    expect(result.heightPx).toBe(BLEED_PX_HEIGHT);
    expect(result.dpi).toBe(300);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.buffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a"); // PNG magic bytes
  });
});

describe("exportCardPdf", () => {
  it("produces a two-page PDF at the exact bleed trim size in points", async () => {
    const front = emptyCardSide();
    const back = emptyCardSide();
    const result = await exportCardPdf(front, back);
    expect(result.pageCount).toBe(2);
    expect(result.widthPt).toBeCloseTo(270, 5); // 3.75in * 72
    expect(result.heightPt).toBeCloseTo(162, 5); // 2.25in * 72
    expect(result.buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    // A two-page PDF must declare Count 2 in its page tree.
    expect(result.buffer.toString("latin1")).toMatch(/\/Count\s+2/);
  }, 15000);

  it("embeds the real curated font in exported text, not a Helvetica fallback", async () => {
    const front = emptyCardSide();
    front.elements.push({
      id: "t1", type: "text", x: 0.3, y: 0.3, width: 3, height: 0.5, rotation: 0, zIndex: 0, opacity: 1,
      locked: false, visible: true, text: "Hello", fontFamily: "Playfair Display", fontSizePt: 24, fontWeight: "700",
      italic: false, underline: false, textTransform: "none", align: "left", lineHeight: 1.2, letterSpacing: 0,
      color: "#111111", backgroundColor: null,
    } as never);
    const back = emptyCardSide();
    const result = await exportCardPdf(front, back);
    const text = result.buffer.toString("latin1");
    expect(text).toMatch(/BaseFont\s*\/[A-Z]{6}\+PlayfairDisplay/);
    expect(text).not.toMatch(/BaseFont\s*\/Helvetica\b/);
  }, 15000);
});
