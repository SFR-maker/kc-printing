export const SIGN_SHAPES = ["rectangle", "rounded-square", "circle", "star", "arrow", "house"] as const;
export type SignShape = (typeof SIGN_SHAPES)[number];

/**
 * SVG path `d` string clipping a side's full width x height (inches) to the given shape. Used to
 * turn a normal rectangular design into a genuinely die-cut-shaped export/thumbnail (see
 * render-svg.ts) without the live Konva editor needing to clip its canvas to match — the customer
 * designs on a familiar rectangle, and the shape is applied at render time.
 */
export function shapeClipPath(shape: SignShape, w: number, h: number): string | null {
  switch (shape) {
    case "rectangle":
      return null;
    case "rounded-square": {
      const r = Math.min(w, h) * 0.08;
      return roundedRectPath(0, 0, w, h, r);
    }
    case "circle": {
      const cx = w / 2, cy = h / 2, rx = w / 2, ry = h / 2;
      return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
    }
    case "star":
      return starPath(w, h, 5, 0.45);
    case "arrow":
      return arrowPath(w, h);
    case "house":
      return housePath(w, h);
  }
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} V ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

function starPath(w: number, h: number, points: number, innerRatio: number): string {
  const cx = w / 2, cy = h / 2;
  const outerRx = w / 2, outerRy = h / 2;
  const innerRx = outerRx * innerRatio, innerRy = outerRy * innerRatio;
  const step = Math.PI / points;
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = -Math.PI / 2 + i * step;
    const rx = i % 2 === 0 ? outerRx : innerRx;
    const ry = i % 2 === 0 ? outerRy : innerRy;
    coords.push(`${cx + rx * Math.cos(angle)} ${cy + ry * Math.sin(angle)}`);
  }
  return `M ${coords[0]} L ${coords.slice(1).join(" L ")} Z`;
}

/** Rightward-pointing arrow, tail on the left, point on the right. */
function arrowPath(w: number, h: number): string {
  const shaftTop = h * 0.28, shaftBottom = h * 0.72, headStart = w * 0.62;
  return `M 0 ${shaftTop} L ${headStart} ${shaftTop} L ${headStart} 0 L ${w} ${h / 2} L ${headStart} ${h} L ${headStart} ${shaftBottom} L 0 ${shaftBottom} Z`;
}

/** Simple pentagon "house" outline — square body with a triangular roof. */
function housePath(w: number, h: number): string {
  const roofH = h * 0.38;
  return `M ${w / 2} 0 L ${w} ${roofH} L ${w} ${h} L 0 ${h} L 0 ${roofH} Z`;
}
