import type { CardSide, CardTemplate, TextElement, ShapeElement } from "../schema";
import { BANNER_OCCASIONS, type BannerOccasion } from "./banner-occasions";

/**
 * Banner templates built around the occasion rather than the trade.
 *
 * Two layouts in two orientations for each of the occasions in banner-occasions, which is what turns
 * a library of four banners into one somebody can actually shop. The layouts are deliberately
 * different in structure rather than in colour: a centred stack reads as a statement, a side panel
 * reads as a sign with a label on it, and they suit different messages.
 *
 * Type is sized off the short edge. A banner is read from distance, and the constraint on a line of
 * text is the height of the piece, not its length - scaling off width made a 20ft banner set its
 * headline four feet tall.
 */

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `bo-${prefix}-${counter}`;
}

function text(partial: Partial<TextElement> & Pick<TextElement, "x" | "y" | "width" | "height" | "text">): TextElement {
  return {
    id: id("text"), type: "text", rotation: 0, zIndex: 1, opacity: 1, locked: false, visible: true,
    fontFamily: "Anton", fontSizePt: 12, fontWeight: "700", italic: false, underline: false,
    textTransform: "none", align: "center", lineHeight: 1.05, letterSpacing: 0, color: "#FFFFFF",
    backgroundColor: null, ...partial,
  };
}

function shape(partial: Partial<ShapeElement> & Pick<ShapeElement, "x" | "y" | "width" | "height" | "shape">): ShapeElement {
  return {
    id: id("shape"), type: "shape", rotation: 0, zIndex: 0, opacity: 1, locked: false, visible: true,
    fill: "#000000", stroke: null, strokeWidthPx: 0, cornerRadiusIn: 0, gradient: null, ...partial,
  };
}

/**
 * The two shapes banners are actually bought in.
 *
 * 8ft x 4ft is the commonest storefront vinyl; 3ft x 6ft is the portrait one people hang beside a
 * door or on a fence post. Both are real sellable sizes - a test asserts as much - and either can be
 * resized in the editor afterwards.
 */
const FORMATS = [
  { key: "landscape", widthIn: 96, heightIn: 48, orientation: "landscape" as const },
  { key: "portrait", widthIn: 36, heightIn: 72, orientation: "portrait" as const },
];

const BLEED = 0.125;
const SAFE = 0.25;

function side(w: number, h: number, background: CardSide["background"], elements: CardSide["elements"]): CardSide {
  return {
    physicalWidthIn: w + BLEED * 2,
    physicalHeightIn: h + BLEED * 2,
    bleedIn: BLEED,
    safeZoneInsetIn: SAFE,
    shapeMask: "rectangle",
    background,
    elements,
  };
}

/** A banner prints on one face; the back exists because the schema has two. */
function blankBack(w: number, h: number): CardSide {
  return side(w, h, { type: "solid", color: "#FFFFFF", gradient: null }, []);
}

type Layout = (o: BannerOccasion, w: number, h: number) => CardSide;

/**
 * 1. Centred stack - the headline as a statement, everything else subordinate to it.
 *
 * The default for an announcement: GRAND OPENING, SOLD, 5K RUN. Nothing competes with the message.
 */
const centredStack: Layout = (o, w, h) => {
  const [dominant, accent, ink] = o.palette;
  const W = w + BLEED * 2;
  const H = h + BLEED * 2;
  const k = Math.min(W, H);

  return side(w, h, { type: "solid", color: dominant, gradient: null }, [
    text({
      x: W * 0.06, y: H * 0.3, width: W * 0.88, height: H * 0.24,
      text: o.headline, fontSizePt: k * 6.2, color: ink, letterSpacing: k * 0.02,
    }),
    shape({ x: W / 2 - W * 0.08, y: H * 0.58, width: W * 0.16, height: H * 0.012, shape: "divider", fill: accent }),
    ...(o.subline ? [text({
      x: W * 0.1, y: H * 0.63, width: W * 0.8, height: H * 0.09,
      text: o.subline, fontFamily: "Work Sans", fontWeight: "600", fontSizePt: k * 1.9, color: ink,
    })] : []),
    ...(o.cta ? [text({
      x: W * 0.1, y: H * 0.76, width: W * 0.8, height: H * 0.08,
      text: o.cta, fontFamily: "Work Sans", fontWeight: "600", fontSizePt: k * 1.5, color: accent,
    })] : []),
  ]);
};

