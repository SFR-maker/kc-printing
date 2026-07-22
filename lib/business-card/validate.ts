import type { CardElement, CardSide } from "./schema";
import { MIN_FONT_SIZE_PT, MIN_PRINT_DPI, RECOMMENDED_DPI, effectiveImageDpi } from "./print-spec";

export interface DesignWarning {
  elementId: string | null;
  severity: "error" | "warning";
  code: string;
  message: string;
}

function elementBounds(el: CardElement) {
  return { left: el.x, top: el.y, right: el.x + el.width, bottom: el.y + el.height };
}

/** Relative luminance contrast ratio per WCAG, used for QR foreground/background checks. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lum = (hex: string) => {
    const c = hex.replace("#", "");
    const full = c.length === 3 ? c.split("").map((ch) => ch + ch).join("") : c;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    const chan = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
  };
  const [l1, l2] = [lum(hexA), lum(hexB)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

export function isTextTooSmall(fontSizePt: number): boolean {
  return fontSizePt < MIN_FONT_SIZE_PT;
}

export function isOutsideSafeZone(el: CardElement, side: CardSide): boolean {
  const b = elementBounds(el);
  const inset = side.safeZoneInsetIn;
  const w = side.physicalWidthIn;
  const h = side.physicalHeightIn;
  return b.left < inset || b.top < inset || b.right > w - inset || b.bottom > h - inset;
}

export function isClippedOutOfBleed(el: CardElement, side: CardSide): boolean {
  const b = elementBounds(el);
  return b.right < 0 || b.bottom < 0 || b.left > side.physicalWidthIn || b.top > side.physicalHeightIn;
}

export function imageEffectiveDpi(naturalWidthPx: number, renderedWidthIn: number): number {
  return effectiveImageDpi(naturalWidthPx, renderedWidthIn);
}

export function validateSide(side: CardSide, label: "front" | "back"): DesignWarning[] {
  const warnings: DesignWarning[] = [];

  for (const el of side.elements) {
    if (!el.visible) continue;

    if (isClippedOutOfBleed(el, side)) {
      warnings.push({ elementId: el.id, severity: "warning", code: "clipped", message: `An element on the ${label} is positioned entirely outside the printable area.` });
    }

    if (el.type === "text" || el.type === "qr" || el.type === "image") {
      if (isOutsideSafeZone(el, side)) {
        warnings.push({ elementId: el.id, severity: "warning", code: "unsafe-zone", message: `An element on the ${label} extends past the safe zone and may be trimmed.` });
      }
    }

    if (el.type === "text") {
      if (isTextTooSmall(el.fontSizePt)) {
        warnings.push({ elementId: el.id, severity: "warning", code: "small-text", message: `Text "${el.text.slice(0, 24)}" on the ${label} is smaller than ${MIN_FONT_SIZE_PT}pt and may be hard to read when printed.` });
      }
      if (!el.text.trim()) {
        warnings.push({ elementId: el.id, severity: "error", code: "empty-text", message: `A text box on the ${label} is empty.` });
      }
    }

    if (el.type === "image") {
      const dpi = imageEffectiveDpi(el.naturalWidthPx, el.width);
      if (dpi < MIN_PRINT_DPI) {
        warnings.push({ elementId: el.id, severity: "error", code: "low-dpi", message: `An image on the ${label} is only about ${Math.round(dpi)} DPI at its current size. Use a higher-resolution image or make it smaller.` });
      } else if (dpi < RECOMMENDED_DPI) {
        warnings.push({ elementId: el.id, severity: "warning", code: "low-dpi", message: `An image on the ${label} is about ${Math.round(dpi)} DPI, below the recommended ${RECOMMENDED_DPI} DPI for crisp printing.` });
      }
    }

    if (el.type === "qr") {
      const ratio = contrastRatio(el.foreground, el.background);
      if (ratio < 3) {
        warnings.push({ elementId: el.id, severity: "error", code: "qr-contrast", message: `The QR code on the ${label} has low contrast (${ratio.toFixed(1)}:1) and is unlikely to scan reliably.` });
      }
      const minInches = 0.8;
      if (el.width < minInches || el.height < minInches) {
        warnings.push({ elementId: el.id, severity: "warning", code: "qr-small", message: `The QR code on the ${label} is smaller than ${minInches} in and may not scan reliably from a distance.` });
      }
      if (!el.value.trim()) {
        warnings.push({ elementId: el.id, severity: "error", code: "qr-empty", message: `The QR code on the ${label} has no value set.` });
      }
    }
  }

  // overlap detection (bounding-box based, informational only)
  const visible = side.elements.filter((e) => e.visible);
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      if (boundsOverlapArea(visible[i], visible[j]) > 0.6) {
        warnings.push({
          elementId: visible[i].id,
          severity: "warning",
          code: "overlap",
          message: `Two elements on the ${label} overlap heavily and may be hiding each other.`,
        });
      }
    }
  }

  return warnings;
}

function boundsOverlapArea(a: CardElement, b: CardElement): number {
  const ab = elementBounds(a);
  const bb = elementBounds(b);
  const ix = Math.max(0, Math.min(ab.right, bb.right) - Math.max(ab.left, bb.left));
  const iy = Math.max(0, Math.min(ab.bottom, bb.bottom) - Math.max(ab.top, bb.top));
  const intersection = ix * iy;
  const smaller = Math.min(a.width * a.height, b.width * b.height);
  return smaller > 0 ? intersection / smaller : 0;
}

export function validateDesign(front: CardSide, back: CardSide): DesignWarning[] {
  return [...validateSide(front, "front"), ...validateSide(back, "back")];
}
