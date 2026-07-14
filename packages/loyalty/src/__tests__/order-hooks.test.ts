import { adjustRedeemOnOrderEdit, handleLoyaltyOnCancel } from '../order-hooks';
import { LOYALTY_TRANSACTION_TYPES } from '../constants';
import type { LoyaltyProgramLike } from '../types';

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
  pointsExpiryMode: 'per_transaction',
  pointsExpiryDays: 30,
  yearlyResetMonth: null,
  yearlyResetDay: null,
};

function createTx() {
  const tx: any = {
    loyaltyProgram: {
      findUnique: jest.fn().mockResolvedValue(baseProgram),
    },
    customerLoyalty: {
      findUnique: jest.fn().mockResolvedValue({ id: 11, points: 70 }),
      update: jest.fn().mockResolvedValue({ id: 11, points: 70 }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 11, points: 70 }),
    },
    loyaltyTransaction: {
      create: jest
        .fn()
        .mockResolvedValueOnce({ id: 101 })
        .mockResolvedValueOnce({ id: 102 })
        .mockResolvedValueOnce({ id: 103 }),
    },
    loyaltyPointLot: {
      create: jest.fn().mockResolvedValue({ id: 201 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    order: {
      update: jest.fn().mockResolvedValue({ id: 1 }),
    },
    loyaltyTier: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  return tx;
}

describe('order-hooks loyalty side effects', () => {
  it('restores redeemed points as a lot and clears earn lots when cancelling', async () => {
    const tx = createTx();

    await handleLoyaltyOnCancel(
      tx,
      {
        id: 1,
        orderNumber: 'ORD-1',
        orderType: 'SALE',
        status: 'CANCELLED',
        totalAmount: 200000,
        loyaltyDiscount: 50000,
        loyaltyPointsRedeemed: 50,
        loyaltyPointsEarned: 20,
        outletId: 7,
        customerId: 99,
      },
      1
    );

    expect(tx.customerLoyalty.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          points: { increment: 50 },
          totalRedeemed: { decrement: 50 },
        }),
      })
    );
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: LOYALTY_TRANSACTION_TYPES.REFUND,
          points: 50,
          orderId: 1,
        }),
      })
    );
    expect(tx.loyaltyPointLot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerLoyaltyId: 11,
          earnTransactionId: 101,
          pointsEarned: 50,
          remainingPoints: 50,
        }),
      })
    );
    expect(tx.loyaltyPointLot.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          earnTransaction: expect.objectContaining({
            orderId: 1,
            type: LOYALTY_TRANSACTION_TYPES.EARN,
          }),
        }),
      })
    );
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          loyaltyPointsRedeemed: 0,
          loyaltyDiscount: 0,
          loyaltyPointsEarned: 0,
        }),
      })
    );
  });

  it('creates a refund lot when redeem is reduced on edit', async () => {
    const tx = createTx();
    tx.customerLoyalty.findUniqueOrThrow.mockResolvedValue({ id: 11, points: 80 });
    tx.customerLoyalty.update.mockResolvedValue({ id: 11, points: 80 });

    await adjustRedeemOnOrderEdit(
      tx,
      {
        id: 1,
        orderNumber: 'ORD-2',
        orderType: 'SALE',
        status: 'COMPLETED',
        totalAmount: 300000,
        loyaltyDiscount: 50000,
        loyaltyPointsRedeemed: 50,
        loyaltyPointsEarned: 0,
        outletId: 7,
        customerId: 99,
      },
      20,
      { id: 5 },
      baseProgram,
      1
    );

    expect(tx.customerLoyalty.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          points: { increment: 30 },
          totalRedeemed: { decrement: 30 },
        }),
      })
    );
    expect(tx.loyaltyTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: LOYALTY_TRANSACTION_TYPES.REFUND,
          points: 30,
          orderId: 1,
          createdById: 5,
        }),
      })
    );
    expect(tx.loyaltyPointLot.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerLoyaltyId: 11,
          earnTransactionId: 101,
          pointsEarned: 30,
          remainingPoints: 30,
        }),
      })
    );
    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          loyaltyPointsRedeemed: 20,
          loyaltyDiscount: 20000,
        }),
      })
    );
  });
});
