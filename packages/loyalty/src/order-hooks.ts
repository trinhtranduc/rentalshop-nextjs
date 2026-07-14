import type { Prisma } from '@prisma/client';
import { LOYALTY_TRANSACTION_TYPES } from './constants';
import { calculateEarn } from './earn';
import { addDays, consumePointLotsFIFO } from './expiry';
import { validateRedeem } from './redeem';
import { evaluateTierUpgrade } from './tier';
import type {
  LoyaltyProgramLike,
  LoyaltyRedeemPayload,
  LoyaltyTierLike,
  LoyaltyUserContext,
  OrderLoyaltyLike,
} from './types';

type TxClient = Prisma.TransactionClient;

async function getDefaultTier(tx: TxClient, programId: number): Promise<LoyaltyTierLike> {
  const tier = await tx.loyaltyTier.findFirst({
    where: { programId },
    orderBy: { sortOrder: 'asc' },
  });

  if (!tier) {
    throw new Error('LOYALTY_DEFAULT_TIER_NOT_FOUND');
  }

  return tier;
}

async function getDefaultTierId(tx: TxClient, programId: number): Promise<number> {
  const tier = await getDefaultTier(tx, programId);
  return tier.id;
}

async function getCurrentBalance(tx: TxClient, customerLoyaltyId: number): Promise<number> {
  const loyalty = await tx.customerLoyalty.findUniqueOrThrow({
    where: { id: customerLoyaltyId },
    select: { points: true },
  });
  return loyalty.points;
}

async function createRefundPointLot(
  tx: TxClient,
  customerLoyaltyId: number,
  refundTransactionId: number,
  points: number,
  program: LoyaltyProgramLike
): Promise<void> {
  if (program.pointsExpiryMode !== 'per_transaction' || points <= 0) return;

  await tx.loyaltyPointLot.create({
    data: {
      customerLoyaltyId,
      earnTransactionId: refundTransactionId,
      pointsEarned: points,
      remainingPoints: points,
      expiresAt: program.pointsExpiryDays
        ? addDays(new Date(), program.pointsExpiryDays)
        : null,
    },
  });
}

export async function getLoyaltyProgram(
  merchantId: number,
  tx?: TxClient
): Promise<LoyaltyProgramLike | null> {
  const client = tx || (await import('@rentalshop/database')).prisma;
  return client.loyaltyProgram.findUnique({
    where: { merchantId },
  });
}

export async function processEarn(
  tx: TxClient,
  order: OrderLoyaltyLike,
  program: LoyaltyProgramLike,
  merchantId: number,
  user?: LoyaltyUserContext | null
): Promise<number> {
  if (!order.customerId) return 0;

  const existing = await tx.loyaltyTransaction.findFirst({
    where: { orderId: order.id, type: LOYALTY_TRANSACTION_TYPES.EARN },
  });
  if (existing) return order.loyaltyPointsEarned || 0;

  const defaultTierId = await getDefaultTierId(tx, program.id);

  const loyalty = await tx.customerLoyalty.upsert({
    where: {
      customerId_merchantId: {
        customerId: order.customerId,
        merchantId,
      },
    },
    create: {
      customerId: order.customerId,
      merchantId,
      points: 0,
      currentTierId: defaultTierId,
    },
    update: {},
  });

  const currentTier = loyalty.currentTierId
    ? await tx.loyaltyTier.findUnique({ where: { id: loyalty.currentTierId } })
    : await getDefaultTier(tx, program.id);

  if (!currentTier) {
    throw new Error('LOYALTY_TIER_NOT_FOUND');
  }

  const earnedPoints = calculateEarn({
    order,
    program,
    customerLoyalty: loyalty,
    currentTier,
  });

  if (earnedPoints <= 0) return 0;

  const earnedMetricAmount = order.totalAmount;
  const updated = await tx.customerLoyalty.update({
    where: { id: loyalty.id },
    data: {
      points: { increment: earnedPoints },
      totalEarned: { increment: earnedPoints },
      totalSpent: { increment: earnedMetricAmount },
      totalOrders: { increment: 1 },
    },
  });

  const earnTransaction = await tx.loyaltyTransaction.create({
    data: {
      customerId: order.customerId,
      merchantId,
      outletId: order.outletId,
      orderId: order.id,
      type: LOYALTY_TRANSACTION_TYPES.EARN,
      points: earnedPoints,
      balanceAfter: updated.points,
      description: `Tích điểm từ đơn #${order.orderNumber}`,
      metadata: JSON.stringify({
        multiplier: currentTier.multiplier,
        tierName: currentTier.name,
      }),
      createdById: user?.id ?? null,
    },
  });

  if (program.pointsExpiryMode === 'per_transaction' && program.pointsExpiryDays) {
    await tx.loyaltyPointLot.create({
      data: {
        customerLoyaltyId: updated.id,
        earnTransactionId: earnTransaction.id,
        pointsEarned: earnedPoints,
        remainingPoints: earnedPoints,
        expiresAt: addDays(new Date(), program.pointsExpiryDays),
      },
    });
  }

  await tx.order.update({
    where: { id: order.id },
    data: { loyaltyPointsEarned: earnedPoints },
  });

  const tiers = await tx.loyaltyTier.findMany({ where: { programId: program.id } });
  const newTier = evaluateTierUpgrade(updated, program, tiers);
  if (newTier) {
    await tx.customerLoyalty.update({
      where: { id: updated.id },
      data: { currentTierId: newTier.id },
    });

    await tx.loyaltyTransaction.create({
      data: {
        customerId: order.customerId,
        merchantId,
        outletId: order.outletId,
        orderId: order.id,
        type: LOYALTY_TRANSACTION_TYPES.TIER_UPGRADE,
        points: 0,
        balanceAfter: updated.points,
        description: `Lên hạng ${newTier.name}!`,
        metadata: JSON.stringify({
          fromTier: currentTier.name,
          toTier: newTier.name,
        }),
        createdById: user?.id ?? null,
      },
    });
  }

  return earnedPoints;
}

