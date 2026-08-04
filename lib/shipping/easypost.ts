import type { Parcel } from "./parcel";

/**
 * EasyPost — live carrier rates and label purchase.
 *
 * EasyPost rather than UPS directly, on purpose. Going straight to UPS means their OAuth flow,
 * their XML-shaped JSON and their sandbox, and then doing it all again for USPS the first time a
 * customer wants something cheaper than ground. EasyPost is one API across every carrier, with
 * negotiated rates that beat retail without needing your own carrier contract.
 *
 * Units are EasyPost's, and they are easy to get wrong: parcel weight is in OUNCES and dimensions
 * are in INCHES. Passing pounds silently quotes a sixteenth of the real postage.
 *
 * Nothing here throws. A carrier API that is slow or down must degrade to the flat-rate tiers, not
 * take checkout with it — an order that cannot be placed costs more than one shipped at a flat rate.
 */

const BASE = "https://api.easypost.com/v2";

export interface ShipFromAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

export interface ShipToAddress {
  name?: string;
  street1: string;
  street2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface CarrierRate {
  /** EasyPost rate id, needed to buy the label later. */
  id: string;
  carrier: string;
  service: string;
  /** Dollars. */
  price: number;
  /** Carrier's own estimate; null when they do not commit to one. */
  deliveryDays: number | null;
  shipmentId: string;
}

/** True when live rating is configured. Callers fall back to flat rates when this is false. */
export function easypostConfigured(): boolean {
  return Boolean(process.env.EASYPOST_API_KEY && shipFromAddress());
}

/**
 * Where parcels are posted from.
 *
 * Read from the environment rather than hardcoded, because it is a real street address that
 * belongs in configuration, and because the test and production accounts may ship from different
 * places while things are being set up.
 */
export function shipFromAddress(): ShipFromAddress | null {
  const street1 = process.env.SHIP_FROM_STREET1;
  const city = process.env.SHIP_FROM_CITY;
  const state = process.env.SHIP_FROM_STATE;
  const zip = process.env.SHIP_FROM_ZIP;
  if (!street1 || !city || !state || !zip) return null;
  return {
    name: process.env.SHIP_FROM_NAME ?? "611 Printing",
    street1,
    street2: process.env.SHIP_FROM_STREET2 || undefined,
    city,
    state,
    zip,
    country: process.env.SHIP_FROM_COUNTRY ?? "US",
    phone: process.env.SHIP_FROM_PHONE ?? "8165210462",
  };
}

async function easypost<T>(path: string, body?: unknown): Promise<T | null> {
  const key = process.env.EASYPOST_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        // EasyPost uses HTTP Basic with the API key as the username and an empty password.
        Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      // A carrier quote is not worth stalling a checkout page over.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`EasyPost ${path} failed:`, res.status, await res.text().catch(() => ""));
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`EasyPost ${path} unreachable:`, err);
    return null;
  }
}

interface EasyPostRate {
  id: string;
  carrier: string;
  service: string;
  rate: string;
  delivery_days: number | null;
  shipment_id: string;
}

interface EasyPostShipment {
  id: string;
  rates: EasyPostRate[];
}

/**
 * Live rates for one parcel to one address.
 *
 * Returns an empty array rather than throwing on any failure, so a caller can simply check for
 * length and fall through to flat rates.
 */
export async function getRates(to: ShipToAddress, parcel: Parcel): Promise<CarrierRate[]> {
  const from = shipFromAddress();
  if (!from) {
    console.warn("SHIP_FROM_* not configured — cannot quote live rates");
    return [];
  }

  // Empty strings are not the same as absent. A pre-checkout quote knows only the ZIP, and
  // EasyPost rates a domestic parcel from ZIP and country alone - but `street1: ""` trips its
  // address validation and comes back with no rates at all, which silently looks identical to
  // "the carrier had nothing for you".
  const toAddress: Record<string, string> = { zip: to.zip, country: to.country };
  for (const [key, value] of [
    ["name", to.name],
    ["street1", to.street1],
    ["street2", to.street2],
    ["city", to.city],
    ["state", to.state],
  ] as const) {
    if (typeof value === "string" && value.trim()) toAddress[key] = value.trim();
  }

  const shipment = await easypost<EasyPostShipment>("/shipments", {
    shipment: {
      to_address: toAddress,
      from_address: from,
      parcel: {
        length: parcel.lengthIn,
        width: parcel.widthIn,
        height: parcel.heightIn,
        weight: parcel.weightOz,
      },
    },
  });

  if (!shipment?.rates?.length) return [];

  return shipment.rates
    .map((r) => ({
      id: r.id,
      carrier: r.carrier,
      service: r.service,
      price: Number(r.rate),
      deliveryDays: r.delivery_days,
      shipmentId: r.shipment_id ?? shipment.id,
    }))
    .filter((r) => Number.isFinite(r.price))
    .sort((a, b) => a.price - b.price);
}

export interface PurchasedLabel {
  trackingCode: string;
  labelUrl: string;
  carrier: string;
  service: string;
  price: number;
}

interface EasyPostBought {
  tracking_code: string;
  selected_rate: { carrier: string; service: string; rate: string };
  postage_label: { label_url: string };
}

/**
 * Buys the label for a rate previously quoted.
 *
 * This spends real money on the EasyPost account, so it is only ever called from an authenticated
 * admin route with an explicit confirmation, never as a side effect of anything a customer does.
 */
export async function buyLabel(shipmentId: string, rateId: string): Promise<PurchasedLabel | null> {
  const bought = await easypost<EasyPostBought>(`/shipments/${shipmentId}/buy`, {
    rate: { id: rateId },
  });
  if (!bought?.tracking_code) return null;
  return {
    trackingCode: bought.tracking_code,
    labelUrl: bought.postage_label?.label_url ?? "",
    carrier: bought.selected_rate?.carrier ?? "",
    service: bought.selected_rate?.service ?? "",
    price: Number(bought.selected_rate?.rate ?? 0),
  };
}

/** Human label for a carrier service code: "UPS Ground", "USPS Priority". */
export function serviceLabel(rate: CarrierRate): string {
  const service = rate.service
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${rate.carrier} ${service}`;
}
