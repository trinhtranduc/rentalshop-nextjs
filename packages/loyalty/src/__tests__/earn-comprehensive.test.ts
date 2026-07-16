import { calculateEarn } from '../earn';
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
  saleEarnPerAmount: 20000,
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
  id: 1, programId: 1, name: 'Member', threshold: 0, multiplier: 1.0, sortOrder: 0,
};

const baseLoyalty: CustomerLoyaltyLike = {
  id: 1, customerId: 1, merchantId: 1,
  points: 100, totalEarned: 100, totalRedeemed: 0, totalSpent: 0, totalOrders: 0, currentTierId: 1,
};

function makeOrder(overrides: any = {}) {
  return {
    id: 1, orderNumber: 'ORD-1', orderType: 'RENT' as const, status: 'RETURNED',
    totalAmount: 300000, loyaltyDiscount: 0, outletId: 1, customerId: 1,
    ...overrides,
  };
}

describe('calculateEarn — RENT vs SALE rates', () => {
  it('RENT order uses rentEarnPerAmount', () => {
    const points = calculateEarn({
      order: makeOrder({ orderType: 'RENT', totalAmount: 100000 }),
      program: baseProgram, // rent: 10k=1pt, sale: 20k=1pt
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });
    // 100000 / 10000 * 1 * 1.0 = 10
    expect(points).toBe(10);
  });

  it('SALE order uses saleEarnPerAmount', () => {
    const points = calculateEarn({
      order: makeOrder({ orderType: 'SALE', totalAmount: 100000, status: 'COMPLETED' }),
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });
    // 100000 / 20000 * 1 * 1.0 = 5
    expect(points).toBe(5);
  });
});

describe('calculateEarn — tier multiplier', () => {
  it('applies Gold x1.5 multiplier', () => {
    const goldTier = { ...baseTier, multiplier: 1.5 };
    const points = calculateEarn({
      order: makeOrder({ totalAmount: 200000 }),
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: goldTier,
    });
    // 200000/10000 * 1 = 20 base, * 1.5 = 30
    expect(points).toBe(30);
  });

  it('floors fractional multiplier result', () => {
    const silverTier = { ...baseTier, multiplier: 1.2 };
    const points = calculateEarn({
      order: makeOrder({ totalAmount: 150000 }), // 15 base * 1.2 = 18
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: silverTier,
    });
    expect(points).toBe(18);
  });

  it('floors at partial threshold (7 * 1.3 = 9.1 → 9)', () => {
    const tier = { ...baseTier, multiplier: 1.3 };
    const points = calculateEarn({
      order: makeOrder({ totalAmount: 70000 }), // 7 base * 1.3 = 9.1
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: tier,
    });
    expect(points).toBe(9);
  });
});

describe('calculateEarn — loyalty discount deduction', () => {
  it('subtracts loyaltyDiscount from eligible amount', () => {
    const points = calculateEarn({
      order: makeOrder({ totalAmount: 500000, loyaltyDiscount: 100000 }),
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });
    // eligible = 500000 - 100000 = 400000, /10000 = 40
    expect(points).toBe(40);
  });

  it('returns 0 when loyaltyDiscount >= totalAmount', () => {
    const points = calculateEarn({
      order: makeOrder({ totalAmount: 100000, loyaltyDiscount: 100000 }),
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });
    expect(points).toBe(0);
  });

  it('returns 0 when loyaltyDiscount > totalAmount', () => {
    const points = calculateEarn({
      order: makeOrder({ totalAmount: 50000, loyaltyDiscount: 100000 }),
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });
    expect(points).toBe(0);
  });
});

describe('calculateEarn — disabled earn', () => {
  it('returns 0 when rentEarnEnabled=false for RENT order', () => {
    const points = calculateEarn({
      order: makeOrder({ orderType: 'RENT', totalAmount: 500000 }),
      program: { ...baseProgram, rentEarnEnabled: false },
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });
    expect(points).toBe(0);
  });

  it('returns 0 when saleEarnEnabled=false for SALE order', () => {
    const points = calculateEarn({
      order: makeOrder({ orderType: 'SALE', totalAmount: 500000, status: 'COMPLETED' }),
      program: { ...baseProgram, saleEarnEnabled: false },
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });
    expect(points).toBe(0);
  });
});

describe('calculateEarn — edge cases', () => {
  it('returns 0 for order totalAmount=0', () => {
    const points = calculateEarn({
      order: makeOrder({ totalAmount: 0 }),
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });
    expect(points).toBe(0);
  });

  it('returns 0 when earnPerAmount=0 (division by zero guard)', () => {
    const points = calculateEarn({
      order: makeOrder({ totalAmount: 500000 }),
      program: { ...baseProgram, rentEarnPerAmount: 0 },
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });
    expect(points).toBe(0);
  });

  it('handles very large amounts correctly', () => {
    const points = calculateEarn({
      order: makeOrder({ totalAmount: 100000000 }), // 100M
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: { ...baseTier, multiplier: 2.0 },
    });
    // 100000000 / 10000 * 1 * 2.0 = 20000
    expect(points).toBe(20000);
  });

  it('partial threshold amount is floored (not rounded)', () => {
    const points = calculateEarn({
      order: makeOrder({ totalAmount: 19999 }), // Just under 2x threshold
      program: baseProgram,
      customerLoyalty: baseLoyalty,
      currentTier: baseTier,
    });
    // floor(19999/10000) = 1
    expect(points).toBe(1);
  });
});
