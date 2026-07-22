import type { CardElement, TextElement, ShapeElement, ImageElement, QrElement } from "./schema";
import { ShapeKindSchema } from "./schema";
import type { z } from "zod";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nextZIndex(elements: CardElement[]): number {
  return elements.length === 0 ? 0 : Math.max(...elements.map((e) => e.zIndex)) + 1;
}

export function createTextElement(overrides: Partial<TextElement> = {}, existing: CardElement[] = []): TextElement {
  return {
    id: newId("text"),
    type: "text",
    x: 0.4,
    y: 0.4,
    width: 2,
    height: 0.3,
    rotation: 0,
    zIndex: nextZIndex(existing),
    opacity: 1,
    locked: false,
    visible: true,
    text: "Your text here",
    fontFamily: "Inter",
    fontSizePt: 14,
    fontWeight: "400",
    italic: false,
    underline: false,
    textTransform: "none",
    align: "left",
    lineHeight: 1.2,
    letterSpacing: 0,
    color: "#111111",
    backgroundColor: null,
    ...overrides,
  };
}

export function createShapeElement(shape: z.infer<typeof ShapeKindSchema>, overrides: Partial<ShapeElement> = {}, existing: CardElement[] = []): ShapeElement {
  return {
    id: newId("shape"),
    type: "shape",
    x: 0.6,
    y: 0.6,
    width: shape === "line" || shape === "divider" ? 1.5 : 1,
    height: shape === "line" || shape === "divider" ? 0.02 : 1,
    rotation: 0,
    zIndex: nextZIndex(existing),
    opacity: 1,
    locked: false,
    visible: true,
    shape,
    fill: "#0A6E63",
    stroke: null,
    strokeWidthPx: 0,
    cornerRadiusIn: shape === "rect" ? 0.05 : 0,
    gradient: null,
    ...overrides,
  };
}

export function createImageElement(overrides: Partial<ImageElement> & Pick<ImageElement, "src" | "naturalWidthPx" | "naturalHeightPx">, existing: CardElement[] = []): ImageElement {
  const aspect = overrides.naturalWidthPx / overrides.naturalHeightPx;
  const width = 1.2;
  return {
    id: newId("image"),
    type: "image",
    x: 0.5,
    y: 0.5,
    width,
    height: width / aspect,
    rotation: 0,
    zIndex: nextZIndex(existing),
    opacity: 1,
    locked: false,
    visible: true,
    crop: null,
    borderWidthPx: 0,
    borderColor: "#000000",
    cornerRadiusIn: 0,
    ...overrides,
  };
}

/** Full-bleed background image (pattern or uploaded photo) — locked and sent behind everything else,
 * since the schema's background field only supports solid/gradient. Reuses the existing image
 * pipeline instead of adding an "image" background type, so export/upload/validation all just work. */
export function createBackgroundImageElement(overrides: Partial<ImageElement> & Pick<ImageElement, "src" | "naturalWidthPx" | "naturalHeightPx">, existing: CardElement[] = []): ImageElement {
  const backmost = existing.length === 0 ? 0 : Math.min(...existing.map((e) => e.zIndex));
  return {
    id: newId("bg-image"),
    type: "image",
    x: 0,
    y: 0,
    width: 3.75,
    height: 2.25,
    rotation: 0,
    zIndex: backmost - 1,
    opacity: 1,
    locked: true,
    visible: true,
    crop: null,
    borderWidthPx: 0,
    borderColor: "#000000",
    cornerRadiusIn: 0,
    ...overrides,
  };
}

export function createQrElement(overrides: Partial<QrElement> = {}, existing: CardElement[] = []): QrElement {
  return {
    id: newId("qr"),
    type: "qr",
    x: 2.6,
    y: 0.6,
    width: 0.8,
    height: 0.8,
    rotation: 0,
    zIndex: nextZIndex(existing),
    opacity: 1,
    locked: false,
    visible: true,
    payloadType: "url",
    value: "",
    foreground: "#111111",
    background: "#FFFFFF",
    errorCorrection: "M",
    ...overrides,
  };
}
