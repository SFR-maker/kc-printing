import { PRINT_SPEC } from "../print-spec";
import { rebleedSide } from "../rebleed";
import type { CardSide, TextElement, ShapeElement, ImageElement, QrElement } from "../schema";
import { contrastRatio } from "../validate";
import { buildQrValue } from "../qr";

export interface CustomDesignInfo {
  businessName: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  linkedin: string;
  address: string;
  palette: [string, string, string];
  headingFont: string;
  bodyFont: string;
  includeQrCode: boolean;
}

function readableInk(candidate: string): string {
  return contrastRatio(candidate, "#FFFFFF") >= 4.5 ? candidate : "#161616";
}

let counter = 0;
function id(prefix: string): string {
  counter += 1;
  return `custom-${prefix}-${counter}`;
}

function text(partial: Partial<TextElement> & Pick<TextElement, "x" | "y" | "width" | "height" | "text">): TextElement {
  return {
    id: id("text"), type: "text", rotation: 0, zIndex: 1, opacity: 1, locked: false, visible: true,
    fontFamily: "Inter", fontSizePt: 12, fontWeight: "400", italic: false, underline: false,
    textTransform: "none", align: "left", lineHeight: 1.15, letterSpacing: 0, color: "#111111", backgroundColor: null,
    ...partial,
  };
}

function shape(partial: Partial<ShapeElement> & Pick<ShapeElement, "x" | "y" | "width" | "height" | "shape">): ShapeElement {
  return {
    id: id("shape"), type: "shape", rotation: 0, zIndex: 0, opacity: 1, locked: false, visible: true,
    fill: "#000000", stroke: null, strokeWidthPx: 0, cornerRadiusIn: 0, gradient: null,
    ...partial,
  };
}

/** Contact fields besides phone are optional in the form — an empty TextElement trips the
 * "empty-text" print-blocking validation error, so every optional line must be built through this
 * (never rendered unconditionally) and joins of optional fields must drop blank parts. */
function joinNonEmpty(parts: string[], sep: string): string {
  return parts.map((p) => p.trim()).filter(Boolean).join(sep);
}

function bgImage(src: string, naturalWidthPx: number, naturalHeightPx: number, w: number, h: number): ImageElement {
  return {
    id: id("bg"), type: "image", x: 0, y: 0, width: w, height: h, rotation: 0, zIndex: -1,
    opacity: 1, locked: true, visible: true, src, naturalWidthPx, naturalHeightPx,
    crop: null, borderWidthPx: 0, borderColor: "#000000", cornerRadiusIn: 0,
  };
}

/** QR codes need a genuinely solid, high-contrast backdrop to scan reliably — unlike text, a
 * translucent panel over a busy AI image isn't safe, so this always sits on an opaque white tile. */
function qrOnWhite(x: number, y: number, size: number, value: string): [ShapeElement, QrElement] {
  const pad = size * 0.12;
  return [
    shape({ x: x - pad, y: y - pad, width: size + pad * 2, height: size + pad * 2, shape: "rect", fill: "#FFFFFF", opacity: 0.96, cornerRadiusIn: pad }),
    {
      id: id("qr"), type: "qr", x, y, width: size, height: size, rotation: 0, zIndex: 2,
      opacity: 1, locked: false, visible: true, payloadType: "url", value, foreground: "#111111", background: "#FFFFFF", errorCorrection: "M",
    },
  ];
}

/** Every custom builder leans on a translucent dark strip sized tightly around the text — not a big
 * panel — so most of the live-generated image stays visible. Text always renders in white/near-white
 * against that strip, since a freshly generated image's tone can't be pre-verified for contrast the
 * way the fixed archetype textures were. */
function qrValueFor(info: CustomDesignInfo): string | null {
  if (info.website.trim()) return buildQrValue("url", info.website).value;
  if (info.phone.trim() || info.email.trim()) {
    return buildQrValue("vcard", { name: info.businessName, org: info.businessName, phone: info.phone, email: info.email, website: info.website }).value;
  }
  return null;
}

const BC_W = 3.75;
const BC_H = 2.25;

/**
 * The box every piece of content has to stay inside, in this file's authored coordinates.
 *
 * These are not the same numbers as `safeZoneInsetIn`. Elements are authored on the 3.75 x 2.25
 * bleed canvas and then re-based onto the house 0.05in bleed by rebleedSide, which shifts everything
 * 0.075in toward the top-left. So a QR tile whose right edge sits at 3.69 here lands at 3.615 on a
 * 3.6in document - outside the sheet entirely - and a contact line ending at 2.11 lands past the
 * trim. Both shipped, and both are visible on a generated card as a QR clipped off the corner and a
 * website line sitting on the cut edge.
 *
 * Stating the safe box as constants, and asserting against it in tests, is what stops the next
 * hand-tuned literal from doing the same thing silently.
 */
