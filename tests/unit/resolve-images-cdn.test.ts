import { describe, it, expect, vi, afterEach } from "vitest";
import { isAllowedRemote, ALLOWED_REMOTE_HOSTS } from "@/lib/security/allowed-remote-hosts";
import type { CardSide } from "@/lib/business-card/schema";

/**
 * Resolving artwork once it lives on a CDN rather than on local disk.
 *
 * The behaviour that matters here is the fall-through. Template art is moving to R2 in stages, so
 * for a while both copies exist, and the resolver has to be correct in every combination: no CDN
 * configured, CDN configured and healthy, CDN configured and failing. The last one is the reason
 * the remote attempt sits *in front of* the disk read rather than replacing it — an R2 outage should
 * degrade to the old behaviour, not to blank artwork on every thumbnail and PDF in the shop.
 *
 * The disk read itself is deliberately not re-tested here; tests/unit/resolve-images-traversal
 * covers its confinement to public/, which is a fix for a real arbitrary-file-read and must keep
 * being asserted independently of anything the CDN does.
 */

const CDN = "https://cdn.611printing.com";
const ORIGINAL = process.env.NEXT_PUBLIC_ASSET_CDN_BASE;

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_ASSET_CDN_BASE;
  else process.env.NEXT_PUBLIC_ASSET_CDN_BASE = ORIGINAL;
  vi.restoreAllMocks();
  vi.resetModules();
});

/** A real asset that ships in the repo, so the disk fall-through has something to find. */
const LOCAL_ASSET = "/images/card-art/solar/01-angled-split.webp";

const sideWith = (src: string): CardSide =>
  ({
    physicalWidthIn: 3.75, physicalHeightIn: 2.25, bleedIn: 0.125, safeZoneInsetIn: 0.125,
    shapeMask: "rectangle",
    background: { type: "solid", color: "#ffffff", gradient: null },
    elements: [{
      id: "img", type: "image", src, naturalWidthPx: 100, naturalHeightPx: 100,
      crop: null, borderWidthPx: 0, borderColor: "#000000", cornerRadiusIn: 0,
      x: 0, y: 0, width: 1, height: 1, rotation: 0, opacity: 1, locked: false, visible: true,
    }],
  }) as unknown as CardSide;

const srcOf = (s: CardSide) => (s.elements[0] as unknown as { src: string }).src;

async function load(cdn: string | undefined) {
  vi.resetModules();
  if (cdn === undefined) delete process.env.NEXT_PUBLIC_ASSET_CDN_BASE;
  else process.env.NEXT_PUBLIC_ASSET_CDN_BASE = cdn;
  return import("@/lib/business-card/resolve-images-server");
}

describe("the shared SSRF allowlist", () => {
  it("accepts the uploader's hosts and our own CDN, over https only", () => {
    for (const ok of [
      "https://utfs.io/f/a.png",
      "https://x.ufs.sh/f/a.png",
      "https://uploadthing.com/f/a.png",
      "https://cdn.611printing.com/images/thumbs/a.webp",
    ]) expect(isAllowedRemote(ok), ok).toBe(true);

    for (const bad of [
      "http://cdn.611printing.com/a.webp",      // downgraded to plaintext
      "https://611printing.com/a.webp",          // the app origin is not an asset host
      "https://evil.cdn.611printing.com/a.webp", // not the exact host
      "https://cdn.611printing.com.evil.com/a",  // suffix trick
      "https://169.254.169.254/latest/meta-data/",
      "https://evil.example.com/a.png",
    ]) expect(isAllowedRemote(bad), bad).toBe(false);
  });

  it("pins the CDN host exactly rather than by wildcard", () => {
    // A wildcard over the domain would also admit anything else ever put on a subdomain.
    const cdnRules = ALLOWED_REMOTE_HOSTS.filter((re) => re.test("cdn.611printing.com"));
    expect(cdnRules).toHaveLength(1);
    expect(cdnRules[0].test("anything-else.611printing.com")).toBe(false);
  });
});

describe("resolving a local template path", () => {
  it("reads from disk when no CDN is configured, and never touches the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { resolveSideImages } = await load(undefined);
    const out = await resolveSideImages(sideWith(LOCAL_ASSET));
    expect(srcOf(out)).toMatch(/^data:image\/(png|jpeg);base64,/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("prefers the CDN when one is configured", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(png, { status: 200, headers: { "content-type": "image/png", "content-length": String(png.length) } }),
    );
    const { resolveSideImages } = await load(CDN);
    const out = await resolveSideImages(sideWith(LOCAL_ASSET));
    expect(srcOf(out)).toMatch(/^data:image\/png;base64,/);
    expect(globalThis.fetch).toHaveBeenCalledWith(CDN + LOCAL_ASSET, expect.anything());
  });

  it("falls through to disk when the CDN fails", async () => {
    // The property that makes this safe to ship before the files are removed: an R2 outage
    // degrades to the previous behaviour rather than to blank artwork everywhere.
    for (const failure of [
      () => Promise.resolve(new Response("nope", { status: 404 })),
      () => Promise.reject(new Error("ETIMEDOUT")),
      () => Promise.resolve(new Response("<html>", { status: 200, headers: { "content-type": "text/html" } })),
    ]) {
      vi.resetModules();
      vi.spyOn(globalThis, "fetch").mockImplementation(failure as never);
      const { resolveSideImages } = await load(CDN);
      const out = await resolveSideImages(sideWith(LOCAL_ASSET));
      expect(srcOf(out), "should have fallen back to the local file").toMatch(/^data:image\/(png|jpeg);base64,/);
      vi.restoreAllMocks();
    }
  });

  it("leaves a path that is not offloaded on disk entirely", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { resolveSideImages } = await load(CDN);
    // images/print stays local - it is the only next/image source.
    const out = await resolveSideImages(sideWith("/images/print/business-cards.webp"));
    expect(srcOf(out)).toMatch(/^data:image\//);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("remote fetch bounds", () => {
  it("stops fetching after the per-side cap", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    // Distinct URLs, so the LRU cannot absorb them and the cap is what has to bite.
    const many = Array.from({ length: 60 }, (_, i) => `https://utfs.io/f/upload-${i}.png`);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(png, { status: 200, headers: { "content-type": "image/png" } }),
    );
    const { resolveSideImages } = await load(CDN);

    const base = sideWith(many[0]);
    const side = {
      ...base,
      elements: many.map((src, i) => ({ ...(base.elements[0] as object), id: `i${i}`, src })),
    } as unknown as CardSide;

    await resolveSideImages(side);
    // 32 is the cap; a real card has one or two images, an adversarial one could ask for 150.
    expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeLessThanOrEqual(32);
  });
});
