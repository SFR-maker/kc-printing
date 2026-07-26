import type { CardTemplate } from "../schema";
import { CATEGORIES } from "./categories";
import { AI_ARCHETYPES } from "./ai-archetypes";

// Kept separate from generateAllTemplates() so the locked "produces exactly 100 templates" test
// stays untouched — these are additive AI-background templates layered on top of the base set.
export function generateAiCardTemplates(): CardTemplate[] {
  const templates: CardTemplate[] = [];

  CATEGORIES.forEach((cat) => {
    AI_ARCHETYPES.forEach((archetype) => {
      const { front, back } = archetype.fn(cat);
      const slug = `${cat.key}-${archetype.name}`;
      templates.push({
        schemaVersion: 1,
        id: slug,
        slug,
        title: `${cat.label}: ${titleCase(archetype.name)}`,
        description: `An AI-generated background texture business card layout for ${cat.label.toLowerCase()} businesses.`,
        industry: cat.key,
        style: archetype.style,
        tags: [archetype.style, cat.key, archetype.name, "ai-generated"],
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

export const AI_TEMPLATE_COUNT_EXPECTED = CATEGORIES.length * AI_ARCHETYPES.length;
