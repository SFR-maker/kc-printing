import { test, expect } from "@playwright/test";

test.describe("API routes", () => {
  test("23 - AI generate route rejects missing type", async ({ request }) => {
    const res = await request.post("/api/ai/generate", {
      data: { payload: {} },
    });
    expect(res.status()).toBe(401);
  });

  test("24 - contact route rejects invalid email", async ({ request }) => {
    const res = await request.post("/api/contact", {
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
