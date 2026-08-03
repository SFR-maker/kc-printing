import { describe, it, expect, afterEach } from "vitest";
import { isTestOrderCode } from "@/lib/pricing/test-order";

const VALID = "kc-test-9f4c2a7b13e8d605";

afterEach(() => {
  delete process.env.TEST_ORDER_CODE;
});

describe("isTestOrderCode", () => {
  it("accepts the configured code", () => {
    process.env.TEST_ORDER_CODE = VALID;
    expect(isTestOrderCode(VALID)).toBe(true);
  });

  it("tolerates the trailing newline Vercel leaves on pasted values", () => {
    process.env.TEST_ORDER_CODE = `${VALID}\n`;
    expect(isTestOrderCode(VALID)).toBe(true);
  });

  it("rejects a wrong code", () => {
    process.env.TEST_ORDER_CODE = VALID;
    expect(isTestOrderCode("kc-test-0000000000000000")).toBe(false);
    expect(isTestOrderCode(`${VALID}x`)).toBe(false);
    expect(isTestOrderCode(VALID.slice(0, -1))).toBe(false);
  });

  it("rejects an absent code", () => {
    process.env.TEST_ORDER_CODE = VALID;
    expect(isTestOrderCode(undefined)).toBe(false);
    expect(isTestOrderCode(null)).toBe(false);
    expect(isTestOrderCode("")).toBe(false);
  });

  it("stays off when the variable is unset, so free orders cannot exist by default", () => {
    expect(isTestOrderCode(VALID)).toBe(false);
    expect(isTestOrderCode("")).toBe(false);
  });

  it("stays off when the configured code is too short to be worth guessing at", () => {
    process.env.TEST_ORDER_CODE = "short";
    expect(isTestOrderCode("short")).toBe(false);
  });
});
