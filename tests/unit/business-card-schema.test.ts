import { describe, it, expect } from "vitest";
import { blankCardDesign, CardTemplateSchema, validateCardDesign, emptyCardSide } from "@/lib/business-card/schema";

describe("business card schema", () => {
  it("produces a valid blank design", () => {
    const design = blankCardDesign();
    const result = validateCardDesign(design);
    expect(result.success).toBe(true);
  });

  it("rejects a design missing required side fields", () => {
    const result = validateCardDesign({ schemaVersion: 1, title: "x", templateId: null, front: {}, back: emptyCardSide() });
    expect(result.success).toBe(false);
  });

  it("validates a full template document", () => {
    const template = {
      schemaVersion: 1 as const,
      id: "t1",
      slug: "test-template",
      title: "Test",
      description: "A test template",
      industry: "general-corporate",
      style: "minimal",
      tags: ["clean"],
      orientation: "landscape" as const,
      palette: ["#111111", "#FFFFFF"],
      fontFamilies: ["Inter"],
      thumbnailFront: null,
      thumbnailBack: null,
      front: emptyCardSide(),
      back: emptyCardSide(),
    };
    const result = CardTemplateSchema.safeParse(template);
    expect(result.success).toBe(true);
  });

  it("rejects an element with an unknown type via discriminated union", () => {
    const design = blankCardDesign();
    design.front.elements.push({ id: "bad", type: "video" as never, x: 0, y: 0, width: 1, height: 1 } as never);
    const result = validateCardDesign(design);
    expect(result.success).toBe(false);
  });

  it("fills in defaults for a minimal text element", () => {
    const design = blankCardDesign();
    design.front.elements.push({ id: "t1", type: "text", x: 0.2, y: 0.2, width: 2, height: 0.3, text: "Hello" } as never);
    const result = validateCardDesign(design);
    expect(result.success).toBe(true);
    if (result.success) {
      const el = result.data.front.elements[0];
      expect(el.type).toBe("text");
      if (el.type === "text") {
        expect(el.fontSizePt).toBe(14);
        expect(el.color).toBe("#111111");
      }
    }
  });
});
