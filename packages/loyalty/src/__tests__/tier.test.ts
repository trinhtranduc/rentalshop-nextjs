import { evaluateTierUpgrade } from '../tier';
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

const tiers: LoyaltyTierLike[] = [
  { id: 1, programId: 1, name: 'Thành viên', threshold: 0, multiplier: 1.0, sortOrder: 0 },
  { id: 2, programId: 1, name: 'Bạc', threshold: 500000, multiplier: 1.2, sortOrder: 1 },
  { id: 3, programId: 1, name: 'Vàng', threshold: 2000000, multiplier: 1.5, sortOrder: 2 },
  { id: 4, programId: 1, name: 'Kim Cương', threshold: 10000000, multiplier: 2.0, sortOrder: 3 },
];

function makeLoyalty(overrides: Partial<CustomerLoyaltyLike> = {}): CustomerLoyaltyLike {
  return {
    id: 1,
    customerId: 1,
    merchantId: 1,
    points: 0,
    totalEarned: 0,
    totalRedeemed: 0,
    totalSpent: 0,
    totalOrders: 0,
    currentTierId: 1,
    ...overrides,
  };
}

describe('evaluateTierUpgrade', () => {
  describe('total_spend metric', () => {
    it('returns null when customer already at correct tier', () => {
      const loyalty = makeLoyalty({ totalSpent: 300000, currentTierId: 1 });
      const result = evaluateTierUpgrade(loyalty, baseProgram, tiers);
      expect(result).toBeNull();
    });

    it('upgrades from Thành viên to Bạc at threshold', () => {
      const loyalty = makeLoyalty({ totalSpent: 500000, currentTierId: 1 });
      const result = evaluateTierUpgrade(loyalty, baseProgram, tiers);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Bạc');
      expect(result!.id).toBe(2);
    });

    it('upgrades directly to Vàng if spend exceeds Vàng threshold', () => {
      const loyalty = makeLoyalty({ totalSpent: 3000000, currentTierId: 1 });
      const result = evaluateTierUpgrade(loyalty, baseProgram, tiers);
      expect(result!.name).toBe('Vàng');
    });

    it('upgrades from Bạc to Kim Cương (skip Vàng)', () => {
      const loyalty = makeLoyalty({ totalSpent: 15000000, currentTierId: 2 });
      const result = evaluateTierUpgrade(loyalty, baseProgram, tiers);
      expect(result!.name).toBe('Kim Cương');
    });

    it('never downgrades (returns null even if spend below current tier)', () => {
      // Customer is Gold but spend dropped (cancel scenario — though we don't decrement)
      const loyalty = makeLoyalty({ totalSpent: 100000, currentTierId: 3 });
      const result = evaluateTierUpgrade(loyalty, baseProgram, tiers);
      expect(result).toBeNull(); // No upgrade, no downgrade
    });

    it('returns null when already at highest tier', () => {
      const loyalty = makeLoyalty({ totalSpent: 50000000, currentTierId: 4 });
      const result = evaluateTierUpgrade(loyalty, baseProgram, tiers);
      expect(result).toBeNull();
    });
  });

  describe('total_orders metric', () => {
    const orderProgram = { ...baseProgram, tierMetric: 'total_orders' };
    const orderTiers: LoyaltyTierLike[] = [
      { id: 1, programId: 1, name: 'Mới', threshold: 0, multiplier: 1.0, sortOrder: 0 },
      { id: 2, programId: 1, name: 'Thường xuyên', threshold: 5, multiplier: 1.2, sortOrder: 1 },
      { id: 3, programId: 1, name: 'VIP', threshold: 20, multiplier: 1.5, sortOrder: 2 },
    ];

    it('upgrades based on totalOrders not totalSpent', () => {
      const loyalty = makeLoyalty({ totalOrders: 5, totalSpent: 100, currentTierId: 1 });
      const result = evaluateTierUpgrade(loyalty, orderProgram, orderTiers);
      expect(result!.name).toBe('Thường xuyên');
    });

    it('does not upgrade if orders below threshold', () => {
      const loyalty = makeLoyalty({ totalOrders: 3, currentTierId: 1 });
      const result = evaluateTierUpgrade(loyalty, orderProgram, orderTiers);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles empty tiers array', () => {
      const loyalty = makeLoyalty({ totalSpent: 5000000 });
      const result = evaluateTierUpgrade(loyalty, baseProgram, []);
      expect(result).toBeNull();
    });

    it('handles null currentTierId (new customer)', () => {
      const loyalty = makeLoyalty({ totalSpent: 600000, currentTierId: null });
      const result = evaluateTierUpgrade(loyalty, baseProgram, tiers);
      expect(result!.name).toBe('Bạc');
    });

    it('handles currentTierId pointing to deleted tier', () => {
      const loyalty = makeLoyalty({ totalSpent: 600000, currentTierId: 999 });
      const result = evaluateTierUpgrade(loyalty, baseProgram, tiers);
      // currentTier not found in tiers → treats as upgrade
      expect(result!.name).toBe('Bạc');
    });
  });
});