export async function handleLoyaltyOnOrderCreate(
  order: OrderLoyaltyLike,
  loyaltyRedeem: LoyaltyRedeemPayload | undefined,
  user: LoyaltyUserContext,
  merchantId: number,
  tx?: TxClient
): Promise<OrderLoyaltyLike> {
  if (!order.customerId) return order;

  const run = async (client: TxClient) => {
    const program = await client.loyaltyProgram.findUnique({
      where: { merchantId },
    });

    if (!program || !program.isActive) return order;

    if (loyaltyRedeem?.points && loyaltyRedeem.points > 0) {
      const loyalty = await client.customerLoyalty.findUnique({
        where: {
          customerId_merchantId: {
            customerId: order.customerId!,
            merchantId,
          },
        },
      });

      const validation = validateRedeem(
        {
          customerId: order.customerId!,
          merchantId,
          points: loyaltyRedeem.points,
          orderTotalAmount: order.totalAmount,
          orderType: order.orderType,
        },
        program,
        loyalty
      );

      if (!validation.valid) {
        throw new Error(validation.reason || 'LOYALTY_REDEEM_INVALID');
      }

      if (!loyalty) {
        throw new Error('NO_LOYALTY_RECORD');
      }

      const updatedCount = await client.customerLoyalty.updateMany({
        where: { id: loyalty.id, points: { gte: loyaltyRedeem.points } },
        data: {
          points: { decrement: loyaltyRedeem.points },
          totalRedeemed: { increment: loyaltyRedeem.points },
        },
      });

      if (updatedCount.count !== 1) {
        throw new Error('INSUFFICIENT_POINTS');
      }

      if (program.pointsExpiryMode === 'per_transaction') {
        await consumePointLotsFIFO(client, loyalty.id, loyaltyRedeem.points);
      }

      const updated = await client.customerLoyalty.findUniqueOrThrow({
        where: { id: loyalty.id },
      });

      const discount = loyaltyRedeem.points * program.pointValue;

      await client.loyaltyTransaction.create({
        data: {
          customerId: order.customerId!,
          merchantId,
          outletId: order.outletId,
          orderId: order.id,
          type: LOYALTY_TRANSACTION_TYPES.REDEEM,
          points: -loyaltyRedeem.points,
          balanceAfter: updated.points,
          description: `Đổi điểm cho đơn #${order.orderNumber}`,
          createdById: user.id,
        },
      });

      order = await client.order.update({
        where: { id: order.id },
        data: {
          loyaltyPointsRedeemed: loyaltyRedeem.points,
          loyaltyDiscount: discount,
        },
      });
    }

    if (order.orderType === 'SALE') {
      const orderForEarn = await client.order.findUniqueOrThrow({
        where: { id: order.id },
      });
      await processEarn(client, orderForEarn, program, merchantId, user);
      order = orderForEarn;
    }

    return order;
  };

  if (tx) {
    return run(tx);
  }

  const { prisma } = await import('@rentalshop/database');
  return prisma.$transaction(run);
}

