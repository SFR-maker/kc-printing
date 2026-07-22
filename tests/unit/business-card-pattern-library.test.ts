import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { PATTERNS, buildFullBleedPatternSvg, SOLID_PRESETS, GRADIENT_PRESETS } from "@/lib/business-card/pattern-library";
import { BLEED_PX_WIDTH, BLEED_PX_HEIGHT } from "@/lib/business-card/print-spec";

describe("pattern library", () => {
  it("defines at least 5 tileable patterns", () => {
    expect(PATTERNS.length).toBeGreaterThanOrEqual(5);
  });

  it("has valid hex colors for every solid and gradient preset", () => {
    const hex = /^#[0-9A-Fa-f]{6}$/;
    for (const p of SOLID_PRESETS) expect(p.value).toMatch(hex);
    for (const g of GRADIENT_PRESETS) {
      expect(g.from).toMatch(hex);
      expect(g.to).toMatch(hex);
    }
  });

  it("rasterizes every pattern to a full-bleed PNG without error", async () => {
    for (const pattern of PATTERNS) {
      const svg = buildFullBleedPatternSvg(pattern, "#FFFFFF", "#0A6E63", BLEED_PX_WIDTH, BLEED_PX_HEIGHT);
      const buf = await sharp(Buffer.from(svg)).png().toBuffer();
      const meta = await sharp(buf).metadata();
      expect(meta.width, `${pattern.key} width`).toBe(BLEED_PX_WIDTH);
      expect(meta.height, `${pattern.key} height`).toBe(BLEED_PX_HEIGHT);
      expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    }
  }, 15000);
});
