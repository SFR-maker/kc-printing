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
/** PDFKit registers one file per name, so each weight needs its own registration. */
const BOLD_SUFFIX = "__bold";

/**
 * Registers a regular and a bold cut for every editor font.
 *
 * Only one file per family was registered before, and twenty of the families ship the 700 cut, so
 * every regular-weight run printed bold - the body of a card whose proof showed it regular. The
 * proof is rasterised by librsvg, which resolves by name and honours font-weight, so the two
 * disagreed and only the printed piece was wrong.
 */
function registerEditorFonts(doc: InstanceType<typeof PDFDocument>): void {
  const dir = path.join(process.cwd(), "lib/business-card/fonts-ttf");
  for (const font of EDITOR_FONTS) {
    // The bundled file is whichever weight `weight` says; the other cut comes from regularFile.
    const boldFile = font.weight === "700" ? font.file : null;
    const regularFile = font.regularFile ?? (font.weight === "400" ? font.file : null);

    for (const [name, file] of [
      [font.family, regularFile ?? font.file],
      [`${font.family}${BOLD_SUFFIX}`, boldFile ?? regularFile ?? font.file],
    ] as const) {
      try {
        doc.registerFont(name, path.join(dir, file));
      } catch {
        // Missing or corrupt file: that run falls back to Helvetica rather than failing the export.
      }
    }
  }
}

/**
 * Picks the registered cut for a run of text.
 *
 * svg-to-pdfkit hands us the family and whether the run is bold; without this it calls doc.font()
 * with the raw family name and every weight resolves to the single registration.
 */
