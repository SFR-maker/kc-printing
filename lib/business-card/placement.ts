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
  /**
   * Independent scale per document axis, so the artwork can be stretched as well as resized.
   *
   * A single uniform `scale` made "scale proportionally" meaningless: with one number there is no
   * way to express a different width and height. These are measured against the document's own
   * axes after any rotation, so scaleX always affects the on-screen width.
   */
  scaleX: number;
  scaleY: number;
  offsetXIn: number;
  offsetYIn: number;
  /** Quarter turns only. Free rotation would leave uncoverable corners on a rectangular sheet. */
  rotation: 0 | 90 | 180 | 270;
}

/** Natural artwork dimensions mapped onto the document's axes, accounting for rotation. */
export function baseSize(
  inspection: Pick<ArtworkInspection, "widthIn" | "heightIn">,
  rotation: ArtworkPlacement["rotation"]
): { widthIn: number; heightIn: number } {
  const turned = rotation === 90 || rotation === 270;
  return {
    widthIn: turned ? inspection.heightIn : inspection.widthIn,
    heightIn: turned ? inspection.widthIn : inspection.heightIn,
  };
}

/** The artwork's size on the document, after rotation and per-axis scaling. */
export function placedSize(
  inspection: Pick<ArtworkInspection, "widthIn" | "heightIn">,
  placement: ArtworkPlacement
): { widthIn: number; heightIn: number } {
  const base = baseSize(inspection, placement.rotation);
  return { widthIn: base.widthIn * placement.scaleX, heightIn: base.heightIn * placement.scaleY };
}

/** Converts a placed box in document inches back into a placement. */
export function placementFromBox(
  inspection: Pick<ArtworkInspection, "widthIn" | "heightIn">,
  rotation: ArtworkPlacement["rotation"],
  box: { x: number; y: number; width: number; height: number }
): ArtworkPlacement {
  const base = baseSize(inspection, rotation);
  return {
    rotation,
    scaleX: round4(box.width / base.widthIn),
    scaleY: round4(box.height / base.heightIn),
    offsetXIn: round4(box.x),
    offsetYIn: round4(box.y),
  };
}

/** Scale needed to cover the document completely at the current rotation. */
export function coverScale(
  inspection: Pick<ArtworkInspection, "widthIn" | "heightIn" | "requiredWidthIn" | "requiredHeightIn">,
  rotation: ArtworkPlacement["rotation"]
): number {
  const base = baseSize(inspection, rotation);
  return Math.max(inspection.requiredWidthIn / base.widthIn, inspection.requiredHeightIn / base.heightIn);
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
  const scale = coverScale(inspection, rotation);
  return centred(inspection, { scaleX: scale, scaleY: scale, offsetXIn: 0, offsetYIn: 0, rotation });
}

/** The artwork at its own measured size, centred. What "Orig" restores. */
export function originalPlacement(
  inspection: ArtworkInspection,
  rotation: ArtworkPlacement["rotation"] = 0
): ArtworkPlacement {
  return centred(inspection, { scaleX: 1, scaleY: 1, offsetXIn: 0, offsetYIn: 0, rotation });
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
  // Pixels available along each document axis, which the rotation may have swapped.
  const pxAlongX = turned ? inspection.pixelHeight : inspection.pixelWidth;
  const pxAlongY = turned ? inspection.pixelWidth : inspection.pixelHeight;
  // Stretching one axis further than the other means the softer axis sets the effective quality.
  return Math.floor(Math.min(pxAlongX / widthIn, pxAlongY / heightIn));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
