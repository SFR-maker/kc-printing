import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { docSize, type PrintSpec } from "@/lib/print/spec";

/** Assumed when a raster carries no DPI tag, purely to derive a physical size from pixels. */
const DEFAULT_BASIS_DPI = 300;

/** Formats we can measure and proof automatically. Anything else is rejected with export guidance. */
export const ACCEPTED_ARTWORK_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "tif", "tiff"] as const;

/** Native formats we deliberately turn away, with the reason surfaced to the customer. */
const REJECTED_EXTENSIONS: Record<string, string> = {
  ai: "Illustrator",
  eps: "EPS",
  psd: "Photoshop",
  indd: "InDesign",
  cdr: "CorelDRAW",
};

export type ArtworkKind = "raster" | "pdf";

export interface ArtworkInspection {
  kind: ArtworkKind;
  /** Physical size of the supplied document, in inches. */
  widthIn: number;
  heightIn: number;
  /** Pixel dimensions. Null for PDFs, which are vector and have no single pixel size. */
  pixelWidth: number | null;
  pixelHeight: number | null;
  /**
   * Effective print resolution once the artwork is placed on the required document.
   *
   * For rasters this is computed from pixel count, not from the file's DPI tag. Plenty of JPGs and
   * PNGs carry no density at all, or a meaningless 72, and a customer whose file is tagged 72 DPI
   * but is 3000px wide has a perfectly good print file. Pixels are the thing that actually
   * determines print quality, so that is what we measure and report.
   */
  effectiveDpi: number;
  /** The DPI the file claims in its own metadata, when it has one. Informational only. */
  declaredDpi: number | null;
  /** Required document for the selected corner finish. */
  requiredWidthIn: number;
  requiredHeightIn: number;
  /** True when the artwork already matches the required document within tolerance. */
  matchesRequiredSize: boolean;
  /** Auto-fit transform: scale to cover the required document, then centre. */
  fit: { scale: number; offsetXIn: number; offsetYIn: number; cropsContent: boolean };
  warnings: ArtworkWarning[];
}

export interface ArtworkWarning {
  level: "info" | "warn" | "block";
  code: string;
  message: string;
}

/** Physical dimensions are never exact off a scanner or export; 0.02in is well under a trim shift. */
const SIZE_TOLERANCE_IN = 0.02;
/** Aspect differences below this are invisible after fitting. */
const ASPECT_TOLERANCE = 0.01;

export class ArtworkRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtworkRejectedError";
  }
}

export function extensionOf(fileName: string): string {
  const m = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m?.[1] ?? "";
}

