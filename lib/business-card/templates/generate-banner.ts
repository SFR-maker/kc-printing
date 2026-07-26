import type { CardTemplate } from "../schema";
import { CATEGORIES } from "./categories";
import { BANNER_ARCHETYPES } from "./banner-archetypes";

export function generateBannerTemplates(): CardTemplate[] {
  const templates: CardTemplate[] = [];

  CATEGORIES.forEach((cat) => {
    BANNER_ARCHETYPES.forEach((archetype) => {
      const { front, back } = archetype.fn(cat);
      const slug = `${cat.key}-${archetype.name}`;
      // "startsWith" missed the ai-texture-rollup archetype (format suffix, not prefix), which
      // mislabeled it — a real portrait 33x81in roll-up stand — as a landscape vinyl banner.
      const isRollup = archetype.name.includes("rollup");
      templates.push({
        schemaVersion: 1,
        id: slug,
        slug,
        title: `${cat.label} — ${titleCase(archetype.name)}`,
        description: `A ${archetype.style} ${isRollup ? "roll-up stand" : "vinyl"} banner layout for ${cat.label.toLowerCase()} businesses.`,
        industry: cat.key,
        style: archetype.style,
        tags: [archetype.style, cat.key, archetype.name, isRollup ? "roll-up" : "vinyl"],
        orientation: isRollup ? "portrait" : "landscape",
        palette: [...cat.palette],
        fontFamilies: [cat.headingFont, cat.bodyFont],
        thumbnailFront: null,
        thumbnailBack: null,
        front,
        back,
      });
    });
  });

  return templates;
}

function titleCase(slug: string): string {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export const BANNER_TEMPLATE_COUNT_EXPECTED = CATEGORIES.length * BANNER_ARCHETYPES.length;