/**
 * 2. Side panel - a block of colour carrying the occasion, the detail in the open field beside it.
 *
 * Suits anything with a message under the headline: STORE HOURS, NOW HIRING, OPEN HOUSE. On a
 * portrait banner the panel runs across the top instead of down the side, because a vertical strip
 * on a 3ft-wide banner leaves nothing usable next to it.
 */
const sidePanel: Layout = (o, w, h) => {
  const [dominant, accent, ink] = o.palette;
  const W = w + BLEED * 2;
  const H = h + BLEED * 2;
  const k = Math.min(W, H);
  const vertical = H > W;

  const panel = vertical
    ? shape({ x: 0, y: 0, width: W, height: H * 0.42, shape: "rect", fill: dominant })
    : shape({ x: 0, y: 0, width: W * 0.44, height: H, shape: "rect", fill: dominant });

  const headline = vertical
    ? text({ x: W * 0.07, y: H * 0.12, width: W * 0.86, height: H * 0.18, text: o.headline, fontSizePt: k * 4.6, color: ink, letterSpacing: k * 0.015 })
    : text({ x: W * 0.04, y: H * 0.36, width: W * 0.36, height: H * 0.26, text: o.headline, fontSizePt: k * 4.4, color: ink, letterSpacing: k * 0.015 });

  const detailX = vertical ? W * 0.08 : W * 0.5;
  const detailW = vertical ? W * 0.84 : W * 0.44;
  const detailY = vertical ? H * 0.52 : H * 0.36;

  return side(w, h, { type: "solid", color: "#FFFFFF", gradient: null }, [
    panel,
    headline,
    ...(o.subline ? [text({
      x: detailX, y: detailY, width: detailW, height: H * 0.16,
      text: o.subline, fontFamily: "Work Sans", fontWeight: "700", fontSizePt: k * 2.2,
      color: "#121110", align: vertical ? "center" : "left",
    })] : []),
    shape({ x: detailX, y: detailY + H * 0.19, width: detailW * 0.3, height: H * 0.01, shape: "divider", fill: accent }),
    ...(o.cta ? [text({
      x: detailX, y: detailY + H * 0.24, width: detailW, height: H * 0.1,
      text: o.cta, fontFamily: "Work Sans", fontWeight: "600", fontSizePt: k * 1.6,
      color: "#575757", align: vertical ? "center" : "left",
    })] : []),
  ]);
};

const LAYOUTS: { name: string; style: string; fn: Layout }[] = [
  { name: "centred", style: "bold", fn: centredStack },
  { name: "panel", style: "modern", fn: sidePanel },
];

export function generateBannerOccasionTemplates(): CardTemplate[] {
  const templates: CardTemplate[] = [];

  for (const occasion of BANNER_OCCASIONS) {
    for (const format of FORMATS) {
      for (const layout of LAYOUTS) {
        const slug = `banner-${occasion.key}-${format.key}-${layout.name}`;
        templates.push({
          schemaVersion: 1,
          id: slug,
          slug,
          title: `${occasion.label}: ${format.orientation === "portrait" ? "Vertical" : "Horizontal"} ${layout.name === "centred" ? "Centred" : "Panel"}`,
          description: `A ${layout.style} ${format.orientation} banner for ${occasion.label.toLowerCase()}.`,
          /*
           * The occasion group is stored in `industry`.
           *
           * The gallery's filter reads that column, so putting the group there makes "Events" and
           * "Directional" appear as filters without a schema change. It is a slight abuse of the
           * name, and the alternative - a migration plus a second filter - buys nothing a customer
           * would notice.
           */
          industry: occasion.group.toLowerCase().replace(/\s+/g, "-"),
          style: layout.style,
          tags: [layout.style, occasion.key, occasion.group.toLowerCase(), format.orientation, "banner"],
          orientation: format.orientation,
          palette: [...occasion.palette],
          fontFamilies: ["Anton", "Work Sans"],
          thumbnailFront: null,
          thumbnailBack: null,
          front: layout.fn(occasion, format.widthIn, format.heightIn),
          back: blankBack(format.widthIn, format.heightIn),
        });
      }
    }
  }

  return templates;
}

export const BANNER_OCCASION_COUNT_EXPECTED =
  BANNER_OCCASIONS.length * FORMATS.length * LAYOUTS.length;
