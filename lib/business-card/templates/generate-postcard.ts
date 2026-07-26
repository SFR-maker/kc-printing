import type { CardTemplate } from "../schema";
import { CATEGORIES } from "./categories";
import { POSTCARD_ARCHETYPES } from "./postcard-archetypes";

// 4 archetypes for every category — postcards don't need a rotating "5 of N" offset like business
// cards do, since there are only 4 archetypes total and each category uses all of them.
export function generatePostcardTemplates(): CardTemplate[] {
  const templates: CardTemplate[] = [];

  CATEGORIES.forEach((cat) => {
    POSTCARD_ARCHETYPES.forEach((archetype) => {
      const { front, back } = archetype.fn(cat);
      const slug = `${cat.key}-${archetype.name}`;
      templates.push({
        schemaVersion: 1,
        id: slug,
        slug,
        title: `${cat.label}: ${titleCase(archetype.name)}`,
        description: `A ${archetype.style} ${archetype.name.replace(/-/g, " ")} postcard layout for ${cat.label.toLowerCase()} businesses.`,
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
    });
  });

  return templates;
}

function titleCase(slug: string): string {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export const POSTCARD_TEMPLATE_COUNT_EXPECTED = CATEGORIES.length * POSTCARD_ARCHETYPES.length;
