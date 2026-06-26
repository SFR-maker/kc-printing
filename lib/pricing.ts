export interface PriceConfig {
  packagePrice: number;
  addOnPrices: number[];
  quantity?: number;
  couponDiscount?: number;
  couponType?: "PERCENT" | "FIXED";
}

export interface PriceResult {
  subtotal: number;
  discount: number;
  total: number;
}

export function calculatePrice(config: PriceConfig): PriceResult {
  const { packagePrice, addOnPrices, quantity = 1, couponDiscount = 0, couponType = "PERCENT" } = config;
  const addOnsTotal = addOnPrices.reduce((sum, p) => sum + p, 0);
  const subtotal = (packagePrice + addOnsTotal) * quantity;

  let discount = 0;
  if (couponDiscount > 0) {
    discount = couponType === "PERCENT"
      ? subtotal * (couponDiscount / 100)
      : Math.min(couponDiscount, subtotal);
  }

  return {
    subtotal,
    discount: Math.round(discount * 100) / 100,
    total: Math.round((subtotal - discount) * 100) / 100,
  };
}
