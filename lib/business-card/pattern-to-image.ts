import { PATTERNS, buildFullBleedPatternSvg, type PatternDef } from "./pattern-library";
import { BLEED_PX_WIDTH, BLEED_PX_HEIGHT } from "./print-spec";

/** Rasterizes a full-bleed pattern to a PNG data URI (browser-only, via canvas) — same rationale as
 * icon-to-image.ts: keeps the result compatible with both export paths (sharp and svg-to-pdfkit),
 * neither of which is guaranteed to handle nested SVG the same way a raster image is handled. */
export function patternToPngDataUri(pattern: PatternDef, bg: string, fg: string): Promise<{ dataUri: string; width: number; height: number } | null> {
  const svg = buildFullBleedPatternSvg(pattern, bg, fg, BLEED_PX_WIDTH, BLEED_PX_HEIGHT);
  const encoded = window.btoa(unescape(encodeURIComponent(svg)));
  const svgUri = `data:image/svg+xml;base64,${encoded}`;

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = BLEED_PX_WIDTH;
      canvas.height = BLEED_PX_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, BLEED_PX_WIDTH, BLEED_PX_HEIGHT);
      resolve({ dataUri: canvas.toDataURL("image/png"), width: BLEED_PX_WIDTH, height: BLEED_PX_HEIGHT });
    };
    img.onerror = reject;
    img.src = svgUri;
  });
}

export { PATTERNS };
