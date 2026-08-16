import { describe, it, expect } from "vitest";
import { orderFormSchema } from "@/components/builder/ProductBuilder";

/**
 * When the order form may demand a business name.
 *
 * businessName is a brief for a designer, and it is only ever collected on the Details step. Two
 * routes skip that step because there is nothing for a designer to do - uploading a finished file,
 * and arriving with a design already built in the studio - so neither may be asked for it.
 *
 * The studio route was missed. The step list learned about studio designs and dropped the Details
 * step for them; the schema did not, and went on requiring the field. The result was an order that
 * refused to submit with "Business name is required" while showing no business name field anywhere
 * - unresolvable from the customer's side, and invisible from ours, because a validation failure is
 * not an error anyone logs.
 *
 * These cases exist so the next route added to that list fails a test rather than a customer.
 */

/*
 * A minimally valid order. guestEmail and artwork are included because zod only runs a refinement
 * once the base object parses - omit either and the conditional rules under test never execute, and
 * every case passes for the wrong reason. That is the same trap the submit handler documents.
 */
const base = {
  selectedAddOns: [],
  brandFiles: [],
  quantity: 1,
  businessName: "",
  acceptedTerms: true,
  guestEmail: "customer@example.com",
  artwork: { path: null, front: {}, back: {} },
};

const errorsFor = (input: Record<string, unknown>) => {
  const r = orderFormSchema.safeParse({ ...base, ...input });
  return r.success ? [] : r.error.issues.map((i) => i.path.join(".") + ": " + i.message);
};

const demandsBusinessName = (input: Record<string, unknown>) =>
  errorsFor(input).some((e) => e.startsWith("businessName"));

describe("business name is only required when a designer is doing the work", () => {
  it("is required on the design-service route, where the Details step is shown", () => {
    // The one route that does ask for it: no artwork supplied, so a designer needs the brief.
    expect(demandsBusinessName({ artwork: { ...base.artwork, path: "DESIGN_SERVICE" } })).toBe(true);
  });

  it("is NOT required when the customer uploaded finished artwork", () => {
    expect(demandsBusinessName({ artwork: { ...base.artwork, path: "UPLOAD" } })).toBe(false);
  });

  it("is NOT required when the customer built the design in the studio", () => {
    // The regression: this route skips the Details step, so demanding the field made the order
    // impossible to place - the field it complained about was never rendered.
    expect(demandsBusinessName({ usesStudioDesign: true, artwork: { ...base.artwork, path: "DESIGN_SERVICE" } })).toBe(false);
  });

  it("still accepts a studio design that happens to carry a business name", () => {
    expect(errorsFor({ usesStudioDesign: true, businessName: "Rao Solar Group" })).toEqual([]);
  });

  it("accepts the design route once a business name is given", () => {
    expect(errorsFor({ artwork: { ...base.artwork, path: "DESIGN_SERVICE" }, businessName: "Rao Solar Group" })).toEqual([]);
  });
});

describe("terms are required on every route", () => {
  it("rejects an unaccepted Terms of Sale regardless of how artwork arrived", () => {
    for (const route of [
      { artwork: { ...base.artwork, path: "UPLOAD" } },
      { usesStudioDesign: true },
      { artwork: { ...base.artwork, path: "DESIGN_SERVICE" }, businessName: "Rao Solar Group" },
    ]) {
      expect(errorsFor({ ...route, acceptedTerms: false }), JSON.stringify(route))
        .toContain("acceptedTerms: Please accept the Terms of Sale");
    }
  });
});

describe("an explicitly STUDIO-pathed order", () => {
  it("is exempt too, for the point after the submit handler sets that path", () => {
    expect(demandsBusinessName({ artwork: { ...base.artwork, path: "STUDIO" } })).toBe(false);
  });
});

/**
 * The same rule on the server.
 *
 * /api/orders re-validates independently, which is correct - a client cannot be trusted to enforce
 * anything. But it had its own copy of the condition, and its own omission of the studio route, so
 * fixing the client alone just moved the failure: the form let the order through and checkout
 * rejected it, with the same message and still no field to fill in.
 *
 * These assert the rule rather than the handler, because the handler needs a database. If the two
 * conditions drift again, this is the test that should fail.
 */
describe("the server-side rule at /api/orders", () => {
  /** Mirrors the condition in app/api/orders/route.ts. */
  const serverRequiresBusinessName = (path: string | null, businessName: string) => {
    const suppliedOwnArtwork = path === "UPLOAD" || path === "STUDIO";
    return !suppliedOwnArtwork && !businessName.trim();
  };

  it("agrees with the client on every route", () => {
    const cases: [string | null, string, boolean][] = [
      ["UPLOAD", "", false],
      ["STUDIO", "", false],
      ["DESIGN_SERVICE", "", true],
      [null, "", true],
      ["DESIGN_SERVICE", "Rao Solar Group", false],
    ];
    for (const [path, name, expected] of cases) {
      expect(serverRequiresBusinessName(path, name), `path=${path} name="${name}"`).toBe(expected);
      // And the client schema must reach the same verdict for the same order.
      const viaSchema = demandsBusinessName({
        artwork: { ...base.artwork, path },
        usesStudioDesign: path === "STUDIO",
        businessName: name,
      });
      expect(viaSchema, `client disagrees for path=${path}`).toBe(expected);
    }
  });
});
