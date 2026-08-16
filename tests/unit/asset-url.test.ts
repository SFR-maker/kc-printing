import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// Only the statically-analysable half is imported here; every case that depends on the environment
// variable re-imports the module through withBase() below, since the origin is read at module load.
import { isOffloadedAsset } from "@/lib/asset-url";

/**
 * The asset origin switch.
 *
 * Two properties matter more than anything else here, and they pull in opposite directions.
 *
 * With the variable unset, this must be a *byte-identical* no-op. It is on the render path of every
 * thumbnail, every template background and every image in the editor, and it ships to production
 * ahead of the bucket existing - so if the off state is not perfectly inert, it breaks the site
 * before it can help it.
 *
 * With the variable set, it must rewrite exactly the four offloaded directories and nothing else.
 * Rewriting too little leaves a broken image once the files leave the repo; rewriting too much
 * points a data URI or an UploadThing URL at a bucket that has never heard of it.
 */

const ORIGINAL = process.env.NEXT_PUBLIC_ASSET_CDN_BASE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_ASSET_CDN_BASE;
  else process.env.NEXT_PUBLIC_ASSET_CDN_BASE = ORIGINAL;
  vi.resetModules();
});

/** Re-imports the module so a changed environment variable is picked up. */
async function withBase(value: string | undefined) {
  vi.resetModules();
  if (value === undefined) delete process.env.NEXT_PUBLIC_ASSET_CDN_BASE;
  else process.env.NEXT_PUBLIC_ASSET_CDN_BASE = value;
  return import("@/lib/asset-url");
}

const OFFLOADED = [
  "/images/thumbs/photo-solar-01-angled-split.webp",
  "/images/card-art/solar/01-angled-split.webp",
  "/images/product-art/banner/roll-up-1.webp",
  "/images/templates/business-card-texture-1.jpg",
];

const UNTOUCHED = [
  // Stays local: the only next/image assets, where an off-origin source costs optimisation.
  "/images/print/business-cards.webp",
  "/fonts/inter-400.ttf",
  "/icon-512.png",
  // Already resolved, or somebody else's origin.
  "data:image/png;base64,AAAA",
  "https://utfs.io/f/customer-upload.png",
  "https://x.ufs.sh/f/abc.jpg",
  // Near-misses that must not be swept in by a loose pattern.
  "/images/thumbsomething/x.webp",
  "/images/card-artwork/x.webp",
];

describe("with no CDN configured (the state this ships in)", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ASSET_CDN_BASE;
  });

  it("returns every path exactly as given", async () => {
    const { assetUrl: fn } = await withBase(undefined);
    for (const path of [...OFFLOADED, ...UNTOUCHED]) {
      expect(fn(path), path).toBe(path);
    }
  });
});

describe("with a CDN configured", () => {
  it("rewrites the four offloaded directories", async () => {
    const { assetUrl: fn } = await withBase("https://cdn.611printing.com");
    for (const path of OFFLOADED) {
      expect(fn(path), path).toBe("https://cdn.611printing.com" + path);
    }
  });

  it("leaves everything else alone", async () => {
    const { assetUrl: fn } = await withBase("https://cdn.611printing.com");
    for (const path of UNTOUCHED) {
      expect(fn(path), path).toBe(path);
    }
  });

  it("tolerates a trailing slash and a trailing newline", async () => {
    // Vercel dashboard values have twice arrived with a trailing newline in this project; a stray
    // one in an image origin would break every asset at once.
    for (const messy of ["https://cdn.611printing.com/", "https://cdn.611printing.com\n", "  https://cdn.611printing.com  "]) {
      const { assetUrl: fn } = await withBase(messy);
      expect(fn("/images/thumbs/a.webp"), JSON.stringify(messy)).toBe("https://cdn.611printing.com/images/thumbs/a.webp");
    }
  });
});

describe("isOffloadedAsset", () => {
  it("matches the offloaded directories and only those", () => {
    for (const path of OFFLOADED) expect(isOffloadedAsset(path), path).toBe(true);
    for (const path of UNTOUCHED) expect(isOffloadedAsset(path), path).toBe(false);
  });

  it("agrees with assetUrl about what it rewrites", async () => {
    const { assetUrl: fn, isOffloadedAsset: is } = await withBase("https://cdn.example.com");
    for (const path of [...OFFLOADED, ...UNTOUCHED]) {
      expect(fn(path) !== path, path).toBe(is(path));
    }
  });
});
