import { isYearlyResetDate } from '../expiry';
import type { LoyaltyProgramLike } from '../types';

describe('expiry helpers', () => {
  const program: LoyaltyProgramLike = {
    id: 1,
    merchantId: 1,
    name: 'Test',
    isActive: true,
    rentEarnEnabled: true,
    rentEarnRate: 1,
    rentEarnPerAmount: 10000,
    saleEarnEnabled: true,
    saleEarnRate: 1,
    saleEarnPerAmount: 10000,
    pointValue: 1000,
    minRedeemPoints: 10,
    maxRedeemPercent: 50,
    redeemOnRent: true,
    redeemOnSale: true,
    tierMetric: 'total_spend',
    tierPeriod: 'lifetime',
    tierDowngrade: 'never',
    pointsExpiryMode: 'yearly_reset',
    pointsExpiryDays: null,
    yearlyResetMonth: 1,
    yearlyResetDay: 1,
  };

  it('detects yearly reset date', () => {
    expect(isYearlyResetDate(program, new Date('2026-01-01T10:00:00Z'))).toBe(true);
    expect(isYearlyResetDate(program, new Date('2026-02-01T10:00:00Z'))).toBe(false);
  });
});
