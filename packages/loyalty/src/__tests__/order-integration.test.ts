import { calculateAmountDue } from '../earn';
import { validateRedeem } from '../redeem';
import { calculateEarn } from '../earn';
import type { CustomerLoyaltyLike, LoyaltyProgramLike, LoyaltyTierLike } from '../types';

/**
 * Integration-style tests for order + loyalty money flow (no database).
 * Verifies SALE redeem then earn uses amount after loyalty discount only.
 */
const program: LoyaltyProgramLike = {
  id: 1,
  merchantId: 1,
  name: 'Integration',
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

const tier: LoyaltyTierLike = {
  id: 1,
  programId: 1,
  name: 'Member',
  threshold: 0,
  multiplier: 1,
  sortOrder: 0,
};

const loyalty: CustomerLoyaltyLike = {
  id: 1,
  customerId: 1,
  merchantId: 1,
  points: 100,
  totalEarned: 100,
  totalRedeemed: 0,
  totalSpent: 0,
  totalOrders: 0,
  currentTierId: 1,
};

describe('order + loyalty integration (pure)', () => {
  it('SALE: redeem 100 points then earn on amount after loyalty discount', () => {
    const orderTotal = 450000;
    const redeem = validateRedeem(
      {
        customerId: 1,
        merchantId: 1,
        points: 100,
        orderTotalAmount: orderTotal,
        orderType: 'SALE',
      },
      program,
      loyalty
    );

    expect(redeem.valid).toBe(true);
    expect(redeem.discount).toBe(100000);

    const amountDue = calculateAmountDue(orderTotal, redeem.discount!);
    expect(amountDue).toBe(350000);

    const earned = calculateEarn({
      order: {
        id: 1,
        orderNumber: 'ORD-1',
        orderType: 'SALE',
        status: 'COMPLETED',
        totalAmount: orderTotal,
        loyaltyDiscount: redeem.discount!,
        outletId: 1,
        customerId: 1,
      },
      program,
      customerLoyalty: loyalty,
      currentTier: tier,
    });

    // eligible 350000 -> 35 points
    expect(earned).toBe(35);
  });

  it('RENT: earn uses final totalAmount minus loyalty only', () => {
    const earned = calculateEarn({
      order: {
        id: 2,
        orderNumber: 'ORD-2',
        orderType: 'RENT',
        status: 'RETURNED',
        totalAmount: 520000,
        loyaltyDiscount: 20000,
        outletId: 1,
        customerId: 1,
      },
      program,
      customerLoyalty: loyalty,
      currentTier: tier,
    });

    // eligible 500000 -> 50 points
    expect(earned).toBe(50);
  });
});
