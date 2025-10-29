'use strict';

// src/subscription.ts
var PRICING_CONFIG = {
  DISCOUNTS: {
    monthly: 0,
    // 0% discount
    quarterly: 10,
    // 10% discount
    sixMonths: 15,
    // 15% discount
    yearly: 20
    // 20% discount
  },
  INTERVALS: {
    monthly: { interval: "monthly", intervalCount: 1 },
    quarterly: { interval: "quarterly", intervalCount: 3 },
    sixMonths: { interval: "sixMonths", intervalCount: 6 },
    yearly: { interval: "yearly", intervalCount: 1 }
  }
};
function calculatePricing(basePrice, period) {
  let config, discount;
  if (period === 1) {
    config = PRICING_CONFIG.INTERVALS.monthly;
    discount = PRICING_CONFIG.DISCOUNTS.monthly;
  } else if (period === 3) {
    config = PRICING_CONFIG.INTERVALS.quarterly;
    discount = PRICING_CONFIG.DISCOUNTS.quarterly;
  } else if (period === 6) {
    config = PRICING_CONFIG.INTERVALS.sixMonths;
    discount = PRICING_CONFIG.DISCOUNTS.sixMonths;
  } else {
    config = PRICING_CONFIG.INTERVALS.yearly;
    discount = PRICING_CONFIG.DISCOUNTS.yearly;
  }
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

exports.PRICING_CONFIG = PRICING_CONFIG;
exports.calculatePricing = calculatePricing;
exports.defaultLocale = defaultLocale;
exports.locales = locales;
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.js.map