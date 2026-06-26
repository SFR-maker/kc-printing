import { describe, it, expect } from "vitest";
import { formatDollars, slugify, sanitizeFileName, truncate } from "@/lib/utils";

describe("formatDollars", () => {
  it("formats whole dollars", () => {
    expect(formatDollars(100)).toBe("$100.00");
  });
  it("formats cents", () => {
    expect(formatDollars(9.99)).toBe("$9.99");
  });
  it("formats zero", () => {
    expect(formatDollars(0)).toBe("$0.00");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("removes special characters", () => {
    expect(slugify("Business Cards!")).toBe("business-cards");
  });
  it("handles multiple spaces", () => {
    expect(slugify("a  b")).toBe("a-b");
  });
});

describe("sanitizeFileName", () => {
  it("removes slashes and special chars", () => {
    const name = sanitizeFileName("../etc/passwd");
    expect(name).not.toContain("/");
  });
  it("preserves extension", () => {
    const name = sanitizeFileName("logo.png");
    expect(name).toContain(".png");
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    const result = truncate("Hello World Test", 10);
    expect(result.length).toBeLessThanOrEqual(13);
    expect(result).toContain("...");
  });
  it("does not truncate short strings", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
  });
});
