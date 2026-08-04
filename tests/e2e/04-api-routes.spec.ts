import { test, expect } from "@playwright/test";

test.describe("API routes", () => {
  test("23 - AI generate route rejects missing type", async ({ request }) => {
    const res = await request.post("/api/ai/generate", {
      data: { payload: {} },
    });
    expect(res.status()).toBe(401);
  });

  test("24 - contact route rejects invalid email", async ({ request }) => {
    // The contact route rate-limits on x-forwarded-for, 5 per 10 minutes. Both browser projects run
    // this test, and a few suite runs in quick succession used to push it over and return 429 -
    // the limiter working correctly, but the assertion reading as a validation failure. A unique
    // forwarded IP per run gives the test its own bucket instead of weakening what it asserts.
    const res = await request.post("/api/contact", {
      headers: { "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 254) + 1}` },
      data: { name: "Test", email: "not-an-email", service: "Business Cards", message: "Hello" },
    });
    expect(res.status()).toBe(400);
  });

  test("25 - coupon validate route returns 400 without code", async ({ request }) => {
    const res = await request.get("/api/coupons/validate");
    expect([400, 401]).toContain(res.status());
  });

  test("26 - Stripe checkout route rejects unauthenticated", async ({ request }) => {
    const res = await request.post("/api/stripe/checkout", {
      data: { orderId: "fake-order-id" },
    });
    expect([401, 404]).toContain(res.status());
  });
});
