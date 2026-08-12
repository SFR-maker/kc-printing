import "server-only";
import sharp from "sharp";

/**
 * Turns generated artwork into something a customer can judge but not use.
 *
 * A concept preview is handed to the browser as a data URI inside the design JSON, so whatever is
 * sent is downloadable - right-click, or read it straight out of the page source. Before this, that
 * meant four print-resolution backgrounds per generation, free, with no order attached. Someone
 * could generate a set, take the images, and never come back.
 *
 * Two defences, because either alone is weak:
 *
 *   - resolution. A preview is capped to a size that looks right on screen and falls apart in
 *     print. This is the one that actually protects the asset, and it cannot be undone by editing
 *     the page.
 *   - a watermark. This is what stops the preview being *passed off* as finished artwork, and what
 *     makes the protection visible so nobody feels tricked when the clean version appears after
 *     purchase.
 *
 * The print-resolution original never reaches the browser at all until there is a paid order. See
 * `PREVIEW_LONG_EDGE_PX`.
 */

/**
 * Longest edge of a preview, in pixels.
 *
 * Comfortably sharp in a dialog on a high-density screen, and about 140 DPI across a 6in postcard -
 * under the 150 DPI floor the print pipeline enforces, so a preview cannot quietly be submitted as
 * artwork even with the watermark removed.
 */
export const PREVIEW_LONG_EDGE_PX = 860;

/** Tiling repeat of the mark, as a fraction of the image's long edge. */
const TILE_FRACTION = 0.34;

/**
 * The repeating mark, as an SVG tile.
 *
 * Rotated, low-opacity, and repeated rather than placed once in a corner: a single corner mark is
 * cropped off in seconds. Kept light enough that the artwork underneath can still be judged, which
 * is the whole point of showing a preview.
 */
function watermarkTile(size: number): Buffer {
  const font = Math.round(size * 0.13);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <g transform="rotate(-30 ${size / 2} ${size / 2})" fill="#FFFFFF" fill-opacity="0.34"
          font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${font}"
          text-anchor="middle" letter-spacing="${Math.round(font * 0.08)}">
         <text x="${size / 2}" y="${size / 2}">611 PRINTING</text>
         <text x="${size / 2}" y="${size / 2 + font * 1.25}" font-size="${Math.round(font * 0.62)}"
               fill-opacity="0.30" font-weight="500">PREVIEW</text>
       </g>
     </svg>`,
  );
}

export interface PreviewResult {
  /** Watermarked, downscaled JPEG as a data URI - safe to hand to the browser. */
  dataUrl: string;
  widthPx: number;
  heightPx: number;
}

/**
 * Builds the browser-safe preview of a generated background.
 *
 * Takes the full-resolution buffer and returns only the reduced, marked version; the caller keeps
 * the original server-side. Deliberately not reversible - there is no "unwatermark" path, because
 * the clean artwork is regenerated from the stored original at order time rather than recovered
 * from the preview.
 */
export async function buildWatermarkedPreview(
  original: Buffer,
  widthPx: number,
  heightPx: number,
): Promise<PreviewResult> {
  const scale = PREVIEW_LONG_EDGE_PX / Math.max(widthPx, heightPx);
  // Never upscale: a small original stays its own size rather than being blown up and re-softened.
  const w = Math.max(1, Math.round(widthPx * Math.min(1, scale)));
  const h = Math.max(1, Math.round(heightPx * Math.min(1, scale)));

  const tile = Math.max(96, Math.round(Math.max(w, h) * TILE_FRACTION));

  /*
   * The mark is tiled across the whole image by compositing one SVG tile with `tile: true`, which
   * sharp repeats to fill. Drawing a single stretched SVG instead would put one enormous word
   * across the middle - easy to crop out, and it hides more of the artwork than it protects.
   */
  const marked = await sharp(original)
    .resize(w, h, { fit: "fill", kernel: "lanczos3" })
    .composite([{ input: watermarkTile(tile), tile: true, blend: "over" }])
    .jpeg({ quality: 78 })
    .toBuffer();

  return {
    dataUrl: `data:image/jpeg;base64,${marked.toString("base64")}`,
    widthPx: w,
    heightPx: h,
  };
}
