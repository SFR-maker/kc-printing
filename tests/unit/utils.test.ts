import { describe, it, expect, vi } from "vitest";
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

describe("APP_URL", () => {
  it("strips whitespace and trailing slashes so concatenation is always safe", async () => {
    // The deployed NEXT_PUBLIC_APP_URL carried a trailing newline. `new URL()` normalised it away,
    // so metadata looked correct, but string interpolation produced "https://host\n/success?..."
    // and Stripe rejected every checkout with url_invalid on success_url.
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://example.com/\n";
    vi.resetModules();
    const { APP_URL, absoluteUrl } = await import("@/lib/app-url");
    expect(APP_URL).toBe("https://example.com");
    expect(absoluteUrl("success?session_id=x")).toBe("https://example.com/success?session_id=x");
    expect(absoluteUrl("/cancel")).toBe("https://example.com/cancel");
    expect(() => new URL(absoluteUrl("success"))).not.toThrow();
    process.env.NEXT_PUBLIC_APP_URL = prev;
  });
});
