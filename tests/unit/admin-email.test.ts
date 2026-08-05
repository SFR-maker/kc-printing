import { describe, it, expect, afterEach } from "vitest";
import { isAdminEmail, isAdminRole } from "@/lib/auth/ensure-user";

/**
 * ADMIN_EMAIL decides who can reach /admin, and getting it wrong locks the owner out of their own
 * shop - which is exactly what happened: the Clerk webhook compared the signed-in address against
 * the whole ADMIN_EMAIL value while that value is a comma-separated list, so the admin branch could
 * never be true and every user was written as USER.
 */

const original = process.env.ADMIN_EMAIL;
afterEach(() => {
  process.env.ADMIN_EMAIL = original;
});

describe("isAdminEmail", () => {
  it("matches a single configured address", () => {
    process.env.ADMIN_EMAIL = "owner@example.com";
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("someone@example.com")).toBe(false);
  });

  it("matches any address in a comma-separated list", () => {
    // The real value holds two addresses. Comparing the whole string is why nobody matched.
    process.env.ADMIN_EMAIL = "one@example.com,two@example.com";
    expect(isAdminEmail("one@example.com")).toBe(true);
    expect(isAdminEmail("two@example.com")).toBe(true);
    expect(isAdminEmail("three@example.com")).toBe(false);
  });

  it("ignores spacing and case, since the value is typed into a dashboard by hand", () => {
    process.env.ADMIN_EMAIL = " One@Example.com , two@example.com ";
    expect(isAdminEmail("one@example.com")).toBe(true);
    expect(isAdminEmail("TWO@EXAMPLE.COM")).toBe(true);
  });

  it("grants nobody when unset, rather than everybody", () => {
    delete process.env.ADMIN_EMAIL;
    expect(isAdminEmail("owner@example.com")).toBe(false);
    process.env.ADMIN_EMAIL = "";
    expect(isAdminEmail("")).toBe(false);
    expect(isAdminEmail("owner@example.com")).toBe(false);
  });
});

describe("isAdminRole", () => {
  it("admits admins and refuses everyone else", () => {
    expect(isAdminRole("SUPER_ADMIN")).toBe(true);
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("USER")).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
  });
});
