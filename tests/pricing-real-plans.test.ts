/**
 * #1147: /pricing and /{locale}/pricing showed the SUBSCRIPTION_PLANS constants (79.000 / 199.000 / 399.000 ₫, wrong limits)
 * instead of GET /api/plans/public. Cards now come from the API plans; only vi shows an amount (#1121);
 * a 0 price (Enterprise) is "contact"; an API failure shows no amount and no limits, never the constants.
 * Must hold under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
 */
import { describe, expect, it } from '@jest/globals';
import { buildPricingCards, fallbackPricingCards } from '../apps/client/lib/pricing-format';

const limits = (products: number, customers: number, users: number, outlets: number, orders: number) => ({
  products, customers, users, outlets, orders, allowWebAccess: true, allowMobileAccess: true,
});

// Shape of production GET https://api.anyrent.shop/api/plans/public on 2026-10-20
const apiPlans = [
  { id: 3, name: 'Professional', basePrice: 179000, currency: 'VND', isActive: true, isPopular: true, sortOrder: 2, limits: limits(5000, -1, 4, 1, 5000) },
  { id: 1, name: 'Trial', basePrice: 0, currency: 'VND', isActive: true, isPopular: false, sortOrder: 0, limits: limits(2000, -1, 3, 1, 2000) },
  { id: 4, name: 'Enterprise', basePrice: 0, currency: 'VND', isActive: true, isPopular: false, sortOrder: 3, limits: limits(-1, -1, -1, -1, -1) },
  { id: 2, name: 'Basic', basePrice: 99000, currency: 'VND', isActive: true, isPopular: false, sortOrder: 1, limits: limits(2000, -1, 2, 1, 2000) },
  { id: 9, name: 'Old', basePrice: 50000, currency: 'VND', isActive: false, isPopular: false, sortOrder: 4, limits: limits(1, 1, 1, 1, 1) },
];

describe('pricing cards from the real plans (#1147)', () => {
  it('vi: real VND amounts, sorted, no Trial, no inactive plan, Enterprise is contact', () => {
    const cards = buildPricingCards(apiPlans as any, 'vi');
    expect(cards.map((c) => c.id)).toEqual(['basic', 'professional', 'enterprise']);
    expect(cards.map((c) => c.price?.replace(/\s/g, ' '))).toEqual(['99.000 ₫', '179.000 ₫', null]);
    expect(cards[1].isPopular).toBe(true);
  });

  it('vi: limits are the API limits, not the constants', () => {
    const [basic, pro, ent] = buildPricingCards(apiPlans as any, 'vi');
    expect(basic.limits).toEqual({ products: 2000, customers: -1, users: 2, outlets: 1, orders: 2000 });
    expect(pro.limits).toEqual({ products: 5000, customers: -1, users: 4, outlets: 1, orders: 5000 });
    expect(ent.limits?.products).toBe(-1);
    expect(basic.web).toBe(true);
  });

  it.each(['en', 'ru', 'ja', 'ko', 'zh', 'zh-TW', 'fr', 'de', 'th', 'id', 'es'])('%s: no amount on any card (#1121)', (locale) => {
    const cards = buildPricingCards(apiPlans as any, locale);
    expect(cards.map((c) => c.id)).toEqual(['basic', 'professional', 'enterprise']);
    expect(cards.every((c) => c.price === null)).toBe(true);
    expect(cards[0].limits?.products).toBe(2000);
  });

  it('API failure: the three plans with no amount and no limits', () => {
    const cards = fallbackPricingCards();
    expect(cards.map((c) => c.id)).toEqual(['basic', 'professional', 'enterprise']);
    expect(cards.every((c) => c.price === null && c.limits === null)).toBe(true);
    expect(buildPricingCards(null as any, 'vi')).toEqual(cards);
    expect(buildPricingCards([], 'vi')).toEqual(cards);
  });
});
