import { describe, it, expect } from "vitest";
import { buildQrValue, buildQrModuleMatrix } from "@/lib/business-card/qr";
import { contrastRatio } from "@/lib/business-card/validate";

describe("QR payload builders", () => {
  it("builds a url value and adds https if missing", () => {
    const { value, error } = buildQrValue("url", "example.com");
    expect(error).toBeNull();
    expect(value).toBe("https://example.com");
  });

  it("rejects an invalid email", () => {
    const { error } = buildQrValue("email", "not-an-email");
    expect(error).not.toBeNull();
  });

  it("builds a valid tel: value for phone", () => {
    const { value, error } = buildQrValue("phone", "(816) 521-0462");
    expect(error).toBeNull();
    expect(value).toBe("tel:8165210462");
  });

  it("requires a name for vcard", () => {
    const { error } = buildQrValue("vcard", { name: "" });
    expect(error).not.toBeNull();
  });

  it("builds a valid vcard block", () => {
    const { value, error } = buildQrValue("vcard", { name: "Jane Doe", phone: "8165210462", email: "jane@example.com" });
    expect(error).toBeNull();
    expect(value).toContain("BEGIN:VCARD");
    expect(value).toContain("FN:Jane Doe");
  });

  it("rejects invalid geo coordinates", () => {
    const { error } = buildQrValue("geo", { lat: NaN, lng: -94.5 });
    expect(error).not.toBeNull();
  });
});

describe("QR module matrix", () => {
  it("produces a square boolean matrix", () => {
    const { size, modules } = buildQrModuleMatrix("https://kcprinting.com");
    expect(modules.length).toBe(size);
    expect(modules[0].length).toBe(size);
    expect(modules.some((row) => row.some(Boolean))).toBe(true);
  });

  it("produces a larger matrix for higher error correction", () => {
    const low = buildQrModuleMatrix("https://kcprinting.com/a-fairly-long-url-path", "L");
    const high = buildQrModuleMatrix("https://kcprinting.com/a-fairly-long-url-path", "H");
    expect(high.size).toBeGreaterThanOrEqual(low.size);
  });
});

describe("contrast ratio", () => {
  it("returns 21:1 for pure black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });

  it("returns 1:1 for identical colors", () => {
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("flags low contrast for similar grays", () => {
    expect(contrastRatio("#AAAAAA", "#BBBBBB")).toBeLessThan(3);
  });
});
