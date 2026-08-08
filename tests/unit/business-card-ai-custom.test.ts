import { describe, it, expect } from "vitest";
import { buildCustomBusinessCard, buildCustomPostcard, buildCustomBanner, type CustomDesignInfo } from "@/lib/business-card/templates/ai-custom";
import { AI_PALETTES, AI_PALETTE_AUTO_ID, resolveAiPalette } from "@/lib/business-card/templates/ai-palettes";
import type { QrElement } from "@/lib/business-card/schema";

const baseInfo: CustomDesignInfo = {
  businessName: "Test Co",
  tagline: "We test things",
  phone: "(816) 555-0100",
  email: "hello@test.co",
  website: "test.co",
  linkedin: "linkedin.com/company/test-co",
  address: "123 Main St",
  palette: ["#123C69", "#C9A24B", "#111111"],
  headingFont: "Poppins",
  bodyFont: "Inter",
  includeQrCode: false,
};

function qrElements(elements: { type: string }[]): QrElement[] {
  return elements.filter((e): e is QrElement => e.type === "qr");
}

describe("buildCustomBusinessCard", () => {
  it("does not add a QR element when includeQrCode is false", () => {
    const { front } = buildCustomBusinessCard(baseInfo, "/img.jpg", 1500, 900);
    expect(qrElements(front.elements)).toHaveLength(0);
  });

  /*
   * The QR is on the back now, not the front.
   *
   * A card front has only 0.66in of clear space above the scrim, and the shop's own validator wants
   * at least 0.8in for a code that scans reliably - so a compliant QR does not fit there at any
   * position. What these two tests are actually about, the payload, is unchanged.
   */
  it("adds a scannable QR element pointing at the website when includeQrCode is true", () => {
    const { front, back } = buildCustomBusinessCard({ ...baseInfo, includeQrCode: true }, "/img.jpg", 1500, 900);
    expect(qrElements(front.elements), "the front should stay free of the QR").toHaveLength(0);
    const qrs = qrElements(back.elements);
    expect(qrs).toHaveLength(1);
    expect(qrs[0].value).toContain("test.co");
    expect(qrs[0].payloadType).toBe("url");
    expect(qrs[0].width, "below the shop's own scannable minimum").toBeGreaterThanOrEqual(0.8);
  });

  it("falls back to a vcard QR when no website is given but phone/email exist", () => {
    const { back } = buildCustomBusinessCard({ ...baseInfo, website: "", includeQrCode: true }, "/img.jpg", 1500, 900);
    const qrs = qrElements(back.elements);
    expect(qrs).toHaveLength(1);
    expect(qrs[0].value).toContain("BEGIN:VCARD");
  });

  it("includes the linkedin handle in the contact line when provided", () => {
    const { front } = buildCustomBusinessCard(baseInfo, "/img.jpg", 1500, 900);
    const contactText = front.elements.find((e) => e.type === "text" && "text" in e && e.text.includes("linkedin.com"));
    expect(contactText).toBeDefined();
  });

  it("omits the QR backing tile when includeQrCode is false even with a website present", () => {
    const { front } = buildCustomBusinessCard({ ...baseInfo, includeQrCode: false }, "/img.jpg", 1500, 900);
    expect(front.elements.some((e) => e.type === "qr")).toBe(false);
  });

  it("never emits an empty text element (print-blocking) when optional fields are blank", () => {
    const sparse: CustomDesignInfo = { ...baseInfo, tagline: "", email: "", website: "", linkedin: "", address: "" };
    const { front, back } = buildCustomBusinessCard(sparse, "/img.jpg", 1500, 900);
    for (const el of [...front.elements, ...back.elements]) {
      if (el.type === "text") expect(el.text.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("buildCustomPostcard QR", () => {
  it("adds a QR element when requested", () => {
    const { front } = buildCustomPostcard({ ...baseInfo, includeQrCode: true }, "/img.jpg", 1500, 1000);
    expect(qrElements(front.elements)).toHaveLength(1);
  });
});

describe("buildCustomBanner QR", () => {
  it("adds a QR element on a rollup banner when requested", () => {
    const { front } = buildCustomBanner({ ...baseInfo, includeQrCode: true }, "/img.jpg", 900, 1800, "rollup");
    expect(qrElements(front.elements)).toHaveLength(1);
  });

  it("adds a QR element on a vinyl banner when requested", () => {
    const { front } = buildCustomBanner({ ...baseInfo, includeQrCode: true }, "/img.jpg", 1800, 900, "vinyl");
    expect(qrElements(front.elements)).toHaveLength(1);
  });
});

describe("resolveAiPalette", () => {
  it("returns the exact colors for a named palette id", () => {
    const target = AI_PALETTES[0];
    expect(resolveAiPalette(target.id)).toEqual(target.colors);
  });

  it("returns some valid palette's colors for the auto id", () => {
    const result = resolveAiPalette(AI_PALETTE_AUTO_ID);
    expect(AI_PALETTES.some((p) => p.colors === result || JSON.stringify(p.colors) === JSON.stringify(result))).toBe(true);
  });

  it("falls back to a random palette for an unknown id instead of throwing", () => {
    expect(() => resolveAiPalette("not-a-real-id")).not.toThrow();
  });
});
