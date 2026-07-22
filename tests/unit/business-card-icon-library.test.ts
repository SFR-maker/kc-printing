import { describe, it, expect } from "vitest";
import { ICON_CATEGORIES, isValidIconName, getIconComponent } from "@/lib/business-card/icon-library";

describe("icon library", () => {
  it("has at least 10 categories with icons", () => {
    expect(ICON_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    for (const cat of ICON_CATEGORIES) expect(cat.icons.length).toBeGreaterThan(0);
  });

  it("every referenced icon name is a real, resolvable lucide-react export", () => {
    const invalid: string[] = [];
    for (const cat of ICON_CATEGORIES) {
      for (const name of cat.icons) {
        if (!isValidIconName(name) || !getIconComponent(name)) invalid.push(`${cat.key}/${name}`);
      }
    }
    expect(invalid, `Invalid icon names: ${invalid.join(", ")}`).toHaveLength(0);
  });

  it("has no duplicate icon names within a single category", () => {
    for (const cat of ICON_CATEGORIES) {
      expect(new Set(cat.icons).size).toBe(cat.icons.length);
    }
  });

  it("returns null for an unknown icon name", () => {
    expect(getIconComponent("NotARealIconXYZ")).toBeNull();
  });
});
