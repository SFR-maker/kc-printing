import type { CardSide } from "./schema";

/**
 * Converts a CardSide from one bleed allowance to another, keeping every element in the same place
 * relative to the trim edge.
 *
 * Element x/y are absolute inches measured from the corner of the *bleed* box, not the trim box. So
 * when the bleed shrinks, the whole composition has to move with it: an element sitting 0.195in
 * inside the trim edge is stored at 0.32 under a 0.125in bleed and must become 0.245 under a 0.05in
 * bleed. Without this shift, changing the spec would silently nudge every design toward the
 * bottom-right of the card.
 *
 * Elements that bleed off an edge are then clamped back to the new document box. A background panel
 * stored as x=0 width=3.75 (full bleed at 0.125) would otherwise shift to x=-0.075 width=3.75 and
 * hang 0.075in outside the 3.6in document on both sides - visually identical once the renderer
 * clips, but the stored geometry would be out of bounds and confusing in the editor.
 *
 * This is the single implementation used by both the template generators and the database
 * migration, so authored designs and stored designs can never disagree.
 */
export function rebleedSide(side: CardSide, newBleedIn: number): CardSide {
  const oldBleed = side.bleedIn;
  if (Math.abs(oldBleed - newBleedIn) < 1e-9) return side;

  const delta = oldBleed - newBleedIn;
  const trimWidthIn = side.physicalWidthIn - oldBleed * 2;
  const trimHeightIn = side.physicalHeightIn - oldBleed * 2;
  const newWidth = round4(trimWidthIn + newBleedIn * 2);
  const newHeight = round4(trimHeightIn + newBleedIn * 2);

  const elements = side.elements.map((el) => {
    // Edge anchoring only makes sense for things that are meant to cover the sheet: background
    // panels, rails, photos. A text or QR box is content — resizing it reflows or clips the text.
    // One template had a contact line whose box happened to end exactly on the document edge, and
    // anchoring squashed it from 0.1in to 0.025in tall, cutting the line off.
    const anchors = el.type === "shape" || el.type === "image";
    const [x, width] = anchors
      ? reanchor(el.x, el.width, side.physicalWidthIn, newWidth, delta)
      : [round4(el.x - delta), round4(el.width)];
    const [y, height] = anchors
      ? reanchor(el.y, el.height, side.physicalHeightIn, newHeight, delta)
      : [round4(el.y - delta), round4(el.height)];
    return { ...el, x, y, width, height };
  });

  return {
    ...side,
    physicalWidthIn: newWidth,
    physicalHeightIn: newHeight,
    bleedIn: newBleedIn,
    elements,
  };
}

const EPS = 1e-6;

/**
 * Re-bases one axis of an element.
 *
 * Elements that bleed off an edge stay anchored to that edge rather than being shifted, so a
 * background panel keeps covering the document and a colour rail keeps running off the side. Only
 * the free edges move. Interior elements just shift, which preserves their distance from the trim.
 *
 * Anchoring rather than clamping also makes the conversion reversible: run it back to the old bleed
 * and you get the original geometry, which is what lets the migration be re-run or rolled back.
 */
function reanchor(
  pos: number,
  size: number,
  oldDocSize: number,
  newDocSize: number,
  delta: number
): [number, number] {
  const bleedsStart = pos <= EPS;
  const bleedsEnd = pos + size >= oldDocSize - EPS;

  if (bleedsStart && bleedsEnd) return [0, newDocSize];
  if (bleedsStart) return [0, round4(size - delta)];
  if (bleedsEnd) {
    const next = round4(pos - delta);
    return [next, round4(newDocSize - next)];
  }
  return [round4(pos - delta), round4(size)];
}

/** Inch geometry only ever needs 4dp; keeps stored JSON free of float noise like 0.24500000000000002. */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
