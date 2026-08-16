import { describe, it, expect } from "vitest";
import { GET as bannersGET, POST as bannersPOST } from "@/app/api/price/banners/route";
import { GET as rigidGET, POST as rigidPOST } from "@/app/api/price/rigid-signs/route";
import { GET as windowGET, POST as windowPOST } from "@/app/api/price/window-decals/route";
import { quoteUrl } from "@/lib/pricing/quote-client";

/**
 * The price routes answer GET and POST identically.
 *
 * GET exists so the CDN can cache a quote - these are the busiest routes in the app, they fire on
 * every option change, and the answer is a pure function of the options. POST stays so a browser
 * holding an older cached bundle keeps working through the transition.
 *
 * Two handlers computing a price is exactly the shape that drifts: someone fixes a rounding bug or
 * a finishing rule in one and not the other, and the storefront quietly quotes two different
 * numbers depending on which code path a client happens to take. These tests pin them together.
 *
 * They also pin the caching itself, because a mistake in either direction is expensive: a priced
 * result that is not cacheable gives up the whole point, and a *400* that is cacheable would pin
 * "that combination isn't available" to a URL the customer is still in the middle of building.
 */

const ORIGIN = "https://611printing.com";

const get = (handler: (r: Request) => Promise<Response>, endpoint: string, spec: object) =>
  handler(new Request(ORIGIN + quoteUrl(endpoint, spec)));

const post = (handler: (r: Request) => Promise<Response>, endpoint: string, spec: object) =>
  handler(
    new Request(ORIGIN + endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(spec),
    }),
  );

/** Real specs the pickers actually produce. */
const CASES = [
  {
    name: "banners",
    endpoint: "/api/price/banners",
    GET: bannersGET,
    POST: bannersPOST,
    valid: [
      { size: "3ft x 6ft", material: "13 oz. Premium Scrim Glossy Vinyl", quantity: 1, grommets: "No Grommets" },
      { size: "2ft x 4ft", material: "13 oz. Premium Scrim Glossy Vinyl", quantity: 5, grommets: "No Grommets" },
    ],
    invalid: { size: "3ft x 6ft", material: "13 oz. Premium Scrim Glossy Vinyl", quantity: 0, grommets: "No Grommets" },
  },
  {
    name: "rigid signs",
    endpoint: "/api/price/rigid-signs",
    GET: rigidGET,
    POST: rigidPOST,
    valid: [
      { material: "yard-signs", sizeId: 1, shapeId: 1, thickness: "1", type: "1", color: "1", quantity: 10 },
    ],
    invalid: { material: "yard-signs", sizeId: 1, shapeId: 1, thickness: "1", type: "1", color: "1", quantity: 0 },
  },
  {
    name: "window decals",
    endpoint: "/api/price/window-decals",
    GET: windowGET,
    POST: windowPOST,
    valid: [{ material: "window-decals", sizeId: 1, shapeId: 1, quantity: 25 }],
    invalid: { material: "window-decals", sizeId: 1, shapeId: 1, quantity: 0 },
  },
] as const;

describe.each(CASES)("$name price route", ({ endpoint, GET, POST, valid, invalid }) => {
  it("returns the same body from GET as from POST", async () => {
    for (const spec of valid) {
      const [g, p] = await Promise.all([get(GET, endpoint, spec), post(POST, endpoint, spec)]);
      expect(g.status, JSON.stringify(spec)).toBe(p.status);
      expect(await g.json(), JSON.stringify(spec)).toEqual(await p.json());
    }
  });

  it("makes a priced GET cacheable", async () => {
    const res = await get(GET, endpoint, valid[0]);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toMatch(/s-maxage=\d+/);
  });

  it("never caches POST, which browsers and CDNs would not reuse anyway", async () => {
    const res = await post(POST, endpoint, valid[0]);
    expect(res.headers.get("cache-control")).toBeNull();
  });

  it("does not cache a rejected combination", async () => {
    // A 0 quantity is the picker's "not chosen yet" sentinel - a spec mid-edit, not a real answer.
    const res = await get(GET, endpoint, invalid);
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBeNull();
    expect((await res.json()).error).toMatch(/quantity/i);
  });
});

describe("quote URLs", () => {
  it("orders keys so the same spec is always the same cache entry", () => {
    const a = quoteUrl("/api/price/window-decals", { material: "window-decals", sizeId: 1, shapeId: 2, quantity: 25 });
    const b = quoteUrl("/api/price/window-decals", { quantity: 25, shapeId: 2, sizeId: 1, material: "window-decals" });
    expect(a).toBe(b);
  });

  it("omits unset optional fields rather than sending the string 'undefined'", () => {
    expect(quoteUrl("/api/price/banners", { size: "3ft x 6ft", grommets: undefined })).not.toContain("undefined");
  });
});
