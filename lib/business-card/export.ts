import sharp from "sharp";
import path from "path";
import { renderSideToSvg } from "./render-svg";
import { resolveSideImages } from "./resolve-images-server";
import { DPI } from "./print-spec";
import { EDITOR_FONTS } from "./fonts";
import type { CardSide } from "./schema";

// libvips' internal operation cache has been observed to serve stale/blank output for later calls
// in a long run of sequential sharp() renders within one process (e.g. bulk template thumbnail
// generation) — disabling it trades a little throughput for correctness across large batches.
sharp.cache(false);

// svg-to-pdfkit and pdfkit have no first-party ESM types; both are widely used, stable CJS packages.
// Next.js/Turbopack's CJS interop can wrap the module in a `{ default }` shape depending on the
// bundling target (API route vs. plain Node/vitest), so resolve either form defensively.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfkitModule = require("pdfkit");
const PDFDocument = (pdfkitModule.default ?? pdfkitModule) as typeof import("pdfkit");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const svgToPdfModule = require("svg-to-pdfkit");
const SVGtoPDF = (svgToPdfModule.default ?? svgToPdfModule) as (doc: unknown, svg: string, x: number, y: number, opts?: Record<string, unknown>) => void;

const POINTS_PER_INCH = 72;

/**
 * Registers every curated editor font with the pdfkit document under its exact family name, so
 * svg-to-pdfkit's internal `doc.font(familyName)` calls (driven by the `font-family` attribute on
 * each <text> in our rendered SVG) resolve to the real typeface instead of silently falling back to
 * Helvetica — keeping the exported PDF visually consistent with what the editor shows on screen.
 */
function registerEditorFonts(doc: InstanceType<typeof PDFDocument>): void {
  for (const font of EDITOR_FONTS) {
    try {
      doc.registerFont(font.family, path.join(process.cwd(), "lib/business-card/fonts-ttf", font.file));
    } catch {
      // Missing/corrupt font file — that text falls back to Helvetica rather than failing the export.
    }
  }
}

export interface RasterExportResult {
  buffer: Buffer;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

/** Rasterizes a card side to a 300 DPI PNG matching the side's own full-bleed physical dimensions. */
export async function exportSidePng(side: CardSide): Promise<RasterExportResult> {
  const resolved = await resolveSideImages(side);
  const svg = renderSideToSvg(resolved, DPI);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const meta = await sharp(buffer).metadata();
  return {
    buffer,
    widthPx: meta.width ?? Math.round(side.physicalWidthIn * DPI),
    heightPx: meta.height ?? Math.round(side.physicalHeightIn * DPI),
    dpi: DPI,
  };
}

export interface PdfExportResult {
  buffer: Buffer;
  widthPt: number;
  heightPt: number;
  pageCount: number;
}

/** Produces a two-page (front, back) print-ready PDF at each side's own full-bleed physical size,
 * in points, with vector text/shapes/QR. Front and back are sized independently in case a design
 * ever has mismatched side dimensions, though in practice both sides of one design always match. */
export async function exportCardPdf(front: CardSide, back: CardSide): Promise<PdfExportResult> {
  const [resolvedFront, resolvedBack] = await Promise.all([resolveSideImages(front), resolveSideImages(back)]);
  const frontSvg = renderSideToSvg(resolvedFront);
  const backSvg = renderSideToSvg(resolvedBack);

  const frontWidthPt = front.physicalWidthIn * POINTS_PER_INCH;
  const frontHeightPt = front.physicalHeightIn * POINTS_PER_INCH;
  const backWidthPt = back.physicalWidthIn * POINTS_PER_INCH;
  const backHeightPt = back.physicalHeightIn * POINTS_PER_INCH;

  const doc = new PDFDocument({ size: [frontWidthPt, frontHeightPt], margin: 0, autoFirstPage: false });
  registerEditorFonts(doc);
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const donePromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.addPage({ size: [frontWidthPt, frontHeightPt], margin: 0 });
  SVGtoPDF(doc, frontSvg, 0, 0, { width: frontWidthPt, height: frontHeightPt, assumePt: true });

  doc.addPage({ size: [backWidthPt, backHeightPt], margin: 0 });
  SVGtoPDF(doc, backSvg, 0, 0, { width: backWidthPt, height: backHeightPt, assumePt: true });

  doc.end();
  const buffer = await donePromise;

  return { buffer, widthPt: frontWidthPt, heightPt: frontHeightPt, pageCount: 2 };
}

/** Generates a small preview thumbnail (JPEG) used for template/design gallery cards. */
export async function exportSideThumbnail(side: CardSide, maxWidthPx = 480, maxHeightPx = maxWidthPx): Promise<Buffer> {
  const resolved = await resolveSideImages(side);
  // Bounded by both dimensions, not just width — a business card fits maxWidthPx comfortably at a
  // sensible height, but an 81in-tall roll-up banner at the same "just cap width" logic would come
  // out several thousand pixels tall (physically huge regardless of DPI). No DPI floor here since
  // this is a display thumbnail, not a print asset — sharpness only needs to hold up at gallery size.
  const thumbDpi = Math.min(maxWidthPx / side.physicalWidthIn, maxHeightPx / side.physicalHeightIn);
  const svg = renderSideToSvg(resolved, thumbDpi);
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}
