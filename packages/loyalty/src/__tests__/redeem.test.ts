import { validateRedeem } from '../redeem';
import type { CustomerLoyaltyLike, LoyaltyProgramLike } from '../types';

const baseProgram: LoyaltyProgramLike = {
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
  pointsExpiryMode: 'never',
  pointsExpiryDays: null,
  yearlyResetMonth: null,
  yearlyResetDay: null,
};

const baseLoyalty: CustomerLoyaltyLike = {
  id: 1,
  customerId: 1,
  merchantId: 1,
  points: 50,
  totalEarned: 50,
  totalRedeemed: 0,
  totalSpent: 0,
  totalOrders: 0,
  currentTierId: 1,
};

describe('validateRedeem edge cases', () => {
  it('rejects insufficient points', () => {
    const result = validateRedeem(
      {
        customerId: 1,
        merchantId: 1,
        points: 100,
        orderTotalAmount: 450000,
        orderType: 'SALE',
      },
      baseProgram,
      baseLoyalty
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_POINTS');
  });

  it('computes amountDue after valid redeem', () => {
    const result = validateRedeem(
      {
        customerId: 1,
        merchantId: 1,
        points: 40,
        orderTotalAmount: 200000,
        orderType: 'SALE',
      },
      baseProgram,
      baseLoyalty
    );

    expect(result.valid).toBe(true);
    expect(result.discount).toBe(40000);
    expect(result.amountDue).toBe(160000);
  });
});
