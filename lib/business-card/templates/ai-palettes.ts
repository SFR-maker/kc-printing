/** Curated color options for the "Create with AI" generator — shown as pickable swatches so a
 * customer can lock in a look instead of leaving it to a random industry-palette pick. Distinct
 * from CATEGORIES' industry palettes (categories.ts), which are flavor text for the static
 * template catalog, not meant as a user-facing "pick your colors" control. */
export interface AiPalette {
  id: string;
  label: string;
  colors: [string, string, string]; // primary, secondary, ink/neutral
}

export const AI_PALETTES: AiPalette[] = [
  { id: "ocean-teal", label: "Ocean Teal", colors: ["#0B7285", "#3DA5D9", "#12232E"] },
  { id: "sunset-coral", label: "Sunset Coral", colors: ["#D9531E", "#F2B705", "#1B1B1B"] },
  { id: "classic-navy", label: "Classic Navy", colors: ["#123C69", "#C9A24B", "#111111"] },
  { id: "forest-green", label: "Forest Green", colors: ["#2D6A4F", "#95D5B2", "#1B1B1B"] },
  { id: "berry-rose", label: "Berry Rose", colors: ["#7A1E1E", "#D4A5A5", "#3E2C2C"] },
  { id: "charcoal-gold", label: "Charcoal Gold", colors: ["#111827", "#B08D57", "#F5F4F0"] },
  { id: "violet-dream", label: "Violet Dream", colors: ["#5B21B6", "#F2B705", "#111111"] },
  { id: "slate-blue", label: "Slate Blue", colors: ["#0F172A", "#94A3B8", "#F8FAFC"] },
];

export const AI_PALETTE_AUTO_ID = "auto";

export function resolveAiPalette(paletteId: string | undefined): [string, string, string] {
  if (paletteId && paletteId !== AI_PALETTE_AUTO_ID) {
    const found = AI_PALETTES.find((p) => p.id === paletteId);
    if (found) return found.colors;
  }
  return AI_PALETTES[Math.floor(Math.random() * AI_PALETTES.length)].colors;
}