const BC_SAFE = { left: 0.2, top: 0.2, right: 3.55, bottom: 2.05 } as const;

/**
 * QR size on a business card, and the padded tile it sits on.
 *
 * 0.8in is validateSide's own floor for a code that scans reliably. qrOnWhite pads the white tile
 * outward by 12% of the code on each side, so the tile is 1.24x the code - and it is the tile, not
 * the code, that has to clear the trim.
 */
const BC_QR_SIZE = 0.8;
const BC_QR_TILE = BC_QR_SIZE * 1.24;

/**
 * The scrim ramp on the card front, as [y, height, opacity].
 *
 * The last band runs to the bottom edge and carries the type; the four above it fade the photograph
 * into it. Opacity climbs in even ~0.09 steps, which is below the threshold at which the eye picks
 * out an individual edge over a photograph.
 */
const SCRIM_STEPS: [number, number, number][] = [
  [0.74, 0.09, 0.08],
  [0.83, 0.09, 0.17],
  [0.92, 0.09, 0.26],
  [1.01, 0.09, 0.36],
  [1.10, 0.08, 0.46],
  [1.18, BC_H - 1.18, 0.56],
];

export function buildCustomBusinessCard(info: CustomDesignInfo, imageSrc: string, naturalW: number, naturalH: number): { front: CardSide; back: CardSide } {
  const [p, s] = info.palette;
  const qrValue = info.includeQrCode ? qrValueFor(info) : null;
  // Two explicit lines rather than one long joined string — up to 4 contact fields (phone, email,
  // website, LinkedIn) reliably wraps a single line at this width, and a wrapped second line was
  // getting silently clipped by the text element's fixed height instead of showing.
  const contactLine1 = joinNonEmpty([info.phone, info.email], "  ·  ");
  const contactLine2 = joinNonEmpty([info.website, info.linkedin], "  ·  ");

  // A hairline in the brand colour reads as deliberate where a white rule reads as a default, but
  // only if it is actually visible against the scrim. Falls back to white when the brand colour is
  // too dark to separate from it.
  const accent = contrastRatio(s, "#1A1A1A") >= 2.2 ? s : "#FFFFFF";

  const L = 0.28;
  const W = BC_SAFE.right - L;

  const front: CardSide = {
    physicalWidthIn: BC_W, physicalHeightIn: BC_H, bleedIn: 0.125, safeZoneInsetIn: 0.125, shapeMask: "rectangle",
    background: { type: "solid", color: "#FFFFFF", gradient: null },
    elements: [
      bgImage(imageSrc, naturalW, naturalH, BC_W, BC_H),
      /*
       * A stepped scrim rather than one 50% block.
       *
       * The single hard-edged panel cut the photograph in half with a visible horizontal seam, which
       * is the cheapest-looking thing on the card - it reads as a caption bar pasted over a stock
       * image rather than as one composition. Ramping the opacity lets the image dissolve into the
       * type area instead.
       *
       * Stacked solid fills rather than an alpha gradient on purpose: gradient *stops* carry no
       * opacity in this schema, and an rgba stop colour is not something svg-to-pdfkit can be
       * trusted to rasterise the same way the browser does. Solid rects behave identically in the
       * Konva canvas, the SVG preview and the printed PDF, which is the property that matters.
       *
       * Five steps rather than three: at three the increments are large enough to read as banding
       * over a light or flat image, which trades one seam for two. At ~0.09 per step the ramp reads
       * as a fade.
       */
      ...SCRIM_STEPS.map(([y, height, opacity]) =>
        shape({ x: 0, y, width: BC_W, height, shape: "rect", fill: "#000000", opacity })),

      text({ x: L, y: 1.20, width: W, height: 0.30, text: info.businessName, fontFamily: info.headingFont, fontSizePt: 15, fontWeight: "700", color: "#FFFFFF", lineHeight: 1.05 }),
      // Uppercase and letterspaced. A tagline set the same way as the contact line competes with it;
      // tracked-out small caps sit clearly below the name in the hierarchy without needing more size.
      ...(info.tagline.trim()
        ? [text({ x: L, y: 1.51, width: W, height: 0.15, text: info.tagline, fontFamily: info.bodyFont, fontSizePt: 7, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.1, color: "#E8E8E8" })]
        : []),
      shape({ x: L, y: 1.70, width: 0.34, height: 0.018, shape: "divider", fill: accent }),
      // The QR tile sits in the top-right corner, well clear of this bottom block, so these lines
      // only need their own width to fit.
      ...(contactLine1 ? [text({ x: L, y: 1.76, width: W, height: 0.13, text: contactLine1, fontFamily: info.bodyFont, fontSizePt: 6.2, color: "#F2F2F2" })] : []),
      ...(contactLine2 ? [text({ x: L, y: 1.90, width: W, height: 0.13, text: contactLine2, fontFamily: info.bodyFont, fontSizePt: 6.2, color: "#F2F2F2" })] : []),
      // No QR on the front - it lives on the back now. See BC_QR_SIZE.
    ],
  };

  /*
   * The back was one centred line of text on a flat colour, which is what the back of a card looks
   * like when nobody designed it. It now carries the contact details and the QR code, so the card
   * works handed over either way up, and repeats the accent rule from the front so the two faces
   * read as a pair.
   */
  const backInk = contrastRatio(p, "#FFFFFF") >= 3 ? "#FFFFFF" : "#161616";
  const backAccent = backInk === "#FFFFFF" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.35)";

  // Text yields the right-hand column to the QR tile, so the two never collide.
  const bx = 0.35;
  const bw = qrValue ? 1.95 : BC_W - 0.7;
  const balign = qrValue ? "left" : "center";

  const back: CardSide = {
    physicalWidthIn: BC_W, physicalHeightIn: BC_H, bleedIn: 0.125, safeZoneInsetIn: 0.125, shapeMask: "rectangle",
    background: { type: "solid", color: p, gradient: null },
    elements: [
      text({ x: bx, y: 0.60, width: bw, height: 0.28, text: info.businessName, fontFamily: info.headingFont, fontSizePt: 14, fontWeight: "700", color: backInk, align: balign, lineHeight: 1.05 }),
      shape({ x: balign === "center" ? BC_W / 2 - 0.15 : bx, y: 0.92, width: 0.3, height: 0.016, shape: "divider", fill: backAccent }),
      ...(info.tagline.trim()
        ? [text({ x: bx, y: 1.00, width: bw, height: 0.14, text: info.tagline, fontFamily: info.bodyFont, fontSizePt: 6.5, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1.1, color: backInk, align: balign })]
        : []),
      // One field per line here rather than the front's joined pairs: the text column is half the
      // width when a QR is present, and a joined line silently overflows it.
      ...(info.phone.trim() ? [text({ x: bx, y: 1.20, width: bw, height: 0.12, text: info.phone, fontFamily: info.bodyFont, fontSizePt: 6, color: backInk, align: balign })] : []),
      ...(info.email.trim() ? [text({ x: bx, y: 1.33, width: bw, height: 0.12, text: info.email, fontFamily: info.bodyFont, fontSizePt: 6, color: backInk, align: balign })] : []),
      ...(info.website.trim() ? [text({ x: bx, y: 1.46, width: bw, height: 0.12, text: info.website, fontFamily: info.bodyFont, fontSizePt: 6, color: backInk, align: balign })] : []),
      /*
       * The QR moved here from the front, and grew from 0.5in to 0.8in doing it.
       *
       * 0.8in is the shop's own floor for a code that scans reliably (see validateSide's qr-small
       * rule), and the front cannot host one: the clear band above the scrim is 0.66in tall, so a
       * compliant code does not fit there at any position. The front QR was 0.5in - under the shop's
       * own threshold - *and* placed so its white tile ran off the trim, so it was both hard to scan
       * and partly cut off.
       *
       * A flat colour field is also a better backdrop for a code than a photograph, and keeping the
       * front free of a white tile is most of what makes the front look composed rather than stickered.
       */
      ...(qrValue ? qrOnWhite(BC_SAFE.right - 0.896, (BC_H - BC_QR_TILE) / 2 + 0.096, BC_QR_SIZE, qrValue) : []),
    ],
  };
  // Authored on the historical 3.75 x 2.25 / 0.125in-bleed canvas; re-based onto the house spec so
  // the hand-tuned literals above stay readable. See lib/business-card/rebleed.ts.
  return { front: rebleedSide(front, PRINT_SPEC.bleedIn), back: rebleedSide(back, PRINT_SPEC.bleedIn) };
}

