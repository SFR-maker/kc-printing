import { describe, it, expect, afterEach, vi } from "vitest";
import { sendAdminNewOrder, sendAdminOrderReminder } from "@/lib/resend";

/**
 * sendAdminNewOrder used to send to only the first address in ADMIN_EMAIL - a comma-separated list
 * typed by hand into a dashboard (see tests/unit/admin-email.test.ts for the sibling bug in
 * isAdminEmail). Every address after the first silently never got a new-order alert. This asserts
 * the whole list goes out, for both the new-order alert and the unopened-order reminder that
 * shares the same recipient logic.
 */

const originalAdminEmail = process.env.ADMIN_EMAIL;
const originalApiKey = process.env.RESEND_API_KEY;

afterEach(() => {
  process.env.ADMIN_EMAIL = originalAdminEmail;
  process.env.RESEND_API_KEY = originalApiKey;
  vi.unstubAllGlobals();
});

const baseOrderData = {
  customerName: "Jane Doe",
  customerEmail: "jane@example.com",
  orderId: "cltest1234567890",
  serviceName: "Business Cards",
  packageName: "Standard",
  total: 42,
};

describe("sendAdminNewOrder", () => {
  it("emails every address in ADMIN_EMAIL, not just the first", async () => {
    process.env.ADMIN_EMAIL = "one@example.com, two@example.com ,three@example.com";
    process.env.RESEND_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const ok = await sendAdminNewOrder(baseOrderData);

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["one@example.com", "two@example.com", "three@example.com"]);
  });

  it("sends nothing and reports failure when ADMIN_EMAIL is unset", async () => {
    delete process.env.ADMIN_EMAIL;
    process.env.RESEND_API_KEY = "test-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const ok = await sendAdminNewOrder(baseOrderData);

    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("sendAdminOrderReminder", () => {
  it("emails every configured admin address", async () => {
    process.env.ADMIN_EMAIL = "one@example.com,two@example.com";
    process.env.RESEND_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);

    const ok = await sendAdminOrderReminder({
      orderId: "cltest1234567890",
      serviceName: "Business Cards",
      packageName: "Standard",
      total: 42,
      customerName: "Jane Doe",
      customerEmail: "jane@example.com",
      placedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });

    expect(ok).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["one@example.com", "two@example.com"]);
  });
});
