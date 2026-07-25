import { describe, it, expect } from "vitest";
import { computeSnap, computeGridSnap } from "@/lib/business-card/snapping";

describe("computeSnap", () => {
  const CANVAS_W = 3.75;
  const CANVAS_H = 2.25;

  it("snaps to the canvas horizontal center", () => {
    // Center of this box (1.87) is close to canvas center (1.875); its edges (1.77/1.97) are not,
    // so only the center-to-center snap should be eligible — avoids an ambiguous tie.
    const moving = { x: 1.77, y: 1, width: 0.2, height: 0.1 };
    const result = computeSnap(moving, CANVAS_W, CANVAS_H, []);
    expect(result.dx).toBeCloseTo(CANVAS_W / 2 - (moving.x + moving.width / 2), 5);
    expect(result.guides.some((g) => g.orientation === "v" && Math.abs(g.pos - CANVAS_W / 2) < 1e-6)).toBe(true);
  });

  it("snaps to canvas left/top edges", () => {
    const moving = { x: 0.02, y: 0.02, width: 0.5, height: 0.3 };
    const result = computeSnap(moving, CANVAS_W, CANVAS_H, []);
    expect(result.dx).toBeCloseTo(-0.02, 5);
    expect(result.dy).toBeCloseTo(-0.02, 5);
  });

  it("snaps to another element's edge", () => {
    const other = { x: 1, y: 1, width: 0.5, height: 0.5 };
    const moving = { x: 1.51, y: 0.3, width: 0.3, height: 0.3 };
    const result = computeSnap(moving, CANVAS_W, CANVAS_H, [other]);
    // moving's left edge (1.51) should snap to other's right edge (1.5)
    expect(result.dx).toBeCloseTo(-0.01, 5);
  });

  it("snaps to another element's center", () => {
    const other = { x: 1, y: 1, width: 1, height: 0.2 }; // centerX = 1.5
    const moving = { x: 1.24, y: 0.1, width: 0.5, height: 0.2 }; // centerX = 1.49
    const result = computeSnap(moving, CANVAS_W, CANVAS_H, [other]);
    expect(result.dx).toBeCloseTo(0.01, 5);
  });

  it("does not snap when nothing is within threshold", () => {
    const moving = { x: 1.2, y: 0.7, width: 0.3, height: 0.2 };
    const result = computeSnap(moving, CANVAS_W, CANVAS_H, []);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
    expect(result.guides).toHaveLength(0);
  });

  it("picks the closest target when multiple are within threshold", () => {
    // canvas center is 1.875; place moving's center just barely closer to a decoy 0.01in away
    const other = { x: 1.865, y: 5, width: 0, height: 0 };
    const moving = { x: 1.865, y: 0, width: 0, height: 0 }; // centerX = 1.865, closer to `other` (0) than canvas center (0.01)
    const result = computeSnap(moving, CANVAS_W, CANVAS_H, [other]);
    expect(result.dx).toBe(0);
  });
});

describe("computeGridSnap", () => {
  it("snaps to the nearest grid line within threshold", () => {
    const result = computeGridSnap({ x: 0.51, y: 0.99, width: 0.2, height: 0.2 }, 0.25);
    expect(result.dx).toBeCloseTo(-0.01, 5);
    expect(result.dy).toBeCloseTo(0.01, 5);
  });

  it("does not snap when outside threshold", () => {
    const result = computeGridSnap({ x: 0.6, y: 0.6, width: 0.2, height: 0.2 }, 0.25);
    expect(result.dx).toBe(0);
    expect(result.dy).toBe(0);
  });
});
