import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";
import { inspectArtwork, ArtworkRejectedError, extensionOf } from "@/lib/business-card/inspect-artwork";

/** A solid PNG of the given pixel size, optionally tagged with a density. */
async function png(width: number, height: number, density?: number): Promise<Buffer> {
  let img = sharp({ create: { width, height, channels: 3, background: "#ffffff" } });
  if (density) img = img.withMetadata({ density });
  return img.png().toBuffer();
}

async function pdfAtInches(wIn: number, hIn: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([wIn * 72, hIn * 72]);
  return Buffer.from(await doc.save());
}

describe("inspectArtwork - accepted formats", () => {
  it("rejects Illustrator files with export guidance", async () => {
    await expect(inspectArtwork(Buffer.alloc(10), "card.ai", false)).rejects.toBeInstanceOf(ArtworkRejectedError);
    await expect(inspectArtwork(Buffer.alloc(10), "card.ai", false)).rejects.toThrow(/export as a PDF/i);
  });

  it("rejects Photoshop and EPS too", async () => {
    for (const name of ["card.psd", "card.eps"]) {
      await expect(inspectArtwork(Buffer.alloc(10), name, false)).rejects.toBeInstanceOf(ArtworkRejectedError);
    }
  });

  it("reads the extension case-insensitively", () => {
    expect(extensionOf("Card.PDF")).toBe("pdf");
  });
});

describe("inspectArtwork - PDF sizing", () => {
  it("accepts a correctly sized square-corner PDF with no resize warning", async () => {
    const out = await inspectArtwork(await pdfAtInches(3.6, 2.1), "card.pdf", false);
    expect(out.kind).toBe("pdf");
    expect(out.widthIn).toBeCloseTo(3.6, 2);
    expect(out.heightIn).toBeCloseTo(2.1, 2);
    expect(out.matchesRequiredSize).toBe(true);
    expect(out.fit.scale).toBeCloseTo(1, 3);
    expect(out.warnings.find((w) => w.code === "resized")).toBeUndefined();
  });

  it("requires the larger document when rounded corners are selected", async () => {
    const out = await inspectArtwork(await pdfAtInches(3.825, 2.325), "card.pdf", true);
    expect(out.requiredWidthIn).toBeCloseTo(3.825, 3);
    expect(out.requiredHeightIn).toBeCloseTo(2.325, 3);
    expect(out.matchesRequiredSize).toBe(true);
  });

  it("flags a square-corner file submitted against the rounded spec", async () => {
    const out = await inspectArtwork(await pdfAtInches(3.6, 2.1), "card.pdf", true);
    expect(out.matchesRequiredSize).toBe(false);
    expect(out.fit.scale).toBeGreaterThan(1);
    expect(out.warnings.some((w) => w.code === "resized")).toBe(true);
  });

  it("scales up a trim-sized file supplied with no bleed, and says what that costs", async () => {
    // The common mistake: designing at the finished 3.5 x 2 size with nothing to trim into.
    // Adding an equal bleed on all four sides changes the ratio (1.75 -> 1.714), so covering the
    // document scales by 2.1/2 = 1.05 and loses a sliver off each side. The customer needs to be
    // told that, because anything they placed near the left or right edge moves closer to the cut.
    const out = await inspectArtwork(await pdfAtInches(3.5, 2), "card.pdf", false);
    expect(out.matchesRequiredSize).toBe(false);
    expect(out.fit.scale).toBeCloseTo(1.05, 3);
    // 3.5 * 1.05 = 3.675 against a 3.6 document, so 0.0375in is lost off each side.
    expect(out.fit.offsetXIn).toBeCloseTo(-0.0375, 4);
    expect(out.fit.offsetYIn).toBeCloseTo(0, 4);
    expect(out.fit.cropsContent).toBe(true);
    expect(out.warnings.some((w) => w.code === "aspect")).toBe(true);
  });

  it("warns that a square document will be cropped to card proportions", async () => {
    const out = await inspectArtwork(await pdfAtInches(3.6, 3.6), "card.pdf", false);
    expect(out.fit.cropsContent).toBe(true);
    expect(out.warnings.some((w) => w.code === "aspect")).toBe(true);
  });
});

describe("inspectArtwork - raster resolution", () => {
  it("judges resolution by pixel count, not the file's DPI tag", async () => {
    // Tagged 72 DPI but 1080px wide: that is exactly 300 DPI across a 3.6in card, and fine to print.
    const out = await inspectArtwork(await png(1080, 630, 72), "card.png", false);
    expect(out.effectiveDpi).toBe(300);
    expect(out.warnings.some((w) => w.code === "dpi-too-low" || w.code === "dpi-low")).toBe(false);
  });

  it("warns below 300 DPI at card size", async () => {
    const out = await inspectArtwork(await png(720, 420), "card.png", false);
    expect(out.effectiveDpi).toBe(200);
    expect(out.warnings.some((w) => w.code === "dpi-low")).toBe(true);
  });

  it("blocks below 150 DPI at card size", async () => {
    const out = await inspectArtwork(await png(360, 210), "card.png", false);
    expect(out.effectiveDpi).toBe(100);
    const blocking = out.warnings.find((w) => w.code === "dpi-too-low");
    expect(blocking?.level).toBe("block");
  });

  it("needs more pixels for the larger rounded-corner document", async () => {
    // 1080px is 300 DPI on a 3.6in card but only 282 on a 3.825in one.
    const out = await inspectArtwork(await png(1080, 630), "card.png", true);
    expect(out.effectiveDpi).toBeLessThan(300);
    expect(out.warnings.some((w) => w.code === "dpi-low")).toBe(true);
  });

  it("reports pixel dimensions so the customer can act on them", async () => {
    const out = await inspectArtwork(await png(1500, 900), "card.png", false);
    expect(out.pixelWidth).toBe(1500);
    expect(out.pixelHeight).toBe(900);
  });
});
