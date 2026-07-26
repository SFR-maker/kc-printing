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

export function buildCustomBusinessCard(info: CustomDesignInfo, imageSrc: string, naturalW: number, naturalH: number): { front: CardSide; back: CardSide } {
  const [p] = info.palette;
  const qrValue = info.includeQrCode ? qrValueFor(info) : null;
  // Two explicit lines rather than one long joined string — up to 4 contact fields (phone, email,
  // website, LinkedIn) reliably wraps a single line at this width, and a wrapped second line was
  // getting silently clipped by the text element's fixed height instead of showing.
  const contactLine1 = joinNonEmpty([info.phone, info.email], "  ·  ");
  const contactLine2 = joinNonEmpty([info.website, info.linkedin], "  ·  ");
  const front: CardSide = {
    physicalWidthIn: BC_W, physicalHeightIn: BC_H, bleedIn: 0.125, safeZoneInsetIn: 0.125, shapeMask: "rectangle",
    background: { type: "solid", color: "#FFFFFF", gradient: null },
    elements: [
      bgImage(imageSrc, naturalW, naturalH, BC_W, BC_H),
      shape({ x: 0, y: 1.15, width: BC_W, height: BC_H - 1.15, shape: "rect", fill: "#000000", opacity: 0.5 }),
      text({ x: 0.25, y: 1.24, width: 3.25, height: 0.28, text: info.businessName, fontFamily: info.headingFont, fontSizePt: 14, fontWeight: "700", color: "#FFFFFF" }),
      ...(info.tagline.trim() ? [text({ x: 0.25, y: 1.5, width: 3.25, height: 0.18, text: info.tagline, fontFamily: info.bodyFont, fontSizePt: 8.5, color: "#F2F2F2" })] : []),
      shape({ x: 0.25, y: 1.7, width: 0.45, height: 0.015, shape: "divider", fill: "#FFFFFF" }),
      // The QR tile sits in the top-right corner, well clear of this bottom strip, so these lines
      // don't need to make room for it — they only need their own width to fit.
      ...(contactLine1 ? [text({ x: 0.25, y: 1.78, width: 3.25, height: 0.16, text: contactLine1, fontFamily: info.bodyFont, fontSizePt: 6, color: "#F2F2F2" })] : []),
      ...(contactLine2 ? [text({ x: 0.25, y: 1.95, width: 3.25, height: 0.16, text: contactLine2, fontFamily: info.bodyFont, fontSizePt: 6, color: "#F2F2F2" })] : []),
      ...(qrValue ? qrOnWhite(3.75 - 0.62, 0.2, 0.5, qrValue) : []),
    ],
  };
  const back: CardSide = {
    physicalWidthIn: BC_W, physicalHeightIn: BC_H, bleedIn: 0.125, safeZoneInsetIn: 0.125, shapeMask: "rectangle",
    background: { type: "solid", color: p, gradient: null },
    elements: [
      text({ x: 0.3, y: BC_H / 2 - 0.18, width: BC_W - 0.6, height: 0.35, text: info.businessName, fontFamily: info.headingFont, fontSizePt: 15, fontWeight: "700", color: "#FFFFFF", align: "center" }),
    ],
  };
  return { front, back };
}

const PC_W = 6;
const PC_H = 4;

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
      ...(qrValue ? qrOnWhite(PC_W - 0.85, 0.25, 0.65, qrValue) : []),
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
