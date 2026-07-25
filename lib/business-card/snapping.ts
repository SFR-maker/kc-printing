export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Guide {
  orientation: "v" | "h";
  /** Position along the perpendicular axis, in the same units as the boxes (inches). */
  pos: number;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: Guide[];
}

/** In card-design inches — tuned so it feels tight at typical editor zoom levels without the
 * default 0.25in grid squares confusingly disabling nearby object/canvas snaps. */
const DEFAULT_THRESHOLD_IN = 0.035;

/**
 * Finds the best horizontal and vertical snap for a moving box's edges/center against the canvas
 * (edges + center) and a set of other elements' edges/centers, independently per axis. Returns the
 * (dx, dy) adjustment to apply to the moving box's position and which guide lines to draw.
 */
export function computeSnap(movingBox: Box, canvasWidth: number, canvasHeight: number, otherBoxes: Box[], threshold = DEFAULT_THRESHOLD_IN): SnapResult {
  const targetsX = [0, canvasWidth / 2, canvasWidth];
  const targetsY = [0, canvasHeight / 2, canvasHeight];
  for (const b of otherBoxes) {
    targetsX.push(b.x, b.x + b.width / 2, b.x + b.width);
    targetsY.push(b.y, b.y + b.height / 2, b.y + b.height);
  }

  const movingXs = [movingBox.x, movingBox.x + movingBox.width / 2, movingBox.x + movingBox.width];
  const movingYs = [movingBox.y, movingBox.y + movingBox.height / 2, movingBox.y + movingBox.height];

  let bestDx = 0;
  let bestDxAbs = threshold;
  let guideX: number | null = null;
  for (const mx of movingXs) {
    for (const t of targetsX) {
      const diff = t - mx;
      if (Math.abs(diff) < bestDxAbs) {
        bestDxAbs = Math.abs(diff);
        bestDx = diff;
        guideX = t;
      }
    }
  }

  let bestDy = 0;
  let bestDyAbs = threshold;
  let guideY: number | null = null;
  for (const my of movingYs) {
    for (const t of targetsY) {
      const diff = t - my;
      if (Math.abs(diff) < bestDyAbs) {
        bestDyAbs = Math.abs(diff);
        bestDy = diff;
        guideY = t;
      }
    }
  }

  const guides: Guide[] = [];
  if (guideX !== null) guides.push({ orientation: "v", pos: guideX });
  if (guideY !== null) guides.push({ orientation: "h", pos: guideY });

  return { dx: bestDx, dy: bestDy, guides };
}

/** Snaps a box's position to the nearest grid line on each axis independently, within threshold. */
export function computeGridSnap(movingBox: Box, gridSizeIn: number, threshold = DEFAULT_THRESHOLD_IN): { dx: number; dy: number } {
  const nearestX = Math.round(movingBox.x / gridSizeIn) * gridSizeIn;
  const nearestY = Math.round(movingBox.y / gridSizeIn) * gridSizeIn;
  const dx = Math.abs(nearestX - movingBox.x) < threshold ? nearestX - movingBox.x : 0;
  const dy = Math.abs(nearestY - movingBox.y) < threshold ? nearestY - movingBox.y : 0;
  return { dx, dy };
}
