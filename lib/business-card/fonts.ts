export interface FontDef {
  family: string;
  category: "sans" | "serif" | "display" | "script";
  file: string;
  weight: string;
}

/**
 * Curated, commercially usable (Google Fonts, SIL Open Font License) fonts, self-hosted as real TTF
 * files under public/fonts/ (also mirrored at lib/business-card/fonts-ttf/ for server-side export —
 * see lib/business-card/export.ts, which registers these same files with pdfkit so PDF exports match
 * what's shown in the editor, not just a Helvetica fallback).
 */
export const EDITOR_FONTS: FontDef[] = [
  { family: "Inter", category: "sans", file: "inter.ttf", weight: "700" },
  { family: "Montserrat", category: "sans", file: "montserrat.ttf", weight: "700" },
  { family: "Poppins", category: "sans", file: "poppins.ttf", weight: "700" },
  { family: "Raleway", category: "sans", file: "raleway.ttf", weight: "700" },
  { family: "Roboto", category: "sans", file: "roboto.ttf", weight: "700" },
  { family: "Open Sans", category: "sans", file: "open-sans.ttf", weight: "700" },
  { family: "Oswald", category: "sans", file: "oswald.ttf", weight: "700" },
  { family: "Space Grotesk", category: "sans", file: "space-grotesk.ttf", weight: "700" },
  { family: "Josefin Sans", category: "sans", file: "josefin-sans.ttf", weight: "700" },
  { family: "Barlow Condensed", category: "sans", file: "barlow-condensed.ttf", weight: "700" },
  { family: "Work Sans", category: "sans", file: "work-sans.ttf", weight: "700" },
  { family: "Nunito", category: "sans", file: "nunito.ttf", weight: "700" },
  { family: "Playfair Display", category: "serif", file: "playfair-display.ttf", weight: "700" },
  { family: "Merriweather", category: "serif", file: "merriweather.ttf", weight: "700" },
  { family: "Lora", category: "serif", file: "lora.ttf", weight: "700" },
  { family: "Libre Baskerville", category: "serif", file: "libre-baskerville.ttf", weight: "700" },
  { family: "Cormorant Garamond", category: "serif", file: "cormorant-garamond.ttf", weight: "700" },
  { family: "Cinzel", category: "serif", file: "cinzel.ttf", weight: "700" },
  { family: "Prata", category: "serif", file: "prata.ttf", weight: "400" },
  { family: "Bebas Neue", category: "display", file: "bebas-neue.ttf", weight: "400" },
  { family: "Abril Fatface", category: "display", file: "abril-fatface.ttf", weight: "400" },
  { family: "Anton", category: "display", file: "anton.ttf", weight: "400" },
  { family: "Righteous", category: "display", file: "righteous.ttf", weight: "400" },
  { family: "Great Vibes", category: "script", file: "great-vibes.ttf", weight: "400" },
  { family: "Pacifico", category: "script", file: "pacifico.ttf", weight: "400" },
  { family: "Lobster", category: "script", file: "lobster.ttf", weight: "400" },
  { family: "Dancing Script", category: "script", file: "dancing-script.ttf", weight: "700" },
  { family: "Caveat", category: "script", file: "caveat.ttf", weight: "700" },
];

export const DEFAULT_FONT_FAMILY = "Inter";

export function isKnownFont(family: string): boolean {
  return EDITOR_FONTS.some((f) => f.family === family);
}

export function getFontDef(family: string): FontDef | undefined {
  return EDITOR_FONTS.find((f) => f.family === family);
}
