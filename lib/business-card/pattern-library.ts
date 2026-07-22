export interface PatternDef {
  key: string;
  label: string;
  tileSize: number;
  /** Inner SVG markup for one tile's motif only (no enclosing <svg>/background rect — that's added by the caller so the motif can be tiled via an SVG <pattern>). */
  motif: (fg: string) => string;
}

/** Generated tileable SVG patterns (no photo library available, so these substitute for GotPrint's
 * stock background photos — a repeating geometric motif tiled full-bleed via an SVG <pattern>,
 * rasterized once and inserted as a full-bleed image element behind everything else. No schema
 * changes were needed since it reuses the existing image element pipeline. */
export const PATTERNS: PatternDef[] = [
  { key: "dots", label: "Dots", tileSize: 36, motif: (fg) => `<circle cx="18" cy="18" r="3" fill="${fg}"/>` },
  { key: "diagonal-stripes", label: "Diagonal Stripes", tileSize: 36, motif: (fg) => `<rect width="14" height="50" fill="${fg}" transform="rotate(35 18 18)"/>` },
  { key: "grid", label: "Grid", tileSize: 36, motif: (fg) => `<path d="M0 0H36M0 0V36" stroke="${fg}" stroke-width="1.25"/>` },
  { key: "waves", label: "Waves", tileSize: 48, motif: (fg) => `<path d="M0 24 Q12 12 24 24 T48 24" stroke="${fg}" stroke-width="2.25" fill="none"/>` },
  {
    key: "confetti",
    label: "Confetti",
    tileSize: 40,
    motif: (fg) => `<circle cx="8" cy="10" r="2" fill="${fg}"/><rect x="24" y="6" width="4" height="4" fill="${fg}" opacity="0.7"/><circle cx="30" cy="28" r="2.5" fill="${fg}" opacity="0.6"/><rect x="10" y="26" width="3" height="3" fill="${fg}" opacity="0.8" transform="rotate(20 11 27)"/>`,
  },
  { key: "chevron", label: "Chevron", tileSize: 36, motif: (fg) => `<path d="M0 24 L18 8 L36 24" stroke="${fg}" stroke-width="2.5" fill="none"/>` },
];

/** Builds one full-size SVG (widthPx x heightPx) with the pattern tiled via a native SVG <pattern> fill. */
export function buildFullBleedPatternSvg(pattern: PatternDef, bg: string, fg: string, widthPx: number, heightPx: number): string {
  const id = `pat-${pattern.key}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}">
    <defs><pattern id="${id}" width="${pattern.tileSize}" height="${pattern.tileSize}" patternUnits="userSpaceOnUse">${pattern.motif(fg)}</pattern></defs>
    <rect width="${widthPx}" height="${heightPx}" fill="${bg}"/>
    <rect width="${widthPx}" height="${heightPx}" fill="url(#${id})"/>
  </svg>`;
}

export const SOLID_PRESETS: { label: string; value: string }[] = [
  { label: "White", value: "#FFFFFF" },
  { label: "Off White", value: "#F5F4F0" },
  { label: "Charcoal", value: "#1B1B1B" },
  { label: "Navy", value: "#0A3D62" },
  { label: "Teal", value: "#0A6E63" },
  { label: "Coral", value: "#E8623D" },
  { label: "Sage", value: "#95B99C" },
  { label: "Blush", value: "#F2D9D9" },
  { label: "Sand", value: "#E4D2B4" },
  { label: "Slate", value: "#4A5568" },
];

export const GRADIENT_PRESETS: { label: string; from: string; to: string; angle: number }[] = [
  { label: "Teal Fade", from: "#0A6E63", to: "#0F9B8E", angle: 90 },
  { label: "Sunset", from: "#E8623D", to: "#F2B705", angle: 45 },
  { label: "Ocean", from: "#0A3D62", to: "#3DA5D9", angle: 90 },
  { label: "Berry", from: "#5B21B6", to: "#DB2777", angle: 60 },
  { label: "Slate", from: "#1F2937", to: "#4B5563", angle: 90 },
  { label: "Blush", from: "#F2D9D9", to: "#FFFFFF", angle: 90 },
];