const PC_W = 6;
const PC_H = 4;

/** Same scannable floor as the business card. See BC_QR_SIZE. */
const PC_QR_SIZE = 0.8;
const PC_QR_TILE = PC_QR_SIZE * 1.24;

export function buildCustomPostcard(info: CustomDesignInfo, imageSrc: string, naturalW: number, naturalH: number): { front: CardSide; back: CardSide } {
  const [p, , inkRaw] = info.palette;
  const ink = readableInk(inkRaw);
  const qrValue = info.includeQrCode ? qrValueFor(info) : null;
  const front: CardSide = {
    physicalWidthIn: PC_W, physicalHeightIn: PC_H, bleedIn: 0.125, safeZoneInsetIn: 0.125, shapeMask: "rectangle",
    background: { type: "solid", color: "#FFFFFF", gradient: null },
    elements: [
      bgImage(imageSrc, naturalW, naturalH, PC_W, PC_H),
      shape({ x: 0, y: 2.55, width: PC_W, height: PC_H - 2.55, shape: "rect", fill: "#000000", opacity: 0.5 }),
      text({ x: 0.35, y: 2.65, width: 5.3, height: 0.45, text: info.tagline.trim() || "Now Serving Your Neighborhood", fontFamily: info.headingFont, fontSizePt: 21, fontWeight: "800", color: "#FFFFFF" }),
      text({ x: 0.35, y: 3.08, width: 5.3, height: 0.3, text: info.businessName, fontFamily: info.bodyFont, fontSizePt: 13, fontWeight: "600", color: "#F2F2F2" }),
      shape({ x: 0.35, y: 3.45, width: 2.1, height: 0.4, shape: "rect", fill: "#FFFFFF", cornerRadiusIn: 0.06 }),
      text({ x: 0.35, y: 3.56, width: 2.1, height: 0.22, text: `Call ${info.phone}`, fontFamily: info.bodyFont, fontSizePt: 10, fontWeight: "700", color: ink, align: "center" }),
      // QR tile is top-right (y=0.25), clear of this bottom strip, so no width needs to be reserved for it.
      ...(info.website.trim() ? [text({ x: 2.65, y: 3.56, width: 3.0, height: 0.22, text: info.website, fontFamily: info.bodyFont, fontSizePt: 9, color: "#F2F2F2" })] : []),
      /*
       * Placed off the safe edge rather than the sheet edge, and sized to the same 0.8in floor the
       * business card uses.
       *
       * At PC_W - 0.85 the padded tile ended at 5.878 against a 5.875 safe limit - three thousandths
       * of an inch over, invisible in a preview and still a real trim risk on a guillotine. The code
       * was also 0.65in, under validateSide's own qr-small threshold. A 6 x 4in postcard has room
       * for a compliant one, unlike the business card front.
       */
      ...(qrValue ? qrOnWhite(PC_W - 0.125 - PC_QR_TILE + PC_QR_SIZE * 0.12, 0.3, PC_QR_SIZE, qrValue) : []),
    ],
  };
  const back: CardSide = {
    physicalWidthIn: PC_W, physicalHeightIn: PC_H, bleedIn: 0.125, safeZoneInsetIn: 0.125, shapeMask: "rectangle",
    background: { type: "solid", color: "#FFFFFF", gradient: null },
    elements: [
      text({ x: 0.35, y: 0.35, width: 2.6, height: 0.22, text: info.businessName, fontFamily: info.headingFont, fontSizePt: 10, fontWeight: "700", color: ink }),
      ...(info.address.trim() ? [text({ x: 0.35, y: 0.6, width: 2.6, height: 0.18, text: info.address, fontFamily: info.bodyFont, fontSizePt: 7, color: "#555555" })] : []),
      text({ x: 0.35, y: 0.8, width: 2.6, height: 0.18, text: joinNonEmpty([info.phone, info.website], "  ·  "), fontFamily: info.bodyFont, fontSizePt: 7, color: "#555555" }),
      shape({ x: PC_W / 2, y: 0.3, width: 0.01, height: PC_H - 0.6, shape: "divider", fill: "#E5E5E5" }),
      shape({ x: PC_W - 1.3, y: 0.3, width: 1, height: 1, shape: "rect", fill: null, stroke: p, strokeWidthPx: 1.5, cornerRadiusIn: 0.04 }),
      text({ x: PC_W - 1.3, y: 0.62, width: 1, height: 0.18, text: "STAMP", fontFamily: "Inter", fontSizePt: 7, color: p, align: "center", letterSpacing: 1 }),
    ],
  };
  return { front, back };
}

