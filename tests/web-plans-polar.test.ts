/**
 * #1631 The web plan page with Polar on (apps/client/app/plans/plans-model.ts, pure): which button a plan card shows,
 * the 12-month saving and the prices, with the 2026-11-21 card prices.
 */
import { offerMonthlyText, offerPriceText, planAction, planOffers, yearSaving, type WebOffer } from '../apps/client/app/plans/plans-model';

const offer = (over: Partial<WebOffer>): WebOffer => ({ planId: 3, interval: 'semi_annual', months: 6, amount: 1299000, currency: 'VND', decision: 'ok', ...over });
const PRO6 = offer({});
const PRO12 = offer({ interval: 'annual', months: 12, amount: 1799000 });

describe('#1631 plan page with Polar', () => {
  it('the plan\'s offers, 6 months first; other plans are left out', () => {
    expect(planOffers([PRO12, offer({ planId: 2 }), PRO6], 3)).toEqual([PRO6, PRO12]);
    expect(planOffers(null, 3)).toEqual([]);
  });

  it('the button follows the API decision', () => {
    expect(planAction([PRO6, PRO12], false)).toBe('buy');
    expect(planAction([PRO6, PRO12], true)).toBe('renew');
    expect(planAction([{ ...PRO6, decision: 'POLAR_MANAGE_IN_PORTAL' }], true)).toBe('manage');
    expect(planAction([{ ...PRO6, decision: 'SUBSCRIPTION_RENEWS_IN_STORE' }], false)).toBe('store');
    expect(planAction([{ ...PRO6, decision: 'PLAN_NOT_PURCHASABLE' }], false)).toBe('unavailable');
    expect(planAction([{ ...PRO6, decision: 'PLAN_NOT_PURCHASABLE' }], true)).toBe('current');
    // Basic has no Polar product (paid in the app): "Mua trong app AnyRent"
    expect(planAction([], false, { name: 'Basic', basePrice: 99000 })).toBe('app');
    expect(planAction([], true, { name: 'Basic', basePrice: 99000 })).toBe('current');
    // Enterprise is not sold in the apps: "Liên hệ AnyRent"; the free trial has no button
    expect(planAction([], false, { name: 'Enterprise', basePrice: 399000 })).toBe('contact');
    expect(planAction([], false, { name: 'Trial', basePrice: 0 })).toBe('none');
  });

  it('Pro: 1.799.000 ₫ a year saves 31% against 2 × 1.299.000 ₫', () => {
    expect(yearSaving([PRO6, PRO12])).toBe(31);
    expect(yearSaving([PRO12])).toBeNull();
    expect(yearSaving([offer({ amount: 599000 }), offer({ interval: 'annual', months: 12, amount: 999000 })])).toBe(17);
  });

  it('prices read in đồng; a month of the 12-month offer', () => {
    expect(offerPriceText(PRO12).replace(/\s/g, ' ')).toBe('1.799.000 ₫');
    expect(offerMonthlyText(PRO12).replace(/\s/g, ' ')).toBe('149.917 ₫');
    expect(offerMonthlyText(PRO6).replace(/\s/g, ' ')).toBe('216.500 ₫');
  });
});
