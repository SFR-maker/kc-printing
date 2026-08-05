export interface FontDef {
  family: string;
  category: "sans" | "serif" | "display" | "script";
  /** The bundled file, whose own weight is given by `weight`. */
  file: string;
  weight: string;
  /**
   * The regular (400) cut, where the family has one distinct from `file`.
   *
   * PDF export registers one TrueType file per family, so a family bundled only at 700 printed every
   * weight bold - body text included - while the on-screen proof honoured font-weight properly. The
   * two disagreed and only the printed piece was wrong. Display faces that exist in a single weight
   * leave this unset.
   */
  regularFile?: string;
}

/**
 * Curated, commercially usable (Google Fonts, SIL Open Font License) fonts, self-hosted as real TTF
 * files under public/fonts/ (also mirrored at lib/business-card/fonts-ttf/ for server-side export —
 * see lib/business-card/export.ts, which registers these same files with pdfkit so PDF exports match
 * what's shown in the editor, not just a Helvetica fallback).
 */
export const EDITOR_FONTS: FontDef[] = [
  { family: "Inter", category: "sans", file: "inter.ttf", weight: "700", regularFile: "inter-400.ttf" },
  { family: "Montserrat", category: "sans", file: "montserrat.ttf", weight: "700", regularFile: "montserrat-400.ttf" },
  { family: "Poppins", category: "sans", file: "poppins.ttf", weight: "700", regularFile: "poppins-400.ttf" },
  { family: "Raleway", category: "sans", file: "raleway.ttf", weight: "700", regularFile: "raleway-400.ttf" },
  { family: "Roboto", category: "sans", file: "roboto.ttf", weight: "700", regularFile: "roboto-400.ttf" },
  { family: "Open Sans", category: "sans", file: "open-sans.ttf", weight: "700", regularFile: "open-sans-400.ttf" },
  { family: "Oswald", category: "sans", file: "oswald.ttf", weight: "700", regularFile: "oswald-400.ttf" },
  { family: "Space Grotesk", category: "sans", file: "space-grotesk.ttf", weight: "700", regularFile: "space-grotesk-400.ttf" },
  { family: "Josefin Sans", category: "sans", file: "josefin-sans.ttf", weight: "700", regularFile: "josefin-sans-400.ttf" },
  { family: "Barlow Condensed", category: "sans", file: "barlow-condensed.ttf", weight: "700", regularFile: "barlow-condensed-400.ttf" },
  { family: "Work Sans", category: "sans", file: "work-sans.ttf", weight: "700", regularFile: "work-sans-400.ttf" },
  { family: "Nunito", category: "sans", file: "nunito.ttf", weight: "700", regularFile: "nunito-400.ttf" },
  { family: "Playfair Display", category: "serif", file: "playfair-display.ttf", weight: "700", regularFile: "playfair-display-400.ttf" },
  { family: "Merriweather", category: "serif", file: "merriweather.ttf", weight: "700", regularFile: "merriweather-400.ttf" },
  { family: "Lora", category: "serif", file: "lora.ttf", weight: "700", regularFile: "lora-400.ttf" },
  { family: "Libre Baskerville", category: "serif", file: "libre-baskerville.ttf", weight: "700", regularFile: "libre-baskerville-400.ttf" },
  { family: "Cormorant Garamond", category: "serif", file: "cormorant-garamond.ttf", weight: "700", regularFile: "cormorant-garamond-400.ttf" },
  { family: "Cinzel", category: "serif", file: "cinzel.ttf", weight: "700", regularFile: "cinzel-400.ttf" },
  { family: "Prata", category: "serif", file: "prata.ttf", weight: "400" },
  { family: "Bebas Neue", category: "display", file: "bebas-neue.ttf", weight: "400" },
  { family: "Abril Fatface", category: "display", file: "abril-fatface.ttf", weight: "400" },
  { family: "Anton", category: "display", file: "anton.ttf", weight: "400" },
  { family: "Righteous", category: "display", file: "righteous.ttf", weight: "400" },
  { family: "Great Vibes", category: "script", file: "great-vibes.ttf", weight: "400" },
  { family: "Pacifico", category: "script", file: "pacifico.ttf", weight: "400" },
  { family: "Lobster", category: "script", file: "lobster.ttf", weight: "400" },
  { family: "Dancing Script", category: "script", file: "dancing-script.ttf", weight: "700", regularFile: "dancing-script-400.ttf" },
  { family: "Caveat", category: "script", file: "caveat.ttf", weight: "700", regularFile: "caveat-400.ttf" },
];

export const DEFAULT_FONT_FAMILY = "Inter";

export function isKnownFont(family: string): boolean {
  return EDITOR_FONTS.some((f) => f.family === family);
}

export function getFontDef(family: string): FontDef | undefined {
  return EDITOR_FONTS.find((f) => f.family === family);
}
