import type { ArtworkInspection } from "./inspect-artwork";

/**
 * Where the customer has positioned their artwork on the print document.
 *
 * Everything is in inches against the document's own coordinate space, with the origin at the
 * document's top-left corner (the bleed edge, not the trim line). `scale` multiplies the artwork's
 * own measured physical size, so 1 is "actual size" and the auto-fit value is whatever it takes to
 * cover the document.
 */
export interface ArtworkPlacement {
  scale: number;
  offsetXIn: number;
  offsetYIn: number;
  /** Quarter turns only. Free rotation would leave uncoverable corners on a rectangular sheet. */
  rotation: 0 | 90 | 180 | 270;
}

/** Artwork dimensions after rotation, since a quarter turn swaps width and height. */
export function placedSize(
  inspection: Pick<ArtworkInspection, "widthIn" | "heightIn">,
  placement: ArtworkPlacement
): { widthIn: number; heightIn: number } {
  const w = inspection.widthIn * placement.scale;
  const h = inspection.heightIn * placement.scale;
  const turned = placement.rotation === 90 || placement.rotation === 270;
  return { widthIn: turned ? h : w, heightIn: turned ? w : h };
}

/** Scale needed to cover the document completely at the current rotation. */
export function coverScale(
  inspection: Pick<ArtworkInspection, "widthIn" | "heightIn" | "requiredWidthIn" | "requiredHeightIn">,
  rotation: ArtworkPlacement["rotation"]
): number {
  const turned = rotation === 90 || rotation === 270;
  const w = turned ? inspection.heightIn : inspection.widthIn;
  const h = turned ? inspection.widthIn : inspection.heightIn;
  return Math.max(inspection.requiredWidthIn / w, inspection.requiredHeightIn / h);
}

/** Centres the artwork at its current scale and rotation. */
export function centred(
  inspection: ArtworkInspection,
  placement: ArtworkPlacement
): ArtworkPlacement {
  const { widthIn, heightIn } = placedSize(inspection, placement);
  return {
    ...placement,
    offsetXIn: round4((inspection.requiredWidthIn - widthIn) / 2),
    offsetYIn: round4((inspection.requiredHeightIn - heightIn) / 2),
  };
}

/** Cover the document and centre - the default placement, and what "Fit" restores. */
export function fitPlacement(
  inspection: ArtworkInspection,
  rotation: ArtworkPlacement["rotation"] = 0
): ArtworkPlacement {
  return centred(inspection, { scale: coverScale(inspection, rotation), offsetXIn: 0, offsetYIn: 0, rotation });
}

/** The artwork at its own measured size, centred. What "Orig" restores. */
export function originalPlacement(
  inspection: ArtworkInspection,
  rotation: ArtworkPlacement["rotation"] = 0
): ArtworkPlacement {
  return centred(inspection, { scale: 1, offsetXIn: 0, offsetYIn: 0, rotation });
}

/**
 * Every line the artwork can snap to, in inches from the document edge.
 *
 * Snapping to the document edge is what makes a full-bleed placement reliable by hand - without it
 * customers leave a hairline gap that prints as a white sliver after trimming.
 */
export function guideLines(inspection: ArtworkInspection): { x: number[]; y: number[] } {
  const bleed = (inspection.requiredWidthIn - 3.5) / 2;
  const safe = bleed + 0.125;
  return {
    x: [0, bleed, safe, inspection.requiredWidthIn - safe, inspection.requiredWidthIn - bleed, inspection.requiredWidthIn],
    y: [0, bleed, safe, inspection.requiredHeightIn - safe, inspection.requiredHeightIn - bleed, inspection.requiredHeightIn],
  };
}

const SNAP_THRESHOLD_IN = 0.03;

/** Pulls a dragged placement onto nearby guides, matching either the leading or trailing edge. */
export function snapPlacement(
  inspection: ArtworkInspection,
  placement: ArtworkPlacement
): ArtworkPlacement {
  const { widthIn, heightIn } = placedSize(inspection, placement);
  const guides = guideLines(inspection);
  return {
    ...placement,
    offsetXIn: snapAxis(placement.offsetXIn, widthIn, guides.x),
    offsetYIn: snapAxis(placement.offsetYIn, heightIn, guides.y),
  };
}

function snapAxis(offset: number, size: number, guides: number[]): number {
  let best = offset;
  let bestDelta = SNAP_THRESHOLD_IN;
  for (const g of guides) {
    for (const candidate of [g, g - size]) {
      const delta = Math.abs(offset - candidate);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = candidate;
      }
    }
  }
  return round4(best);
}

/** True when the artwork leaves any part of the document uncovered, which prints as white. */
export function hasUncoveredEdge(
  inspection: ArtworkInspection,
  placement: ArtworkPlacement
): boolean {
  const { widthIn, heightIn } = placedSize(inspection, placement);
  const eps = 1e-4;
  return (
    placement.offsetXIn > eps ||
    placement.offsetYIn > eps ||
    placement.offsetXIn + widthIn < inspection.requiredWidthIn - eps ||
    placement.offsetYIn + heightIn < inspection.requiredHeightIn - eps
  );
}

/**
 * Effective print resolution at the current scale.
 *
 * Scaling artwork up spreads the same pixels over more inches, so this has to be recomputed as the
 * customer resizes rather than taken from the original inspection.
 */
export function placedDpi(
  inspection: ArtworkInspection,
  placement: ArtworkPlacement
): number | null {
  if (!inspection.pixelWidth || !inspection.pixelHeight) return null;
  const { widthIn, heightIn } = placedSize(inspection, placement);
  const turned = placement.rotation === 90 || placement.rotation === 270;
  const pxW = turned ? inspection.pixelHeight : inspection.pixelWidth;
  const pxH = turned ? inspection.pixelWidth : inspection.pixelHeight;
  return Math.floor(Math.min(pxW / widthIn, pxH / heightIn));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
