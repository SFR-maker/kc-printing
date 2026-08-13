import type { CardSide, CardElement } from "./schema";

/**
 * Re-lays out a card side for a different finished size.
 *
 * Templates are authored at one geometry (3.5 x 2 landscape plus bleed). The shop sells four sizes
 * in two orientations, so picking a vertical 1.75" x 3" card left the customer with artwork built
 * for a landscape card: the background stretched, the text block sat off the panel it was measured
 * onto, and type kept a point size chosen for a card almost twice as wide.
 *
 * The transform is deliberately not a uniform scale of everything:
 *
 *   Backgrounds COVER. A full-bleed photograph is re-fitted to the new box the way `object-fit:
 *   cover` would, centred, so it fills the card without distorting. Stretching a photograph to a
 *   different aspect ratio is the one outcome nobody wants.
 *
 *   Text moves PROPORTIONALLY, then is clamped. Its position is expressed as a fraction of the old
 *   card and re-applied to the new one, so a block sitting on the right-hand panel stays on the
 *   right-hand panel. It is then clamped inside the new safe area, because a proportional move can
 *   still land a wide block over an edge when the aspect ratio changes sharply.
 *
 *   Type scales by the SMALLER axis ratio. Scaling by width alone makes text overflow a card that
 *   got proportionally shorter, and by height alone it overflows one that got narrower.
 *
 * Pure, so it is unit-testable and can run on the server when seeding or on the client when the
 * customer changes size mid-design.
 */

export interface RefitTarget {
  /** Finished size including bleed, in inches. */
  widthIn: number;
  heightIn: number;
  bleedIn?: number;
  safeZoneInsetIn?: number;
}

/** Elements that should cover the card rather than be positioned within it. */
function isBackground(el: CardElement, side: CardSide): boolean {
  if (el.type !== "image" && el.type !== "shape") return false;
  // Full-bleed by geometry: starts at or before the origin and spans the whole card.
  const spansWidth = el.x <= 0.001 && el.x + el.width >= side.physicalWidthIn - 0.001;
  const spansHeight = el.y <= 0.001 && el.y + el.height >= side.physicalHeightIn - 0.001;
  return spansWidth && spansHeight;
}

export function refitSide(side: CardSide, target: RefitTarget): CardSide {
  const ow = side.physicalWidthIn;
  const oh = side.physicalHeightIn;
  const nw = target.widthIn;
  const nh = target.heightIn;
  if (!(ow > 0 && oh > 0 && nw > 0 && nh > 0)) return side;

  const sx = nw / ow;
  const sy = nh / oh;
  // Type and stroke weights follow the tighter of the two, so nothing outgrows the card.
  const sMin = Math.min(sx, sy);

  const bleed = target.bleedIn ?? side.bleedIn;
  const safe = target.safeZoneInsetIn ?? side.safeZoneInsetIn;
  const inset = bleed + safe;

  const elements = side.elements.map((el): CardElement => {
    if (isBackground(el, side)) {
      /*
       * Cover: scale by the LARGER ratio so the shorter axis is filled too, then centre the
       * overflow. This is what keeps a photograph from being squashed when a landscape card becomes
       * a portrait one.
       */
      const cover = Math.max(sx, sy);
      const w = el.width * cover;
      const h = el.height * cover;
      return { ...el, x: (nw - w) / 2, y: (nh - h) / 2, width: w, height: h };
    }

    // Proportional move, proportional size, then clamp inside the safe area.
    let w = el.width * sx;
    let h = el.height * sy;
    if (el.type === "text") {
      // Text boxes keep their shape relative to the type, or a tall narrow card squeezes the block
      // into a column one word wide.
      w = el.width * sMin;
      h = el.height * sMin;
    }
    w = Math.min(w, Math.max(0.1, nw - inset * 2));
    h = Math.min(h, Math.max(0.1, nh - inset * 2));

    const cx = (el.x + el.width / 2) / ow;
    const cy = (el.y + el.height / 2) / oh;
    let x = cx * nw - w / 2;
    let y = cy * nh - h / 2;
    x = Math.min(Math.max(x, inset), nw - inset - w);
    y = Math.min(Math.max(y, inset), nh - inset - h);

    const base = { ...el, x, y, width: w, height: h };
    if (base.type === "text") {
      return { ...base, fontSizePt: Math.max(4, base.fontSizePt * sMin) };
    }
    return base;
  });

  return {
    ...side,
    physicalWidthIn: nw,
    physicalHeightIn: nh,
    bleedIn: bleed,
    safeZoneInsetIn: safe,
    elements,
  };
}