function pdfFontCallback(family: string, bold: boolean): string {
  const wanted = String(family ?? "").replace(/['"]/g, "").split(",")[0].trim();
  const known = EDITOR_FONTS.find((f) => f.family.toLowerCase() === wanted.toLowerCase());
  if (!known) return bold ? "Helvetica-Bold" : "Helvetica";
  return bold ? `${known.family}${BOLD_SUFFIX}` : known.family;
}

export interface RasterExportResult {
  buffer: Buffer;
  widthPx: number;
  heightPx: number;
  dpi: number;
}

/** Rasterizes a card side to a 300 DPI PNG matching the side's own full-bleed physical dimensions. */
/**
 * A tiled "PREVIEW" mark, in the SVG's own inch coordinates.
 *
 * Applied to the artwork itself rather than added afterwards to the PNG or PDF, so one
 * implementation covers both output formats and the mark scales with the piece - a business card
 * and a 12ft banner both get a mark sized to them.
 *
 * Deliberately hard to remove and easy to see. A faint corner mark can be cropped in seconds; this
 * repeats across the whole face, so an unpurchased export is legible as a proof and useless as
 * finished artwork.
 */
const WATERMARK_TEXT = "611 PRINTING · PREVIEW";

function watermarkOverlay(widthIn: number, heightIn: number): string {
  const long = Math.max(widthIn, heightIn);

  /*
   * Spacing is derived from how wide the text actually is, not from a fraction of the canvas.
   *
   * Stepping by a share of the long edge put the marks closer together than the text was wide, so
   * every row overprinted the next and the result read as "PREVIEWG11 PREVIEW" - illegible, and
   * ugly enough to look like a rendering fault rather than a deliberate mark.
   *
   * 0.5em per character is the usual rule of thumb for average glyph width in a sans face; it does
   * not need to be exact, only large enough that neighbours cannot touch.
   */
  const font = (long * 0.34) / (WATERMARK_TEXT.length * 0.5);
  const textWidth = WATERMARK_TEXT.length * font * 0.5;
  const stepX = textWidth * 1.5;
  const stepY = font * 3.4;

  const marks: string[] = [];
  // Overdrawn well past the edges: the -30 degree rotation would otherwise leave bare corners.
  for (let y = -heightIn; y < heightIn * 2; y += stepY) {
    // Alternate rows are offset half a step so the marks read as a weave rather than a grid, which
    // is harder to mask out in a rectangular selection.
    const rowOffset = (Math.round(y / stepY) % 2) * (stepX / 2);
    for (let x = -widthIn + rowOffset; x < widthIn * 2; x += stepX) {
      marks.push(`<text x="${x.toFixed(3)}" y="${y.toFixed(3)}">${WATERMARK_TEXT}</text>`);
    }
  }

  return `<g transform="rotate(-30 ${widthIn / 2} ${heightIn / 2})" fill="#000000" fill-opacity="0.18"
      font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${font.toFixed(4)}">${marks.join("")}</g>`;
}

/** Injects the mark just inside the closing tag, so it sits above every element. */
function withWatermark(svg: string, widthIn: number, heightIn: number, on: boolean): string {
  if (!on) return svg;
  return svg.replace(/<\/svg>\s*$/, `${watermarkOverlay(widthIn, heightIn)}</svg>`);
}

export async function exportSidePng(side: CardSide, watermark = false): Promise<RasterExportResult> {
  const resolved = await resolveSideImages(side);
  const svg = withWatermark(renderSideToSvg(resolved, DPI), side.physicalWidthIn, side.physicalHeightIn, watermark);
  /*
   * Stamp the real resolution into the file.
   *
   * The raster was always 300 DPI by construction, but sharp writes a pHYs chunk of 72 unless told
   * otherwise - so the PNG *claimed* 72. Opened in any print tool the card came in at 15" x 8.75"
   * instead of 3.6" x 2.1", and a prepress operator either rescales it by hand or bounces the job.
   *
   * Flattened onto white as well: the export carried an alpha channel, and transparency in artwork
   * sent to a press is an unanswered question about what gets printed there.
   */
  const buffer = await sharp(Buffer.from(svg))
    .flatten({ background: "#FFFFFF" })
    .withMetadata({ density: DPI })
    .png()
    .toBuffer();
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
export async function exportCardPdf(front: CardSide, back: CardSide, watermark = false): Promise<PdfExportResult> {
  const [resolvedFront, resolvedBack] = await Promise.all([resolveSideImages(front), resolveSideImages(back)]);
  const frontSvg = withWatermark(renderSideToSvg(resolvedFront), front.physicalWidthIn, front.physicalHeightIn, watermark);
  const backSvg = withWatermark(renderSideToSvg(resolvedBack), back.physicalWidthIn, back.physicalHeightIn, watermark);

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
  SVGtoPDF(doc, frontSvg, 0, 0, { width: frontWidthPt, height: frontHeightPt, assumePt: true, fontCallback: pdfFontCallback });

  doc.addPage({ size: [backWidthPt, backHeightPt], margin: 0 });
  SVGtoPDF(doc, backSvg, 0, 0, { width: backWidthPt, height: backHeightPt, assumePt: true, fontCallback: pdfFontCallback });

  doc.end();
  const buffer = await donePromise;

  return { buffer, widthPt: frontWidthPt, heightPt: frontHeightPt, pageCount: 2 };
}

/** Generates a small preview thumbnail (JPEG) used for template/design gallery cards. */
export interface ThumbnailFormat {
  /** Encoded format. WebP is roughly half the bytes of JPEG at equivalent quality, which is what
   *  makes a higher-resolution thumbnail affordable — these are stored as base64 data URIs and
   *  inlined into the HTML, so bytes are the binding constraint, not pixels. */
  format?: "webp" | "jpeg";
  quality?: number;
}

export async function exportSideThumbnail(
  side: CardSide,
  maxWidthPx = 480,
  maxHeightPx = maxWidthPx,
  { format = "webp", quality = 80 }: ThumbnailFormat = {}
): Promise<Buffer> {
  const resolved = await resolveSideImages(side);
  // Bounded by both dimensions, not just width — a business card fits maxWidthPx comfortably at a
  // sensible height, but an 81in-tall roll-up banner at the same "just cap width" logic would come
  // out several thousand pixels tall (physically huge regardless of DPI). No DPI floor here since
  // this is a display thumbnail, not a print asset — sharpness only needs to hold up at gallery size.
  const thumbDpi = Math.min(maxWidthPx / side.physicalWidthIn, maxHeightPx / side.physicalHeightIn);
  const svg = renderSideToSvg(resolved, thumbDpi);
  // Neither output format carries alpha here — sharp would default transparent areas (outside a
  // die-cut shapeMask) to black, which reads as an ugly matte behind the shape. Flatten to white.
  const pipeline = sharp(Buffer.from(svg)).flatten({ background: "#FFFFFF" });
  return format === "webp"
    ? pipeline.webp({ quality, effort: 5 }).toBuffer()
    : pipeline.jpeg({ quality }).toBuffer();
}

/** Thumbnail render width per product. Business cards are the largest on screen (the 3-up rail on
 *  the service pages), so they get the most pixels. */
export const THUMBNAIL_WIDTH: Record<string, number> = {
  BUSINESS_CARD: 960,
  POSTCARD: 800,
  BANNER: 800,
  RIGID_SIGN: 800,
  WINDOW_DECAL: 800,
};
