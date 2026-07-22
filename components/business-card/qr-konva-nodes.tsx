"use client";

import { Fragment } from "react";
import { Rect } from "react-konva";
import { buildQrModuleMatrix, QUIET_ZONE_MODULES } from "@/lib/business-card/qr";
import type { QrElement } from "@/lib/business-card/schema";

/** Renders the same vector module grid as lib/business-card/render-svg.ts's renderQr, so the on-screen
 * editor and the exported PDF/PNG show an identical QR code (same module positions, same quiet zone). */
export function QrKonvaNodes({ el }: { el: QrElement }) {
  if (!el.value.trim()) {
    return <Rect x={0} y={0} width={el.width} height={el.height} fill="#F3F4F6" stroke="#D1D5DB" strokeWidth={0.01} dash={[0.03, 0.03]} />;
  }

  const { size, modules } = buildQrModuleMatrix(el.value, el.errorCorrection);
  const totalModules = size + QUIET_ZONE_MODULES * 2;
  const moduleSize = Math.min(el.width, el.height) / totalModules;
  const offsetX = (el.width - moduleSize * totalModules) / 2 + moduleSize * QUIET_ZONE_MODULES;
  const offsetY = (el.height - moduleSize * totalModules) / 2 + moduleSize * QUIET_ZONE_MODULES;

  return (
    <Fragment>
      <Rect x={0} y={0} width={el.width} height={el.height} fill={el.background} />
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
