import { describe, it, expect } from "vitest";
import { blankCardDesign, type CardDesign, type TextElement } from "@/lib/business-card/schema";
import {
  baselineFromDesign,
  findPlaceholderDetails,
  placeholderLabel,
} from "@/components/business-card/placeholder-details";

function textEl(id: string, text: string): TextElement {
  return {
    id,
    type: "text",
    x: 0.2,
    y: 0.2,
    width: 2,
    height: 0.3,
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text,
    fontFamily: "Inter",
    fontSizePt: 12,
    fontWeight: "400",
    italic: false,
    underline: false,
    textTransform: "none",
    align: "left",
    lineHeight: 1.2,
    letterSpacing: 0,
    color: "#111111",
    backgroundColor: null,
  };
}

/** A template as it ships: a made-up florist's name, phone, email and tagline. */
function templateDesign(): CardDesign {
  const design = blankCardDesign();
  design.front.elements = [
    textEl("name", "Rosa Lindqvist"),
    textEl("phone", "(913) 555-0341"),
    textEl("email", "rosa@lindqvistflowers.com"),
    textEl("site", "lindqvistflowers.com"),
    textEl("tagline", "Fresh cut stems, every morning"),
  ];
  return design;
}

function edit(design: CardDesign, id: string, text: string): CardDesign {
  const next: CardDesign = structuredClone(design);
  next.front.elements = next.front.elements.map((el) => (el.id === id ? { ...el, text } : el));
  return next;
}

describe("placeholder detail detection", () => {
  it("flags the sample phone, email and website a template ships with", () => {
    const design = templateDesign();
    const found = findPlaceholderDetails(design, baselineFromDesign(design));
    expect(found.map((f) => f.kind).sort()).toEqual(["email", "phone", "website"]);
  });

  it("leaves prose alone even when it is untouched", () => {
    const design = templateDesign();
    const found = findPlaceholderDetails(design, baselineFromDesign(design));
    expect(found.some((f) => f.text.includes("Fresh cut stems"))).toBe(false);
  });

  it("stops flagging a detail once it has been replaced", () => {
    const template = templateDesign();
    const baseline = baselineFromDesign(template);
    const design = edit(
      edit(edit(template, "phone", "(816) 421-8890"), "email", "hello@daisychainkc.com"),
      "site",
      "daisychainkc.com"
    );
    expect(findPlaceholderDetails(design, baseline)).toEqual([]);
  });

  it("still catches a 555 number with no template to compare against", () => {
    const design = templateDesign();
    const found = findPlaceholderDetails(design, null);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("phone");
    expect(found[0].text).toBe("(913) 555-0341");
  });

  it("does not flag a real phone number typed over the sample one", () => {
    const template = templateDesign();
    const design = edit(template, "phone", "816-421-8890");
    const found = findPlaceholderDetails(design, baselineFromDesign(template));
    expect(found.some((f) => f.kind === "phone")).toBe(false);
  });

  it("flags example.com addresses however they were arrived at", () => {
    const design = blankCardDesign();
    design.front.elements = [textEl("email", "you@example.com")];
    expect(findPlaceholderDetails(design, null)).toEqual([
      { side: "front", elementId: "email", kind: "email", text: "you@example.com" },
    ]);
  });

  it("ignores hidden and empty text", () => {
    const design = blankCardDesign();
    design.front.elements = [
      { ...textEl("hidden", "(913) 555-0341"), visible: false },
      textEl("blank", "   "),
    ];
    expect(findPlaceholderDetails(design, null)).toEqual([]);
  });

  it("names each kind in words a customer would use", () => {
    expect(placeholderLabel("phone")).toBe("phone number");
    expect(placeholderLabel("email")).toBe("email address");
    expect(placeholderLabel("website")).toBe("website");
  });
});
