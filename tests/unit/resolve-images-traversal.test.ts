import { describe, it, expect } from "vitest";
import { resolveSideImages } from "@/lib/business-card/resolve-images-server";
import type { CardSide } from "@/lib/business-card/schema";

/**
 * The resolver reads "/"-prefixed srcs off disk, and path.join normalises "/../" happily, so a
 * design saved through the public POST /api/card-designs could name any file in the project and
 * have its bytes base64'd into the exported artwork. .env.local on this deployment holds a live
 * VERCEL_OIDC_TOKEN. These lock the confinement.
 */

const sideWith = (src: string): CardSide => ({
  physicalWidthIn: 3.75, physicalHeightIn: 2.25, bleedIn: 0.125, safeZoneInsetIn: 0.125,
  shapeMask: "rectangle",
  background: { type: "solid", color: "#ffffff", gradient: null },
  elements: [{
    id: "img", type: "image", src, naturalWidthPx: 10, naturalHeightPx: 10,
    crop: null, borderWidthPx: 0, borderColor: "#000000", cornerRadiusIn: 0,
    x: 0, y: 0, width: 1, height: 1, rotation: 0, opacity: 1, locked: false, visible: true,
  }],
} as unknown as CardSide);

const srcOf = (s: CardSide) => (s.elements[0] as unknown as { src: string }).src;

describe("image resolution is confined to public/", () => {
  it("refuses to read a file above public", async () => {
    for (const attack of [
      "/../.env.local",
      "/../../.env.local",
      "/../package.json",
      "/images/../../.env.local",
      "/./../.env.local",
    ]) {
      const out = await resolveSideImages(sideWith(attack));
      expect(srcOf(out), `${attack} was resolved`).not.toMatch(/^data:/);
      expect(srcOf(out)).toBe(attack);
    }
  });

  it("still resolves a legitimate public asset", async () => {
    const out = await resolveSideImages(sideWith("/images/thumbs/banner-grand-opening-1.webp"));
    expect(srcOf(out)).toMatch(/^data:image\//);
  });

  it("leaves data URIs and remote URLs to their own paths", async () => {
    const data = await resolveSideImages(sideWith("data:image/png;base64,AAAA"));
    expect(srcOf(data)).toBe("data:image/png;base64,AAAA");
  });
});
