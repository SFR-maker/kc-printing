import type { CardTemplate } from "../schema";
import { CATEGORIES } from "./categories";
import { ARCHETYPES } from "./archetypes";

// 5 distinct archetype offsets (out of 8) per category, rotated by category index so
// no two categories use the same 5-of-8 combination and no category repeats an archetype.
const OFFSETS = [0, 1, 3, 5, 6];

export function generateAllTemplates(): CardTemplate[] {
  const templates: CardTemplate[] = [];

  CATEGORIES.forEach((cat, catIndex) => {
    OFFSETS.forEach((offset, slot) => {
      const archetypeIndex = (catIndex + offset) % ARCHETYPES.length;
      const archetype = ARCHETYPES[archetypeIndex];
      const { front, back } = archetype.fn(cat);
      const slug = `${cat.key}-${archetype.name}`;
      templates.push({
        schemaVersion: 1,
        id: slug,
        slug,
        title: `${cat.label} — ${titleCase(archetype.name)}`,
        description: `A ${archetype.style} ${archetype.name.replace(/-/g, " ")} business card layout for ${cat.label.toLowerCase()} businesses.`,
        industry: cat.key,
        style: archetype.style,
        tags: [archetype.style, cat.key, archetype.name],
        orientation: "landscape",
        palette: [...cat.palette],
        fontFamilies: [cat.headingFont, cat.bodyFont],
        thumbnailFront: null,
        thumbnailBack: null,
        front,
        back,
      });
      void slot;
    });
  });

  return templates;
}

function titleCase(slug: string): string {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export const TEMPLATE_COUNT_EXPECTED = CATEGORIES.length * OFFSETS.length;
