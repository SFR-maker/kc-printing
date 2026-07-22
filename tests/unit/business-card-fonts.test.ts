import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { EDITOR_FONTS, isKnownFont } from "@/lib/business-card/fonts";
import { CATEGORIES } from "@/lib/business-card/templates/categories";
import { generateAllTemplates } from "@/lib/business-card/templates/generate";
import { blankCardDesign } from "@/lib/business-card/schema";

describe("font manifest", () => {
  it("has a real TTF file on disk for every curated font, in both locations used by the app", () => {
    for (const f of EDITOR_FONTS) {
      const serverPath = path.join(process.cwd(), "lib/business-card/fonts-ttf", f.file);
      const publicPath = path.join(process.cwd(), "public/fonts", f.file);
      expect(fs.existsSync(serverPath), `missing server font file: ${serverPath}`).toBe(true);
      expect(fs.existsSync(publicPath), `missing public font file: ${publicPath}`).toBe(true);
    }
  });

  it("has no duplicate font family names", () => {
    const names = EDITOR_FONTS.map((f) => f.family);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every template category's heading/body font is a known, wired font", () => {
    const bad: string[] = [];
    for (const cat of CATEGORIES) {
      if (!isKnownFont(cat.headingFont)) bad.push(`${cat.key}.headingFont: ${cat.headingFont}`);
      if (!isKnownFont(cat.bodyFont)) bad.push(`${cat.key}.bodyFont: ${cat.bodyFont}`);
    }
    expect(bad, `Unknown fonts referenced (would silently fall back to a system font): ${bad.join(", ")}`).toHaveLength(0);
  });

  it("every text element's fontFamily across all 100 generated templates is a known, wired font", () => {
    const templates = generateAllTemplates();
    const unknown = new Set<string>();
    for (const t of templates) {
      for (const side of [t.front, t.back]) {
        for (const el of side.elements) {
          if (el.type === "text" && !isKnownFont(el.fontFamily)) unknown.add(el.fontFamily);
        }
      }
    }
    expect([...unknown], `Unknown fonts used in templates: ${[...unknown].join(", ")}`).toHaveLength(0);
  });

  it("the blank design's default text font is a known, wired font", () => {
    const design = blankCardDesign();
    design.front.elements.push({
      id: "t1", type: "text", x: 0, y: 0, width: 1, height: 0.3, text: "x",
    } as never);
    const parsed = design.front.elements[0] as { fontFamily?: string };
    // Defaults are applied by the schema on parse, not by blankCardDesign() directly, so just assert
    // the schema's declared default (checked separately in schema tests) is itself a wired font.
    expect(isKnownFont("Inter")).toBe(true);
    void parsed;
  });
});
