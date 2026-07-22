import sharp from "sharp";
import path from "path";
import { renderSideToSvg, resolveSideImages } from "./render-svg";
import { BLEED_PX_HEIGHT, BLEED_PX_WIDTH, BLEED_HEIGHT_IN, BLEED_WIDTH_IN, DPI } from "./print-spec";
import { EDITOR_FONTS } from "./fonts";
import type { CardSide } from "./schema";

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
const PAGE_WIDTH_PT = BLEED_WIDTH_IN * POINTS_PER_INCH;
const PAGE_HEIGHT_PT = BLEED_HEIGHT_IN * POINTS_PER_INCH;

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

/** Rasterizes a card side to a 300 DPI PNG matching the full-bleed pixel dimensions from the print spec. */
export async function exportSidePng(side: CardSide): Promise<RasterExportResult> {
  const resolved = await resolveSideImages(side);
  const svg = renderSideToSvg(resolved, DPI);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, widthPx: meta.width ?? BLEED_PX_WIDTH, heightPx: meta.height ?? BLEED_PX_HEIGHT, dpi: DPI };
}

export interface PdfExportResult {
  buffer: Buffer;
  widthPt: number;
  heightPt: number;
  pageCount: number;
}

/** Produces a two-page (front, back) print-ready PDF at the exact bleed trim size with vector text/shapes/QR. */
export async function exportCardPdf(front: CardSide, back: CardSide): Promise<PdfExportResult> {
  const [resolvedFront, resolvedBack] = await Promise.all([resolveSideImages(front), resolveSideImages(back)]);
  const frontSvg = renderSideToSvg(resolvedFront);
  const backSvg = renderSideToSvg(resolvedBack);

  const doc = new PDFDocument({ size: [PAGE_WIDTH_PT, PAGE_HEIGHT_PT], margin: 0, autoFirstPage: false });
  registerEditorFonts(doc);
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const donePromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.addPage({ size: [PAGE_WIDTH_PT, PAGE_HEIGHT_PT], margin: 0 });
  SVGtoPDF(doc, frontSvg, 0, 0, { width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT, assumePt: true });

  doc.addPage({ size: [PAGE_WIDTH_PT, PAGE_HEIGHT_PT], margin: 0 });
  SVGtoPDF(doc, backSvg, 0, 0, { width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT, assumePt: true });

  doc.end();
  const buffer = await donePromise;

  return { buffer, widthPt: PAGE_WIDTH_PT, heightPt: PAGE_HEIGHT_PT, pageCount: 2 };
}

/** Generates a small preview thumbnail (JPEG) used for template/design gallery cards. */
export async function exportSideThumbnail(side: CardSide, maxWidthPx = 480): Promise<Buffer> {
  const resolved = await resolveSideImages(side);
  const thumbDpi = Math.max(72, maxWidthPx / side.physicalWidthIn);
  const svg = renderSideToSvg(resolved, thumbDpi);
  return sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer();
}