const ROLLUP_W = 33;
const ROLLUP_H = 81;
const VINYL_W = 96;
const VINYL_H = 48;

export type BannerFormat = "rollup" | "vinyl";

export function buildCustomBanner(info: CustomDesignInfo, imageSrc: string, naturalW: number, naturalH: number, format: BannerFormat): { front: CardSide; back: CardSide } {
  const qrValue = info.includeQrCode ? qrValueFor(info) : null;
  if (format === "rollup") {
    const front: CardSide = {
      physicalWidthIn: ROLLUP_W, physicalHeightIn: ROLLUP_H, bleedIn: 0.125, safeZoneInsetIn: 0.5, shapeMask: "rectangle",
      background: { type: "solid", color: "#FFFFFF", gradient: null },
      elements: [
        bgImage(imageSrc, naturalW, naturalH, ROLLUP_W, ROLLUP_H),
        shape({ x: 1, y: 22, width: ROLLUP_W - 2, height: 24, shape: "rect", fill: "#000000", opacity: 0.34, cornerRadiusIn: 0.4 }),
        text({ x: 2, y: 25, width: ROLLUP_W - 4, height: 12, text: info.businessName, fontFamily: info.headingFont, fontSizePt: 140, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1.05 }),
        ...(info.tagline.trim() ? [text({ x: 2, y: 40, width: ROLLUP_W - 4, height: 4, text: info.tagline, fontFamily: info.bodyFont, fontSizePt: 40, color: "#F2F2F2", align: "center" })] : []),
        shape({ x: 0, y: ROLLUP_H - 14, width: ROLLUP_W, height: 14, shape: "rect", fill: "#000000", opacity: 0.4 }),
        text({ x: 2, y: ROLLUP_H - 11.5, width: ROLLUP_W - 4, height: 3, text: info.phone, fontFamily: info.bodyFont, fontSizePt: 32, color: "#FFFFFF", align: "center" }),
        ...(info.website.trim() ? [text({ x: 2, y: ROLLUP_H - 6.5, width: ROLLUP_W - 4, height: 3, text: info.website, fontFamily: info.bodyFont, fontSizePt: 32, color: "#FFFFFF", align: "center" })] : []),
        ...(qrValue ? qrOnWhite(ROLLUP_W - 6, 3, 4.5, qrValue) : []),
      ],
    };
    return { front, back: blankBack(ROLLUP_W, ROLLUP_H) };
  }
  const front: CardSide = {
    physicalWidthIn: VINYL_W, physicalHeightIn: VINYL_H, bleedIn: 0.125, safeZoneInsetIn: 0.25, shapeMask: "rectangle",
    background: { type: "solid", color: "#FFFFFF", gradient: null },
    elements: [
      bgImage(imageSrc, naturalW, naturalH, VINYL_W, VINYL_H),
      shape({ x: 2, y: 5, width: VINYL_W - 4, height: 38, shape: "rect", fill: "#000000", opacity: 0.34, cornerRadiusIn: 1 }),
      text({ x: 3, y: 9, width: VINYL_W - 6, height: 12, text: info.tagline.trim() || info.businessName, fontFamily: info.headingFont, fontSizePt: 420, fontWeight: "800", color: "#FFFFFF", align: "center", lineHeight: 1 }),
      text({ x: 3, y: 27, width: VINYL_W - 6, height: 8, text: info.businessName, fontFamily: info.bodyFont, fontSizePt: 120, fontWeight: "600", color: "#F2F2F2", align: "center" }),
      text({ x: 3, y: 38, width: VINYL_W - 6, height: 6, text: joinNonEmpty([info.phone, info.website], "   •   "), fontFamily: info.bodyFont, fontSizePt: 55, color: "#FFFFFF", align: "center" }),
      ...(qrValue ? qrOnWhite(VINYL_W - 9, 6, 6, qrValue) : []),
    ],
  };
  return { front, back: blankBack(VINYL_W, VINYL_H) };
}

function blankBack(w: number, h: number): CardSide {
  return { physicalWidthIn: w, physicalHeightIn: h, bleedIn: 0.125, safeZoneInsetIn: 0.25, shapeMask: "rectangle", background: { type: "solid", color: "#FFFFFF", gradient: null }, elements: [] };
}

export const BANNER_DIMS: Record<BannerFormat, { w: number; h: number }> = {
  rollup: { w: ROLLUP_W, h: ROLLUP_H },
  vinyl: { w: VINYL_W, h: VINYL_H },
};
