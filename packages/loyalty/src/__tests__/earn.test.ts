import { calculateEarn, calculateAmountDue } from '../earn';
import { validateRedeem } from '../redeem';
import type { CustomerLoyaltyLike, LoyaltyProgramLike, LoyaltyTierLike } from '../types';

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

const baseTier: LoyaltyTierLike = {
  id: 1,
  programId: 1,
  name: 'Member',
  threshold: 0,
  multiplier: 1.2,
  sortOrder: 0,
};

const baseLoyalty: CustomerLoyaltyLike = {
  id: 1,
  customerId: 1,
  merchantId: 1,
  points: 200,
  totalEarned: 200,
  totalRedeemed: 0,
  totalSpent: 0,
  totalOrders: 0,
  currentTierId: 1,
};

describe('calculateEarn', () => {
  it('uses totalAmount minus loyaltyDiscount only', () => {
    const points = calculateEarn({
      order: {
        id: 1,
        orderNumber: 'ORD-1',
        orderType: 'SALE',
        status: 'COMPLETED',
        totalAmount: 450000,
        loyaltyDiscount: 100000,
        outletId: 1,
        customerId: 1,
      },
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });

    // eligible = 350000 -> floor(350000/10000)*1 * 1.2 = 35 * 1.2 = 42
    expect(points).toBe(42);
  });

  it('does not subtract manual discount twice', () => {
    const points = calculateEarn({
      order: {
        id: 1,
        orderNumber: 'ORD-1',
        orderType: 'SALE',
        status: 'COMPLETED',
        totalAmount: 400000,
        loyaltyDiscount: 0,
        outletId: 1,
        customerId: 1,
      },
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: { ...baseTier, multiplier: 1 },
    });

    expect(points).toBe(40);
  });
});

describe('calculateAmountDue', () => {
  it('returns amount after loyalty discount', () => {
    expect(calculateAmountDue(450000, 100000)).toBe(350000);
  });
});

describe('validateRedeem', () => {
  it('returns valid redeem result with amountDue', () => {
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

    expect(result.valid).toBe(true);
    expect(result.discount).toBe(100000);
    expect(result.amountDue).toBe(350000);
  });

  it('rejects when points exceed max percent', () => {
    const result = validateRedeem(
      {
        customerId: 1,
        merchantId: 1,
        points: 230,
        orderTotalAmount: 450000,
        orderType: 'SALE',
      },
      baseProgram,
      { ...baseLoyalty, points: 500 }
    );

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('EXCEEDS_MAX_PERCENT');
  });
});
