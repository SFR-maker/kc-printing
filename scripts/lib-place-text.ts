import sharp from "sharp";

/**
 * Finds the emptiest rectangle in a card bed and says how to set type on it.
 *
 * Hardcoding a text box per layout did not survive contact with the images. The prompt asked each
 * layout to leave a specific region clear, but the model placed its colour field where it liked, so
 * a fixed coordinate put the phone number across a white gutter on one card and over a photograph
 * on the next. The only reliable source of truth is the pixels.
 *
 * The measure is variance of luminance in a sliding window: a flat colour panel or a smoothly
 * darkened scrim has near-zero variance, while photographic detail, an edge, or the white gutter
 * between two panels does not. Mean luminance of the winning window then decides whether the type
 * is white or near-black, which also removes the guesswork that put black text on a navy panel.
 *
 * Free, deterministic, and it re-derives itself if the artwork is ever regenerated.
 */

/** Analysis grid. Small on purpose: this is about broad flatness, not fine detail. */
const GW = 160;
const GH = 96;

export interface Placement {
  /** Fractions of the card, 0..1. */
  x: number; y: number; w: number; h: number;
  /** True when the region is dark and the type should be white. */
  light: boolean;
  /** Mean luminance 0..255 and variance, kept for reporting. */
  mean: number;
  variance: number;
}

export async function findTextBox(file: string): Promise<Placement> {
  const { data } = await sharp(file)
    .greyscale()
    .resize(GW, GH, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const at = (x: number, y: number) => data[y * GW + x];

  // Integral images give O(1) mean and variance for any rectangle.
  const s1 = new Float64Array((GW + 1) * (GH + 1));
  const s2 = new Float64Array((GW + 1) * (GH + 1));
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const v = at(x, y);
      const i = (y + 1) * (GW + 1) + (x + 1);
      s1[i] = v + s1[i - 1] + s1[i - (GW + 1)] - s1[i - (GW + 1) - 1];
      s2[i] = v * v + s2[i - 1] + s2[i - (GW + 1)] - s2[i - (GW + 1) - 1];
    }
  }
  const rect = (x0: number, y0: number, w: number, h: number) => {
    const x1 = x0 + w, y1 = y0 + h, n = w * h;
    const g = (s: Float64Array, x: number, y: number) => s[y * (GW + 1) + x];
    const sum = g(s1, x1, y1) - g(s1, x0, y1) - g(s1, x1, y0) + g(s1, x0, y0);
    const sq = g(s2, x1, y1) - g(s2, x0, y1) - g(s2, x1, y0) + g(s2, x0, y0);
    const mean = sum / n;
    return { mean, variance: Math.max(0, sq / n - mean * mean) };
  };

  /*
   * Candidate widths are generous: a full contact block needs roughly a third of the card, and a
   * narrower box would "win" on flatness by hiding inside a gap the type could not actually use.
   */
  const widths = [0.46, 0.40, 0.34, 0.29, 0.25].map((f) => Math.round(GW * f));
  const heights = [0.62, 0.52].map((f) => Math.round(GH * f));
  // Keep clear of bleed and safe zone: 0.125 bleed + 0.125 safe over a 3.75in card is ~6.7%.
  const pad = Math.round(GW * 0.075);
  const padY = Math.round(GH * 0.075);

  let best: (Placement & { score: number }) | null = null;
  for (const w of widths) {
    for (const h of heights) {
      for (let y = padY; y + h <= GH - padY; y += 2) {
        for (let x = pad; x + w <= GW - pad; x += 2) {
          const { mean, variance } = rect(x, y, w, h);
          /*
           * Penalise mid-grey slightly. A flat mid-tone is legible for neither white nor black type;
           * a genuinely dark panel or a genuinely light one is what we want to find.
           */
          const contrastPenalty = 1 - Math.abs(mean - 127.5) / 127.5;
          /*
           * Prefer a wider box, but only as a tie-breaker.
           *
           * The first version had a 0.34 minimum width, which is wider than the flat panel on
           * layouts like triptych - so no candidate fitted inside the panel at all and the search
           * settled on a wooden door at variance 2443. Narrow candidates now exist, and this term is
           * scaled so a genuinely flat narrow box always beats a busy wide one.
           */
          const narrowPenalty = (widths[0] - w) / widths[0] * 260;
          const score = variance + contrastPenalty * 150 + narrowPenalty;
          if (!best || score < best.score) {
            best = {
              x: x / GW, y: y / GH, w: w / GW, h: h / GH,
              light: mean < 128, mean, variance, score,
            };
          }
        }
      }
    }
  }
  if (!best) throw new Error(`could not measure ${file}`);
  const { score: _score, ...placement } = best;
  return placement;
}
