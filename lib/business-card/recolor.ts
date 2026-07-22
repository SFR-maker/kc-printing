import type { CardSide, CardElement } from "./schema";

/** A handful of curated 3-color palettes offered as one-click swaps for any template, independent
 * of its original industry category — mirrors GotPrint's per-template color-variant swatches. */
export const VARIANT_PALETTES: string[][] = [
  ["#123C69", "#C9A24B", "#111111"],
  ["#0B6E4F", "#0A3D62", "#FFFFFF"],
  ["#7A1E1E", "#F2E8CF", "#1B1B1B"],
  ["#5B21B6", "#111827", "#F5F3FF"],
  ["#1B1B1B", "#D8CAB8", "#FFFFFF"],
  ["#D9531E", "#1B1B1B", "#F4F1EC"],
  ["#0F172A", "#94A3B8", "#F8FAFC"],
  ["#2D6A4F", "#95D5B2", "#1B1B1B"],
];

function remapColor(value: string | null | undefined, from: string[], to: string[]): string | null | undefined {
  if (!value) return value;
  const idx = from.findIndex((c) => c.toLowerCase() === value.toLowerCase());
  return idx === -1 ? value : to[idx];
}

function recolorElement(el: CardElement, from: string[], to: string[]): CardElement {
  switch (el.type) {
    case "text":
      return { ...el, color: remapColor(el.color, from, to) ?? el.color, backgroundColor: remapColor(el.backgroundColor, from, to) ?? null };
    case "shape":
      return { ...el, fill: remapColor(el.fill, from, to) ?? null, stroke: remapColor(el.stroke, from, to) ?? null };
    case "qr":
      return { ...el, foreground: remapColor(el.foreground, from, to) ?? el.foreground };
    case "image":
      return { ...el, borderColor: remapColor(el.borderColor, from, to) ?? el.borderColor };
    default:
      return el;
  }
}

/** Remaps every element's color fields that exactly match one of the original palette's 3 colors to
 * the corresponding color in the new palette — a lightweight recolor that doesn't need to touch the
 * layout, only swap the 1:1 color references a template was built from. */
export function recolorSide(side: CardSide, from: string[], to: string[]): CardSide {
  const background = side.background.type === "solid"
    ? { ...side.background, color: remapColor(side.background.color, from, to) ?? side.background.color }
    : side.background.gradient
      ? {
          ...side.background,
          gradient: {
            ...side.background.gradient,
            from: remapColor(side.background.gradient.from, from, to) ?? side.background.gradient.from,
            to: remapColor(side.background.gradient.to, from, to) ?? side.background.gradient.to,
          },
        }
      : side.background;

  return { ...side, background, elements: side.elements.map((el) => recolorElement(el, from, to)) };
}
