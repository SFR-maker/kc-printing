import type { CardTemplate } from "../schema";
import { CATEGORIES } from "./categories";
import { RIGID_SIGN_ARCHETYPES } from "./rigid-sign-archetypes";
import { SIGN_SHAPES, type SignShape } from "../shape-paths";

const SHAPES: SignShape[] = SIGN_SHAPES.filter((s) => s !== "rectangle");
// 8 categories keeps the catalog reasonable (5 shapes x 2 archetypes x 8 categories = 80
// templates) while still spanning enough industries for real variety.
const SIGN_CATEGORIES = CATEGORIES.slice(0, 8);

export function generateRigidSignTemplates(): CardTemplate[] {
  const templates: CardTemplate[] = [];

  SIGN_CATEGORIES.forEach((cat) => {
    SHAPES.forEach((shapeName) => {
      RIGID_SIGN_ARCHETYPES.forEach((archetype) => {
        const { front, back } = archetype.fn(cat, shapeName);
        const slug = `${cat.key}-${shapeName}-${archetype.name}`;
        templates.push({
          schemaVersion: 1,
          id: slug,
          slug,
          title: `${cat.label}: ${titleCase(shapeName)} ${titleCase(archetype.name)}`,
          description: `A ${archetype.style} ${shapeName.replace(/-/g, " ")}-shaped rigid sign layout for ${cat.label.toLowerCase()} businesses.`,
          industry: cat.key,
          style: archetype.style,
          tags: [archetype.style, cat.key, archetype.name, shapeName],
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
  });

  return templates;
}

function titleCase(slug: string): string {
  return slug.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

export const RIGID_SIGN_TEMPLATE_COUNT_EXPECTED = SIGN_CATEGORIES.length * SHAPES.length * RIGID_SIGN_ARCHETYPES.length;
