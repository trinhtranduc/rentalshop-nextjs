// src/subscription.ts
var PRICING_CONFIG = {
  DISCOUNTS: {
    monthly: 0,
    // 0% discount
    quarterly: 10,
    // 10% discount
    yearly: 20
    // 20% discount
  },
  INTERVALS: {
    monthly: { interval: "month", intervalCount: 1 },
    quarterly: { interval: "month", intervalCount: 3 },
    yearly: { interval: "year", intervalCount: 1 }
  }
};
function calculatePricing(basePrice, period) {
  const config = PRICING_CONFIG.INTERVALS[period === 1 ? "monthly" : period === 3 ? "quarterly" : "yearly"];
  const discount = PRICING_CONFIG.DISCOUNTS[period === 1 ? "monthly" : period === 3 ? "quarterly" : "yearly"];
  const totalMonths = period;
  const totalBasePrice = basePrice * totalMonths;
  const discountAmount = totalBasePrice * discount / 100;
  const finalPrice = totalBasePrice - discountAmount;
  const monthlyEquivalent = finalPrice / totalMonths;
  return {
    basePrice: totalBasePrice,
    discount,
    finalPrice,
    savings: discountAmount,
    monthlyEquivalent,
    interval: config.interval,
    intervalCount: config.intervalCount
  };
}

// src/i18n.ts
var defaultLocale = "en";
var locales = ["en", "vi"];

export { PRICING_CONFIG, calculatePricing, defaultLocale, locales };
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.mjs.map