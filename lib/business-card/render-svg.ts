import type { CardElement, CardSide, ImageElement, QrElement, ShapeElement, TextElement } from "./schema";
import { buildQrModuleMatrix, QUIET_ZONE_MODULES } from "./qr";

/**
 * Renders a CardSide to an SVG string. The viewBox is always "0 0 W H" in
 * inches (physicalWidthIn/physicalHeightIn), so every element's inch-based
 * x/y/width/height maps 1:1 to SVG user units regardless of output size.
 *
 * The outer width/height are emitted as raw pixel numbers (no unit suffix)
 * equal to inches * targetDpi. This is deliberate: sharp/librsvg rescales
 * *any* declared width (px or absolute-unit) by density/72 when a `density`
 * option is passed, so mixing absolute units with `density` silently
 * double-scales output. Baking the target DPI into the pixel width instead
 * and rasterizing with sharp's default (no density option) gives an exact,
 * predictable pixel size — verified against BLEED_PX_WIDTH/HEIGHT in tests.
 *
 * This is the single source of truth used for raster (PNG via sharp) and
 * vector (PDF via svg-to-pdfkit, which rescales via its own width/height
 * option using the same viewBox) export, and for template thumbnails.
 */
export function renderSideToSvg(side: CardSide, targetDpi: number = 300): string {
  const w = side.physicalWidthIn;
  const h = side.physicalHeightIn;
  const pxW = Math.round(w * targetDpi);
  const pxH = Math.round(h * targetDpi);
  const sorted = [...side.elements].filter((e) => e.visible).sort((a, b) => a.zIndex - b.zIndex);

  const bg =
    side.background.type === "gradient" && side.background.gradient
      ? `<defs><linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(${side.background.gradient.angle} 0.5 0.5)"><stop offset="0%" stop-color="${esc(side.background.gradient.from)}"/><stop offset="100%" stop-color="${esc(side.background.gradient.to)}"/></linearGradient></defs><rect x="0" y="0" width="${w}" height="${h}" fill="url(#bg-grad)"/>`
      : `<rect x="0" y="0" width="${w}" height="${h}" fill="${esc(side.background.color)}"/>`;

  const body = sorted.map(renderElement).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" viewBox="0 0 ${w} ${h}">${bg}${body}</svg>`;
}

function renderElement(el: CardElement): string {
  const transform = el.rotation ? ` transform="rotate(${el.rotation} ${el.x + el.width / 2} ${el.y + el.height / 2})"` : "";
  const group = `<g opacity="${el.opacity}"${transform}>%CONTENT%</g>`;
  switch (el.type) {
    case "text":
      return group.replace("%CONTENT%", renderText(el));
    case "image":
      return group.replace("%CONTENT%", renderImage(el));
    case "shape":
      return group.replace("%CONTENT%", renderShape(el));
    case "qr":
      return group.replace("%CONTENT%", renderQr(el));
    default:
      return "";
  }
}

function renderText(el: TextElement): string {
  const fontSizeIn = el.fontSizePt / 72;
  const lineHeightIn = fontSizeIn * el.lineHeight;
  const anchor = el.align === "center" ? "middle" : el.align === "right" ? "end" : "start";
  const anchorX = el.align === "center" ? el.x + el.width / 2 : el.align === "right" ? el.x + el.width : el.x;
  const text = el.textTransform === "uppercase" ? el.text.toUpperCase() : el.textTransform === "lowercase" ? el.text.toLowerCase() : el.text;
  const lines = text.split("\n");
  const bgRect = el.backgroundColor ? `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${esc(el.backgroundColor)}"/>` : "";
  const decoration = el.underline ? ' text-decoration="underline"' : "";
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${anchorX}" y="${el.y + fontSizeIn * 0.9 + lineHeightIn * i}">${esc(line)}</tspan>`
    )
    .join("");
  return `${bgRect}<text font-family="${esc(el.fontFamily)}" font-size="${fontSizeIn}" font-weight="${el.fontWeight}" font-style="${el.italic ? "italic" : "normal"}" letter-spacing="${el.letterSpacing / 72}" fill="${esc(el.color)}" text-anchor="${anchor}"${decoration}>${tspans}</text>`;
}

