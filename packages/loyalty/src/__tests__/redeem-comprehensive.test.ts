import { validateRedeem } from '../redeem';
import type { CustomerLoyaltyLike, LoyaltyProgramLike } from '../types';

const baseProgram: LoyaltyProgramLike = {
  id: 1, merchantId: 1, name: 'Test', isActive: true,
  rentEarnEnabled: true, rentEarnRate: 1, rentEarnPerAmount: 10000,
  saleEarnEnabled: true, saleEarnRate: 1, saleEarnPerAmount: 10000,
  pointValue: 1000, minRedeemPoints: 10, maxRedeemPercent: 50,
  redeemOnRent: true, redeemOnSale: true,
  tierMetric: 'total_spend', tierPeriod: 'lifetime', tierDowngrade: 'never',
  pointsExpiryMode: 'never', pointsExpiryDays: null, yearlyResetMonth: null, yearlyResetDay: null,
};

function makeLoyalty(points: number): CustomerLoyaltyLike {
  return {
    id: 1, customerId: 1, merchantId: 1, points,
    totalEarned: points, totalRedeemed: 0, totalSpent: 0, totalOrders: 0, currentTierId: 1,
  };
}

describe('validateRedeem — basic scenarios', () => {
  it('valid redeem within all limits', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 50, orderTotalAmount: 300000, orderType: 'RENT' },
      baseProgram,
      makeLoyalty(100)
    );
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(50000); // 50 * 1000
    expect(result.amountDue).toBe(250000); // 300000 - 50000
  });

  it('redeem exact balance', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 100, orderTotalAmount: 500000, orderType: 'SALE' },
      baseProgram,
      makeLoyalty(100)
    );
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(100000);
  });
});

describe('validateRedeem — rejection cases', () => {
  it('INSUFFICIENT_POINTS', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 200, orderTotalAmount: 500000, orderType: 'SALE' },
      baseProgram,
      makeLoyalty(50)
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_POINTS');
  });

  it('BELOW_MINIMUM (< minRedeemPoints)', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 5, orderTotalAmount: 500000, orderType: 'SALE' },
      baseProgram, // minRedeemPoints=10
      makeLoyalty(100)
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('BELOW_MINIMUM');
  });

  it('EXCEEDS_MAX_PERCENT', () => {
    // maxRedeemPercent=50%, order=200k → max discount=100k → max points=100
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 150, orderTotalAmount: 200000, orderType: 'SALE' },
      baseProgram,
      makeLoyalty(200)
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('EXCEEDS_MAX_PERCENT');
  });

  it('REDEEM_DISABLED_FOR_ORDER_TYPE when redeemOnRent=false', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 20, orderTotalAmount: 500000, orderType: 'RENT' },
      { ...baseProgram, redeemOnRent: false },
      makeLoyalty(100)
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('REDEEM_DISABLED_FOR_ORDER_TYPE');
  });

  it('REDEEM_DISABLED_FOR_ORDER_TYPE when redeemOnSale=false', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 20, orderTotalAmount: 500000, orderType: 'SALE' },
      { ...baseProgram, redeemOnSale: false },
      makeLoyalty(100)
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('REDEEM_DISABLED_FOR_ORDER_TYPE');
  });

  it('PROGRAM_INACTIVE', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 20, orderTotalAmount: 500000, orderType: 'SALE' },
      { ...baseProgram, isActive: false },
      makeLoyalty(100)
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('PROGRAM_INACTIVE');
  });

  it('NO_LOYALTY_RECORD (null loyalty)', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 20, orderTotalAmount: 500000, orderType: 'SALE' },
      baseProgram,
      null as any
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('NO_LOYALTY_RECORD');
  });

  it('rejects 0 points', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 0, orderTotalAmount: 500000, orderType: 'SALE' },
      baseProgram,
      makeLoyalty(100)
    );
    expect(result.valid).toBe(false);
  });

  it('rejects negative points', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: -10, orderTotalAmount: 500000, orderType: 'SALE' },
      baseProgram,
      makeLoyalty(100)
    );
    expect(result.valid).toBe(false);
  });
});

describe('validateRedeem — boundary cases', () => {
  it('exact maxRedeemPercent boundary is valid', () => {
    // order=200k, maxRedeemPercent=50% → max discount=100k → max points=100
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 100, orderTotalAmount: 200000, orderType: 'SALE' },
      baseProgram,
      makeLoyalty(200)
    );
    expect(result.valid).toBe(true);
    expect(result.discount).toBe(100000);
  });

  it('exact minRedeemPoints boundary is valid', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 10, orderTotalAmount: 500000, orderType: 'SALE' },
      baseProgram, // minRedeemPoints=10
      makeLoyalty(100)
    );
    expect(result.valid).toBe(true);
  });

  it('discount cannot exceed orderTotalAmount', () => {
    // 500 points * 1000 = 500k discount, but order only 200k
    // maxRedeemPercent=50% caps at 100k (100 points) first
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 500, orderTotalAmount: 200000, orderType: 'SALE' },
      baseProgram,
      makeLoyalty(500)
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('EXCEEDS_MAX_PERCENT');
  });

  it('customer with 0 balance rejected', () => {
    const result = validateRedeem(
      { customerId: 1, merchantId: 1, points: 10, orderTotalAmount: 500000, orderType: 'SALE' },
      baseProgram,
      makeLoyalty(0)
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_POINTS');
  });
});
