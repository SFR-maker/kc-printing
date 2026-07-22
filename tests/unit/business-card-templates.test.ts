import { describe, it, expect } from "vitest";
import { generateAllTemplates, TEMPLATE_COUNT_EXPECTED } from "@/lib/business-card/templates/generate";
import { CardTemplateSchema } from "@/lib/business-card/schema";
import { validateDesign } from "@/lib/business-card/validate";
import { renderSideToSvg } from "@/lib/business-card/render-svg";

describe("generated business card template set", () => {
  const templates = generateAllTemplates();

  it("produces exactly 100 templates", () => {
    expect(templates.length).toBe(100);
    expect(TEMPLATE_COUNT_EXPECTED).toBe(100);
  });

  it("has unique slugs and ids", () => {
    const slugs = new Set(templates.map((t) => t.slug));
    const ids = new Set(templates.map((t) => t.id));
    expect(slugs.size).toBe(templates.length);
    expect(ids.size).toBe(templates.length);
  });

  it("covers all 20 categories with exactly 5 templates each", () => {
    const byIndustry = new Map<string, number>();
    for (const t of templates) byIndustry.set(t.industry, (byIndustry.get(t.industry) ?? 0) + 1);
    expect(byIndustry.size).toBe(20);
    for (const count of byIndustry.values()) expect(count).toBe(5);
  });

  it("uses 5 distinct archetypes within every category (no repeated layout per category)", () => {
    const byIndustry = new Map<string, Set<string>>();
    for (const t of templates) {
      const archetype = t.tags[t.tags.length - 1];
      if (!byIndustry.has(t.industry)) byIndustry.set(t.industry, new Set());
      byIndustry.get(t.industry)!.add(archetype);
    }
    for (const [, set] of byIndustry) expect(set.size).toBe(5);
  });

  it("validates every template against the schema", () => {
    for (const t of templates) {
      const result = CardTemplateSchema.safeParse(t);
      expect(result.success, `${t.slug} failed schema validation: ${!result.success ? JSON.stringify(result.error.issues) : ""}`).toBe(true);
    }
  });

  it("has no blocking (error-severity) print warnings on any template", () => {
    const failures: string[] = [];
    for (const t of templates) {
      const warnings = validateDesign(t.front, t.back);
      const errors = warnings.filter((w) => w.severity === "error");
      if (errors.length > 0) failures.push(`${t.slug}: ${errors.map((e) => e.message).join(" | ")}`);
    }
    expect(failures, failures.join("\n")).toHaveLength(0);
  });

  it("renders both sides of every template to valid, non-empty SVG", () => {
    for (const t of templates) {
      const frontSvg = renderSideToSvg(t.front);
      const backSvg = renderSideToSvg(t.back);
      expect(frontSvg.startsWith("<svg")).toBe(true);
      expect(backSvg.startsWith("<svg")).toBe(true);
      expect(frontSvg.length).toBeGreaterThan(100);
    }
  });

  it("keeps every element positioned within the bleed canvas (no fully off-canvas elements)", () => {
    for (const t of templates) {
      for (const side of [t.front, t.back]) {
        for (const el of side.elements) {
          const withinX = el.x < side.physicalWidthIn && el.x + el.width > 0;
          const withinY = el.y < side.physicalHeightIn && el.y + el.height > 0;
          expect(withinX && withinY, `${t.slug}: element ${el.id} is off-canvas`).toBe(true);
        }
      }
    }
  });
});
