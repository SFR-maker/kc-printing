import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getIconComponent } from "./icon-library";

function iconToSvgDataUri(name: string, color: string, sizePx: number): string | null {
  const Icon = getIconComponent(name);
  if (!Icon) return null;
  const svg = renderToStaticMarkup(createElement(Icon, { size: sizePx, color, strokeWidth: 1.75 }));
  const encoded = window.btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Rasterizes a lucide icon to a PNG data URI (browser-only, via canvas). Icons must be raster for
 * export: svg-to-pdfkit (the PDF export path) silently fails to load SVG-in-SVG `<image>` sources —
 * verified directly against the library — while sharp/librsvg (the PNG export path) does support it.
 * Rasterizing once at insertion time keeps icons compatible with both export paths and with the
 * existing ImageElement pipeline (no new element type needed).
 */
export function iconToPngDataUri(name: string, color: string, sizePx = 512): Promise<{ dataUri: string; width: number; height: number } | null> {
  const svgUri = iconToSvgDataUri(name, color, sizePx);
  if (!svgUri) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = sizePx;
      canvas.height = sizePx;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, sizePx, sizePx);
      resolve({ dataUri: canvas.toDataURL("image/png"), width: sizePx, height: sizePx });
    };
    img.onerror = reject;
    img.src = svgUri;
  });
}
