import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { resolveSideImages } from "@/lib/business-card/resolve-images-server";
import { exportSideThumbnail } from "@/lib/business-card/export";
import type { CardSide } from "@/lib/business-card/schema";

/**
 * Photo templates must not thumbnail as blank cards.
 *
 * librsvg - which sharp uses to rasterize the SVG a design becomes - decodes PNG and JPEG inside an
 * <image> element and renders *nothing at all* for a WebP one. No exception, no warning, no broken
 * image marker: it produces a clean white card. Every one of the 1,818 photo templates in the
 * library is drawn on WebP art, so all of them showed an empty rectangle in the gallery while
 * looking perfect in the editor, where the browser decodes WebP fine.
 *
 * That shape of bug is the reason this file exists rather than a unit test of the transcoder: the
 * only assertion that would have caught it is the end-to-end one, that the pixels are not blank.
 */

/** A full-bleed image element, sized to cover the whole card. */
const sideWith = (src: string): CardSide =>
  ({
    physicalWidthIn: 3.75,
    physicalHeightIn: 2.25,
    bleedIn: 0.125,
    safeZoneInsetIn: 0.125,
    shapeMask: "rectangle",
    background: { type: "solid", color: "#ffffff", gradient: null },
    elements: [
      {
        id: "img",
        type: "image",
        src,
        naturalWidthPx: 1000,
        naturalHeightPx: 600,
        crop: null,
        borderWidthPx: 0,
        borderColor: "#000000",
        cornerRadiusIn: 0,
        x: 0,
        y: 0,
        width: 3.75,
        height: 2.25,
        rotation: 0,
        opacity: 1,
        locked: false,
        visible: true,
      },
    ],
  }) as unknown as CardSide;

const srcOf = (s: CardSide) => (s.elements[0] as unknown as { src: string }).src;

/** Mean per-channel standard deviation. A blank card is one flat colour, so this collapses to ~0. */
async function contrastOf(buf: Buffer): Promise<number> {
  const { channels } = await sharp(buf).stats();
  const rgb = channels.slice(0, 3);
  return rgb.reduce((sum, c) => sum + c.stdev, 0) / rgb.length;
}

// A real photographic asset that ships in the repo, so this exercises the true path.
const PHOTO_WEBP = "/images/card-art/solar/01-angled-split.webp";

describe("photo artwork survives server-side rasterization", () => {
  it("hands the rasterizer a format it can actually decode", async () => {
    const out = await resolveSideImages(sideWith(PHOTO_WEBP));
    // The bytes may stay WebP on disk; what must not reach librsvg is a WebP data URI.
    expect(srcOf(out)).toMatch(/^data:image\/(png|jpeg);base64,/);
  });

  it("renders the photograph rather than a blank card", async () => {
    const thumb = await exportSideThumbnail(sideWith(PHOTO_WEBP), 480);
    const contrast = await contrastOf(thumb);
    // The blank rendering measured 0.0; the correct one measures ~50.
    expect(contrast, "the photo thumbnail rendered blank").toBeGreaterThan(10);
  });

  it("leaves formats the rasterizer already understands alone", async () => {
    // Re-encoding a PNG or JPEG would be wasted work and a needless quality loss.
    const out = await resolveSideImages(sideWith("/images/templates/business-card-texture-1.jpg"));
    expect(srcOf(out)).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("does not fail the whole side when one asset is unreadable", async () => {
    // A missing file leaves the src untouched so the rest of the card still renders.
    const out = await resolveSideImages(sideWith("/images/card-art/solar/does-not-exist.webp"));
    expect(srcOf(out)).toBe("/images/card-art/solar/does-not-exist.webp");
  });
});