export function assertAcceptedFormat(fileName: string): void {
  const ext = extensionOf(fileName);
  const rejected = REJECTED_EXTENSIONS[ext];
  if (rejected) {
    throw new ArtworkRejectedError(
      `We can't proof ${rejected} files automatically. Please export as a PDF (or a 300 DPI PNG/JPG) at the size shown above and upload that instead.`
    );
  }
  if (!(ACCEPTED_ARTWORK_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new ArtworkRejectedError(
      `We can't read ${ext ? `.${ext}` : "that"} files. Please upload a PDF, PNG, JPG or TIFF.`
    );
  }
}

/**
 * Measures an uploaded file against the document it will actually print at.
 *
 * Takes a PrintSpec rather than a card-shaped boolean, because the resolution floor is a property
 * of the product: a 4 x 8 ft banner is printed at 150 DPI and a shared 300 floor would reject
 * artwork the press is perfectly happy with.
 */
export async function inspectArtwork(
  bytes: Buffer,
  fileName: string,
  spec: PrintSpec
): Promise<ArtworkInspection> {
  assertAcceptedFormat(fileName);
  const doc = docSize(spec);
  const ext = extensionOf(fileName);

  const measured =
    ext === "pdf" ? await measurePdf(bytes) : await measureRaster(bytes);

  const { widthIn, heightIn, pixelWidth, pixelHeight, declaredDpi } = measured;

  // Cover-fit: scale so the artwork fills the document on both axes, then centre.
  const scale = Math.max(doc.widthIn / widthIn, doc.heightIn / heightIn);
  const scaledW = widthIn * scale;
  const scaledH = heightIn * scale;
  const offsetXIn = (doc.widthIn - scaledW) / 2;
  const offsetYIn = (doc.heightIn - scaledH) / 2;

  const artAspect = widthIn / heightIn;
  const docAspect = doc.widthIn / doc.heightIn;
  const aspectMismatch = Math.abs(artAspect - docAspect) > ASPECT_TOLERANCE;

  const matchesRequiredSize =
    Math.abs(widthIn - doc.widthIn) <= SIZE_TOLERANCE_IN &&
    Math.abs(heightIn - doc.heightIn) <= SIZE_TOLERANCE_IN;

  // Effective DPI is measured against the *required* document, since that is the size it will print
  // at after fitting - not against whatever size the file claims to be.
  const effectiveDpi =
    pixelWidth && pixelHeight
      ? Math.floor(Math.min(pixelWidth / doc.widthIn, pixelHeight / doc.heightIn))
      : // A PDF is vector; resolution is only limited by any images placed inside it, which we do
        // not descend into. Report the recommended figure rather than a misleading number.
        spec.recommendedDpi;

  const warnings: ArtworkWarning[] = [];

  if (!matchesRequiredSize) {
    warnings.push({
      level: "info",
      code: "resized",
      message: `Your file is ${fmt(widthIn)} x ${fmt(heightIn)} in. We've fitted it to the required ${fmt(doc.widthIn)} x ${fmt(doc.heightIn)} in.`,
    });
  }

  if (aspectMismatch) {
    const lostW = Math.max(0, scaledW - doc.widthIn);
    const lostH = Math.max(0, scaledH - doc.heightIn);
    warnings.push({
      level: "warn",
      code: "aspect",
      message: `Your file's proportions don't match a business card, so fitting it trims about ${fmt(Math.max(lostW, lostH))} in off the ${lostW > lostH ? "sides" : "top and bottom"}. Check the proof carefully.`,
    });
  }

  if (pixelWidth && effectiveDpi < spec.minDpi) {
    warnings.push({
      level: "block",
      code: "dpi-too-low",
      message: `This file is only ${pixelWidth} x ${pixelHeight} px, which is about ${effectiveDpi} DPI at print size. Below ${spec.minDpi} DPI it will look visibly soft in print. Please supply a larger file.`,
    });
  } else if (pixelWidth && effectiveDpi < spec.recommendedDpi) {
    warnings.push({
      level: "warn",
      code: "dpi-low",
      message: `This file works out to about ${effectiveDpi} DPI at print size. ${spec.recommendedDpi} DPI is recommended.`,
    });
  }

  return {
    kind: ext === "pdf" ? "pdf" : "raster",
    widthIn: round3(widthIn),
    heightIn: round3(heightIn),
    pixelWidth,
    pixelHeight,
    effectiveDpi,
    declaredDpi,
    requiredWidthIn: doc.widthIn,
    requiredHeightIn: doc.heightIn,
    matchesRequiredSize,
    fit: {
      scale: round4(scale),
      offsetXIn: round4(offsetXIn),
      offsetYIn: round4(offsetYIn),
      cropsContent: aspectMismatch,
    },
    warnings,
  };
}

async function measureRaster(bytes: Buffer) {
  const meta = await sharp(bytes).metadata();
  if (!meta.width || !meta.height) {
    throw new ArtworkRejectedError("We couldn't read the dimensions of that image. Please re-export it and try again.");
  }
  // sharp reports 72 when a file carries no density, which is indistinguishable from a file that
  // genuinely says 72 - so it is treated as "unknown" either way and never used for sizing.
  const declaredDpi = meta.density && meta.density !== 72 ? meta.density : null;
  // Physical size is taken from pixels at the file's own declared density when it has a meaningful
  // one, otherwise at the recommended print density. Either way `fit` re-scales it to the document.
  const basisDpi = declaredDpi ?? DEFAULT_BASIS_DPI;
  return {
    widthIn: meta.width / basisDpi,
    heightIn: meta.height / basisDpi,
    pixelWidth: meta.width,
    pixelHeight: meta.height,
    declaredDpi,
  };
}

async function measurePdf(bytes: Buffer) {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  } catch {
    throw new ArtworkRejectedError("We couldn't open that PDF. If it's password protected, please remove the password and upload it again.");
  }
  const page = doc.getPages()[0];
  if (!page) throw new ArtworkRejectedError("That PDF has no pages.");
  // PDF user space is 72 units per inch. Uses the page's own box, which is what a printer reads.
  const { width, height } = page.getSize();
  return {
    widthIn: width / 72,
    heightIn: height / 72,
    pixelWidth: null,
    pixelHeight: null,
    declaredDpi: null,
  };
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
