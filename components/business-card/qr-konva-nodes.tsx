"use client";

import { Fragment } from "react";
import { Rect } from "react-konva";
import { buildQrModuleMatrix, QUIET_ZONE_MODULES } from "@/lib/business-card/qr";
import type { QrElement } from "@/lib/business-card/schema";

/** Renders the same vector module grid as lib/business-card/render-svg.ts's renderQr, so the on-screen
 * editor and the exported PDF/PNG show an identical QR code (same module positions, same quiet zone).
 * Takes widthPx/heightPx (already converted by the caller, like every other element type) rather than
 * el.width/el.height directly — those are in inches, and using them as raw Konva pixel dimensions
 * silently draws the whole code at a fraction-of-a-pixel size instead of throwing. */
export function QrKonvaNodes({ el, widthPx, heightPx }: { el: QrElement; widthPx: number; heightPx: number }) {
  if (!el.value.trim()) {
    return <Rect x={0} y={0} width={widthPx} height={heightPx} fill="#F3F4F6" stroke="#D1D5DB" strokeWidth={0.01} dash={[0.03, 0.03]} />;
  }

  const { size, modules } = buildQrModuleMatrix(el.value, el.errorCorrection);
  const totalModules = size + QUIET_ZONE_MODULES * 2;
  const moduleSize = Math.min(widthPx, heightPx) / totalModules;
  const offsetX = (widthPx - moduleSize * totalModules) / 2 + moduleSize * QUIET_ZONE_MODULES;
  const offsetY = (heightPx - moduleSize * totalModules) / 2 + moduleSize * QUIET_ZONE_MODULES;

  return (
    <Fragment>
      <Rect x={0} y={0} width={widthPx} height={heightPx} fill={el.background} />
      {modules.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <Rect
              key={`${r}-${c}`}
              x={offsetX + c * moduleSize}
              y={offsetY + r * moduleSize}
              width={moduleSize * 1.02}
              height={moduleSize * 1.02}
              fill={el.foreground}
            />
          ) : null
        )
      )}
    </Fragment>
  );
}
