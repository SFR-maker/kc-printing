import type { CardTemplate } from "../schema";
import { CATEGORIES } from "./categories";
import { WINDOW_DECAL_ARCHETYPES, WINDOW_FORMATS } from "./window-decal-archetypes";

// 8 categories keeps the catalogue in proportion with the other products (4 formats x 3 archetypes
// x 8 categories = 96 templates, against rigid signs' 80) while still spanning enough industries
// that a shop searching for its own trade finds something.
const DECAL_CATEGORIES = CATEGORIES.slice(0, 8);

export function generateWindowDecalTemplates(): CardTemplate[] {
  const templates: CardTemplate[] = [];

  DECAL_CATEGORIES.forEach((cat) => {
    WINDOW_FORMATS.forEach((format) => {
      WINDOW_DECAL_ARCHETYPES.forEach((archetype) => {
        const { front, back } = archetype.fn(cat, format);
        const slug = `${cat.key}-window-${format.key}-${archetype.name}`;
        templates.push({
          schemaVersion: 1,
          id: slug,
          slug,
          title: `${cat.label}: ${format.label} ${titleCase(archetype.name)}`,
          description: `A ${archetype.style} ${format.label.toLowerCase()} window graphic for ${cat.label.toLowerCase()} businesses.`,
          industry: cat.key,
          style: archetype.style,
          tags: [archetype.style, cat.key, archetype.name, format.key, "window"],
          // Orientation describes the piece, not the format name: a 24 x 9 banner and a 24 x 18
          // panel are both landscape, and the portrait format is the only tall one.
          orientation: front.physicalHeightIn > front.physicalWidthIn ? "portrait" : "landscape",
          palette: [...cat.palette],
          fontFamilies: [cat.headingFont, cat.bodyFont],
          thumbnailFront: null,
          thumbnailBack: null,
          front,
          back,
        });
      });
    });
  });

  return templates;
}

function titleCase(slug: string): string {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export const WINDOW_DECAL_TEMPLATE_COUNT_EXPECTED =
  DECAL_CATEGORIES.length * WINDOW_FORMATS.length * WINDOW_DECAL_ARCHETYPES.length;
