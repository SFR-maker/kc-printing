import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getRates, easypostConfigured, shipFromAddress, serviceLabel } from "@/lib/shipping/easypost";
import { businessCardParcel } from "@/lib/shipping/parcel";

/**
 * The live carrier path cannot be exercised against the real API without a key, so these tests
 * stand in for it: they assert the exact request we send and how we read the response back.
 *
 * That covers the failure modes that would otherwise only surface in production - a malformed
 * address that silently returns no rates, a wrong unit that quotes a sixteenth of the postage, or
 * an outage that takes checkout down instead of falling back.
 */

const PARCEL = businessCardParcel(101, 10, 250);

function mockFetch(response: unknown, ok = true) {
  const spy = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 422,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

const RATES_RESPONSE = {
  id: "shp_123",
  rates: [
    { id: "rate_b", carrier: "UPS", service: "Ground", rate: "14.20", delivery_days: 3, shipment_id: "shp_123" },
    { id: "rate_a", carrier: "USPS", service: "GroundAdvantage", rate: "9.45", delivery_days: 5, shipment_id: "shp_123" },
    { id: "rate_c", carrier: "UPS", service: "NextDayAir", rate: "58.00", delivery_days: 1, shipment_id: "shp_123" },
  ],
};

beforeEach(() => {
  process.env.EASYPOST_API_KEY = "EZTKtest_notreal";
  process.env.SHIP_FROM_STREET1 = "4813 Cody St";
  process.env.SHIP_FROM_CITY = "Shawnee";
  process.env.SHIP_FROM_STATE = "KS";
  process.env.SHIP_FROM_ZIP = "66203";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.EASYPOST_API_KEY;
  delete process.env.SHIP_FROM_STREET1;
  delete process.env.SHIP_FROM_CITY;
  delete process.env.SHIP_FROM_STATE;
  delete process.env.SHIP_FROM_ZIP;
});

describe("configuration", () => {
  it("reports ready when the key and despatch address are both present", () => {
    expect(easypostConfigured()).toBe(true);
    expect(shipFromAddress()?.zip).toBe("66203");
  });

  it("reports not ready when the despatch address is incomplete", () => {
    delete process.env.SHIP_FROM_ZIP;
    expect(easypostConfigured()).toBe(false);
  });

  it("reports not ready without a key, so callers fall back to flat rates", () => {
    delete process.env.EASYPOST_API_KEY;
    expect(easypostConfigured()).toBe(false);
  });
});

describe("the request we actually send", () => {
  it("omits empty address fields rather than sending blanks", async () => {
    // `street1: ""` trips EasyPost's address validation and returns zero rates, which is
    // indistinguishable from "no carrier had anything".
    const spy = mockFetch(RATES_RESPONSE);
    await getRates({ street1: "", city: "", state: "", zip: "90210", country: "US" }, PARCEL);

    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.shipment.to_address).toEqual({ zip: "90210", country: "US" });
    expect(body.shipment.to_address).not.toHaveProperty("street1");
    expect(body.shipment.to_address).not.toHaveProperty("city");
  });

  it("keeps a full address when one is available", async () => {
    const spy = mockFetch(RATES_RESPONSE);
    await getRates(
      { name: "Jane Doe", street1: "1 Main St", street2: null, city: "Topeka", state: "KS", zip: "66603", country: "US" },
      PARCEL
    );
    const to = JSON.parse(spy.mock.calls[0][1].body).shipment.to_address;
    expect(to).toMatchObject({ name: "Jane Doe", street1: "1 Main St", city: "Topeka", state: "KS", zip: "66603" });
    expect(to).not.toHaveProperty("street2");
  });

  it("sends weight in ounces and dimensions in inches", async () => {
    // EasyPost's parcel weight is ounces. Sending pounds quotes a sixteenth of the real postage.
    const spy = mockFetch(RATES_RESPONSE);
    await getRates({ street1: "", city: "", state: "", zip: "90210", country: "US" }, PARCEL);
    const parcel = JSON.parse(spy.mock.calls[0][1].body).shipment.parcel;

    expect(parcel.weight).toBe(PARCEL.weightOz);
    expect(parcel.weight).toBeGreaterThan(16); // 250 cards is over a pound, so this is not pounds
    expect(parcel.length).toBe(PARCEL.lengthIn);
  });

  it("authenticates with HTTP Basic, key as username", async () => {
    const spy = mockFetch(RATES_RESPONSE);
    await getRates({ street1: "", city: "", state: "", zip: "90210", country: "US" }, PARCEL);
    const auth = spy.mock.calls[0][1].headers.Authorization as string;
    expect(auth.startsWith("Basic ")).toBe(true);
    expect(Buffer.from(auth.slice(6), "base64").toString()).toBe("EZTKtest_notreal:");
  });
});

describe("reading the response", () => {
  it("returns rates cheapest first", async () => {
    mockFetch(RATES_RESPONSE);
    const rates = await getRates({ street1: "", city: "", state: "", zip: "90210", country: "US" }, PARCEL);
    expect(rates.map((r) => r.price)).toEqual([9.45, 14.2, 58]);
  });

  it("carries the shipment id, which is needed to buy a label later", async () => {
    mockFetch(RATES_RESPONSE);
    const rates = await getRates({ street1: "", city: "", state: "", zip: "90210", country: "US" }, PARCEL);
    expect(rates[0].shipmentId).toBe("shp_123");
  });

  it("drops rates whose price will not parse rather than quoting NaN", async () => {
    mockFetch({ id: "shp_1", rates: [{ id: "r", carrier: "UPS", service: "Ground", rate: "n/a", delivery_days: 2, shipment_id: "shp_1" }] });
    expect(await getRates({ street1: "", city: "", state: "", zip: "90210", country: "US" }, PARCEL)).toEqual([]);
  });
});

describe("failure never takes checkout down", () => {
  it("returns nothing when the carrier has no rates", async () => {
    mockFetch({ id: "shp_1", rates: [] });
    expect(await getRates({ street1: "", city: "", state: "", zip: "90210", country: "US" }, PARCEL)).toEqual([]);
  });

  it("returns nothing on an API error instead of throwing", async () => {
    mockFetch({ error: { message: "bad address" } }, false);
    await expect(getRates({ street1: "", city: "", state: "", zip: "00000", country: "US" }, PARCEL)).resolves.toEqual([]);
  });

  it("returns nothing when the network is unreachable instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    await expect(getRates({ street1: "", city: "", state: "", zip: "90210", country: "US" }, PARCEL)).resolves.toEqual([]);
  });

  it("returns nothing when the despatch address is missing", async () => {
    delete process.env.SHIP_FROM_ZIP;
    const spy = mockFetch(RATES_RESPONSE);
    expect(await getRates({ street1: "", city: "", state: "", zip: "90210", country: "US" }, PARCEL)).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("serviceLabel", () => {
  it("turns a carrier service code into something a customer can read", () => {
    expect(serviceLabel({ id: "", carrier: "UPS", service: "NextDayAir", price: 0, deliveryDays: null, shipmentId: "" }))
      .toBe("UPS Next Day Air");
    expect(serviceLabel({ id: "", carrier: "USPS", service: "GroundAdvantage", price: 0, deliveryDays: null, shipmentId: "" }))
      .toBe("USPS Ground Advantage");
  });
});
