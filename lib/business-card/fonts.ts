export interface FontDef {
  family: string;
  category: "sans" | "serif" | "display";
  weights: string[];
}

/** Curated, commercially usable (Google Fonts, SIL Open Font License) fonts available in the card editor. */
export const EDITOR_FONTS: FontDef[] = [
  { family: "Inter", category: "sans", weights: ["400", "500", "600", "700"] },
  { family: "Montserrat", category: "sans", weights: ["400", "500", "600", "700", "800"] },
  { family: "Poppins", category: "sans", weights: ["400", "500", "600", "700"] },
  { family: "Raleway", category: "sans", weights: ["400", "500", "600", "700"] },
  { family: "Roboto", category: "sans", weights: ["400", "500", "700"] },
  { family: "Space Grotesk", category: "sans", weights: ["400", "500", "600", "700"] },
  { family: "Oswald", category: "sans", weights: ["400", "500", "600", "700"] },
  { family: "Playfair Display", category: "serif", weights: ["400", "600", "700", "800"] },
  { family: "Merriweather", category: "serif", weights: ["400", "700", "900"] },
  { family: "Lora", category: "serif", weights: ["400", "600", "700"] },
  { family: "DM Serif Display", category: "serif", weights: ["400"] },
  { family: "Bebas Neue", category: "display", weights: ["400"] },
];

export const DEFAULT_FONT_FAMILY = "Inter";

export function isKnownFont(family: string): boolean {
  return EDITOR_FONTS.some((f) => f.family === family);
}
