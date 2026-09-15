import { describe, it, expect } from "vitest";
import { orderFormSchema } from "@/components/builder/ProductBuilder";

/**
 * When the order form may demand a phone number.
 *
 * Same exemption as businessName (tests/unit/order-business-name.test.ts): phone is only ever
 * collected on the Details step, and the upload and studio-design routes skip that step because
 * the customer already has finished artwork. Requiring phone unconditionally would make those two
 * routes impossible to submit - the same failure businessName already hit once.
 */

const base = {
  selectedAddOns: [],
  brandFiles: [],
  quantity: 1,
  businessName: "",
  phone: "",
  acceptedTerms: true,
  guestEmail: "customer@example.com",
  artwork: { path: null, front: {}, back: {} },
};

const errorsFor = (input: Record<string, unknown>) => {
  const r = orderFormSchema.safeParse({ ...base, ...input });
  return r.success ? [] : r.error.issues.map((i) => i.path.join(".") + ": " + i.message);
};

const demandsPhone = (input: Record<string, unknown>) =>
  errorsFor(input).some((e) => e.startsWith("phone"));

describe("phone is required whenever the Details step is shown", () => {
  it("is required on the design-service route", () => {
    expect(demandsPhone({ artwork: { ...base.artwork, path: "DESIGN_SERVICE" }, businessName: "Rao Solar Group" })).toBe(true);
  });

  it("is NOT required when the customer uploaded finished artwork", () => {
    expect(demandsPhone({ artwork: { ...base.artwork, path: "UPLOAD" } })).toBe(false);
  });

  it("is NOT required when the customer built the design in the studio", () => {
    expect(demandsPhone({ usesStudioDesign: true, artwork: { ...base.artwork, path: "DESIGN_SERVICE" } })).toBe(false);
  });

  it("is NOT required for an explicitly STUDIO-pathed order", () => {
    expect(demandsPhone({ artwork: { ...base.artwork, path: "STUDIO" } })).toBe(false);
  });

  it("accepts the design route once a phone number is given", () => {
    expect(
      errorsFor({ artwork: { ...base.artwork, path: "DESIGN_SERVICE" }, businessName: "Rao Solar Group", phone: "(816) 555-0000" })
    ).toEqual([]);
  });
});

/**
 * The same rule on the server. Mirrors the businessName test's rationale: the client cannot be
 * trusted to enforce this, so /api/orders re-checks independently and both must agree.
 */
describe("the server-side rule at /api/orders", () => {
  /** Mirrors the condition in app/api/orders/route.ts. */
  const serverRequiresPhone = (path: string | null, phone: string) => {
    const suppliedOwnArtwork = path === "UPLOAD" || path === "STUDIO";
    return !suppliedOwnArtwork && !phone.trim();
  };

  it("agrees with the client on every route", () => {
    const cases: [string | null, string, boolean][] = [
      ["UPLOAD", "", false],
      ["STUDIO", "", false],
      ["DESIGN_SERVICE", "", true],
      [null, "", true],
      ["DESIGN_SERVICE", "(816) 555-0000", false],
    ];
    for (const [path, phone, expected] of cases) {
      expect(serverRequiresPhone(path, phone), `path=${path} phone="${phone}"`).toBe(expected);
      const viaSchema = demandsPhone({
        artwork: { ...base.artwork, path },
        usesStudioDesign: path === "STUDIO",
        businessName: "Rao Solar Group",
        phone,
      });
      expect(viaSchema, `client disagrees for path=${path}`).toBe(expected);
    }
  });
});