function renderImage(el: ImageElement): string {
  const rx = el.cornerRadiusIn;
  const clipId = `clip-${el.id}`;
  const clip = rx > 0 ? `<clipPath id="${clipId}"><rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}"/></clipPath>` : "";
  const clipAttr = rx > 0 ? ` clip-path="url(#${clipId})"` : "";
  const border = el.borderWidthPx > 0 ? `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" fill="none" stroke="${esc(el.borderColor)}" stroke-width="${el.borderWidthPx / 300}"/>` : "";
  return `${clip}<image x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" href="${esc(el.src)}" preserveAspectRatio="xMidYMid slice"${clipAttr}/>${border}`;
}

function renderShape(el: ShapeElement): string {
  const fill = el.gradient ? `url(#grad-${el.id})` : el.fill ?? "none";
  const gradDef = el.gradient
    ? `<defs><linearGradient id="grad-${el.id}" x1="0%" y1="0%" x2="100%" y2="0%" gradientTransform="rotate(${el.gradient.angle} 0.5 0.5)"><stop offset="0%" stop-color="${esc(el.gradient.from)}"/><stop offset="100%" stop-color="${esc(el.gradient.to)}"/></linearGradient></defs>`
    : "";
  const strokeAttrs = el.stroke ? ` stroke="${esc(el.stroke)}" stroke-width="${el.strokeWidthPx / 300}"` : "";

  if (el.shape === "ellipse") {
    return `${gradDef}<ellipse cx="${el.x + el.width / 2}" cy="${el.y + el.height / 2}" rx="${el.width / 2}" ry="${el.height / 2}" fill="${fill}"${strokeAttrs}/>`;
  }
  if (el.shape === "line" || el.shape === "divider") {
    const y = el.y + el.height / 2;
    return `<line x1="${el.x}" y1="${y}" x2="${el.x + el.width}" y2="${y}" stroke="${esc(el.stroke ?? el.fill ?? "#000000")}" stroke-width="${Math.max(el.strokeWidthPx, 1) / 300}"/>`;
  }
  return `${gradDef}<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${el.cornerRadiusIn}" fill="${fill}"${strokeAttrs}/>`;
}

function renderQr(el: QrElement): string {
  if (!el.value.trim()) return "";
  const { size, modules } = buildQrModuleMatrix(el.value, el.errorCorrection);
  const totalModules = size + QUIET_ZONE_MODULES * 2;
  const moduleSize = Math.min(el.width, el.height) / totalModules;
  const offsetX = el.x + (el.width - moduleSize * totalModules) / 2 + moduleSize * QUIET_ZONE_MODULES;
  const offsetY = el.y + (el.height - moduleSize * totalModules) / 2 + moduleSize * QUIET_ZONE_MODULES;

  let rects = `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" fill="${esc(el.background)}"/>`;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules[row][col]) {
        rects += `<rect x="${offsetX + col * moduleSize}" y="${offsetY + row * moduleSize}" width="${moduleSize * 1.02}" height="${moduleSize * 1.02}" fill="${esc(el.foreground)}"/>`;
      }
    }
  }
  return rects;
}

function esc(value: string): string {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c] as string));
}

/** Fetches remote image URLs and inlines them as base64 data URIs so server-side rasterizers (sharp/pdfkit) don't need network access. */
export async function resolveSideImages(side: CardSide): Promise<CardSide> {
  const elements = await Promise.all(
    side.elements.map(async (el): Promise<CardElement> => {
      if (el.type !== "image" || el.src.startsWith("data:")) return el;
      try {
        const res = await fetch(el.src);
        if (!res.ok) return el;
        const buf = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") ?? "image/png";
        return { ...el, src: `data:${contentType};base64,${buf.toString("base64")}` };
      } catch {
        return el;
      }
    })
  );
  return { ...side, elements };
}