export async function handleLoyaltyOnCancel(
  tx: TxClient,
  order: OrderLoyaltyLike,
  merchantId: number
): Promise<void> {
  if (!order.customerId) return;

  const loyalty = await tx.customerLoyalty.findUnique({
    where: {
      customerId_merchantId: {
        customerId: order.customerId,
        merchantId,
      },
    },
  });

  if (!loyalty) return;

  const program = await tx.loyaltyProgram.findUnique({
    where: { merchantId },
  });

  if (order.loyaltyPointsRedeemed && order.loyaltyPointsRedeemed > 0) {
    const updated = await tx.customerLoyalty.update({
      where: { id: loyalty.id },
      data: {
        points: { increment: order.loyaltyPointsRedeemed },
        totalRedeemed: { decrement: order.loyaltyPointsRedeemed },
      },
    });

    const refundTransaction = await tx.loyaltyTransaction.create({
      data: {
        customerId: order.customerId,
        merchantId,
        outletId: order.outletId,
        orderId: order.id,
        type: LOYALTY_TRANSACTION_TYPES.REFUND,
        points: order.loyaltyPointsRedeemed,
        balanceAfter: updated.points,
        description: `Hoàn điểm do hủy đơn #${order.orderNumber}`,
      },
    });

    if (program) {
      await createRefundPointLot(
        tx,
        loyalty.id,
        refundTransaction.id,
        order.loyaltyPointsRedeemed,
        program
      );
    }
  }

  if (order.loyaltyPointsEarned && order.loyaltyPointsEarned > 0) {
    const updated = await tx.customerLoyalty.update({
      where: { id: loyalty.id },
      data: {
        points: { decrement: order.loyaltyPointsEarned },
        totalEarned: { decrement: order.loyaltyPointsEarned },
      },
    });

    await tx.loyaltyTransaction.create({
      data: {
        customerId: order.customerId,
        merchantId,
        outletId: order.outletId,
        orderId: order.id,
        type: LOYALTY_TRANSACTION_TYPES.ADJUST,
        points: -order.loyaltyPointsEarned,
        balanceAfter: updated.points,
        description: `Thu hồi điểm do hủy đơn #${order.orderNumber}`,
      },
    });

    if (program?.pointsExpiryMode === 'per_transaction') {
      await tx.loyaltyPointLot.deleteMany({
        where: {
          earnTransaction: {
            orderId: order.id,
            type: LOYALTY_TRANSACTION_TYPES.EARN,
          },
        },
      });
    }
  }

  await tx.order.update({
    where: { id: order.id },
    data: {
      loyaltyPointsRedeemed: 0,
      loyaltyDiscount: 0,
      loyaltyPointsEarned: 0,
    },
  });
}

export async function adjustRedeemOnOrderEdit(
  tx: TxClient,
  order: OrderLoyaltyLike,
  nextPoints: number,
  user: LoyaltyUserContext,
  program: LoyaltyProgramLike,
  merchantId: number
): Promise<void> {
  if (!order.customerId) return;

  const currentPoints = order.loyaltyPointsRedeemed || 0;
  const delta = nextPoints - currentPoints;
  if (delta === 0) return;

  const loyalty = await tx.customerLoyalty.findUniqueOrThrow({
    where: {
      customerId_merchantId: {
        customerId: order.customerId,
        merchantId,
      },
    },
  });

  if (delta > 0) {
    const updatedCount = await tx.customerLoyalty.updateMany({
      where: { id: loyalty.id, points: { gte: delta } },
      data: {
        points: { decrement: delta },
        totalRedeemed: { increment: delta },
      },
    });

    if (updatedCount.count !== 1) {
      throw new Error('INSUFFICIENT_POINTS');
    }

    if (program.pointsExpiryMode === 'per_transaction') {
      await consumePointLotsFIFO(tx, loyalty.id, delta);
    }
  } else {
    const refundPoints = Math.abs(delta);
    const updated = await tx.customerLoyalty.update({
      where: { id: loyalty.id },
      data: {
        points: { increment: refundPoints },
        totalRedeemed: { decrement: refundPoints },
      },
    });

    const refundTransaction = await tx.loyaltyTransaction.create({
      data: {
        customerId: order.customerId,
        merchantId,
        outletId: order.outletId,
        orderId: order.id,
        type: LOYALTY_TRANSACTION_TYPES.REFUND,
        points: refundPoints,
        balanceAfter: updated.points,
        description: `Hoàn điểm điều chỉnh cho đơn #${order.orderNumber}`,
        createdById: user.id,
      },
    });

    await createRefundPointLot(
      tx,
      loyalty.id,
      refundTransaction.id,
      refundPoints,
      program
    );

    const loyaltyDiscount = nextPoints * program.pointValue;
    await tx.order.update({
      where: { id: order.id },
      data: {
        loyaltyPointsRedeemed: nextPoints,
        loyaltyDiscount,
      },
    });

    return;
  }

  const loyaltyDiscount = nextPoints * program.pointValue;
  await tx.order.update({
    where: { id: order.id },
    data: {
      loyaltyPointsRedeemed: nextPoints,
      loyaltyDiscount,
    },
  });

  await tx.loyaltyTransaction.create({
    data: {
      customerId: order.customerId,
      merchantId,
      outletId: order.outletId,
      orderId: order.id,
      type: LOYALTY_TRANSACTION_TYPES.REDEEM,
      points: -delta,
      balanceAfter: await getCurrentBalance(tx, loyalty.id),
      description: `Điều chỉnh điểm cho đơn #${order.orderNumber}`,
      createdById: user.id,
    },
  });
}

export async function processEarnOnStatusChange(
  tx: TxClient,
  order: OrderLoyaltyLike,
  merchantId: number,
  user?: LoyaltyUserContext | null
): Promise<number> {
  const program = await tx.loyaltyProgram.findUnique({
    where: { merchantId },
  });

  if (!program || !program.isActive || !order.customerId) return 0;

  return processEarn(tx, order, program, merchantId, user);
}
