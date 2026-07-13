import type { Prisma } from '@prisma/client';
import { LOYALTY_TRANSACTION_TYPES } from './constants';
import type { LoyaltyProgramLike } from './types';

type TxClient = Prisma.TransactionClient;

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function isYearlyResetDate(
  program: LoyaltyProgramLike,
  now: Date = new Date()
): boolean {
  if (program.pointsExpiryMode !== 'yearly_reset') return false;
  if (!program.yearlyResetMonth || !program.yearlyResetDay) return false;

  return (
    now.getMonth() + 1 === program.yearlyResetMonth &&
    now.getDate() === program.yearlyResetDay
  );
}

async function expireLot(
  tx: TxClient,
  lot: {
    id: number;
    customerLoyaltyId: number;
    remainingPoints: number;
    customerLoyalty: { customerId: number; merchantId: number; points: number };
  },
  merchantId: number
): Promise<void> {
  if (lot.remainingPoints <= 0) return;

  const updatedLoyalty = await tx.customerLoyalty.update({
    where: { id: lot.customerLoyaltyId },
    data: {
      points: { decrement: lot.remainingPoints },
    },
  });

  await tx.loyaltyPointLot.update({
    where: { id: lot.id },
    data: { remainingPoints: 0 },
  });

  await tx.loyaltyTransaction.create({
    data: {
      customerId: lot.customerLoyalty.customerId,
      merchantId,
      type: LOYALTY_TRANSACTION_TYPES.EXPIRE,
      points: -lot.remainingPoints,
      balanceAfter: updatedLoyalty.points,
      description: `Điểm hết hạn (${lot.remainingPoints} điểm)`,
      metadata: JSON.stringify({ lotId: lot.id }),
    },
  });
}

export async function resetMerchantBalances(
  tx: TxClient,
  merchantId: number
): Promise<number> {
  const wallets = await tx.customerLoyalty.findMany({
    where: { merchantId, points: { gt: 0 } },
  });

  let resetCount = 0;
  for (const wallet of wallets) {
    const expiredPoints = wallet.points;
    const updated = await tx.customerLoyalty.update({
      where: { id: wallet.id },
      data: { points: 0 },
    });

    await tx.loyaltyPointLot.updateMany({
      where: { customerLoyaltyId: wallet.id, remainingPoints: { gt: 0 } },
      data: { remainingPoints: 0 },
    });

    await tx.loyaltyTransaction.create({
      data: {
        customerId: wallet.customerId,
        merchantId,
        type: LOYALTY_TRANSACTION_TYPES.EXPIRE,
        points: -expiredPoints,
        balanceAfter: updated.points,
        description: 'Reset điểm hàng năm',
        metadata: JSON.stringify({ mode: 'yearly_reset' }),
      },
    });

    resetCount += 1;
  }

  return resetCount;
}

export async function expirePointsDaily(
  tx: TxClient,
  program: LoyaltyProgramLike,
  now: Date = new Date()
): Promise<{ expiredLots: number; resetWallets: number }> {
  let expiredLots = 0;
  let resetWallets = 0;

  if (program.pointsExpiryMode === 'never') {
    return { expiredLots, resetWallets };
  }

  if (program.pointsExpiryMode === 'per_transaction') {
    const lots = await tx.loyaltyPointLot.findMany({
      where: {
        expiresAt: { lt: now },
        remainingPoints: { gt: 0 },
        customerLoyalty: { merchantId: program.merchantId },
      },
      include: {
        customerLoyalty: {
          select: { customerId: true, merchantId: true, points: true },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });

    for (const lot of lots) {
      await expireLot(tx, lot, program.merchantId);
      expiredLots += 1;
    }
  }

  if (program.pointsExpiryMode === 'yearly_reset' && isYearlyResetDate(program, now)) {
    resetWallets = await resetMerchantBalances(tx, program.merchantId);
  }

  return { expiredLots, resetWallets };
}

export async function consumePointLotsFIFO(
  tx: TxClient,
  customerLoyaltyId: number,
  pointsToConsume: number
): Promise<void> {
  let remaining = pointsToConsume;

  const lots = await tx.loyaltyPointLot.findMany({
    where: {
      customerLoyaltyId,
      remainingPoints: { gt: 0 },
    },
    orderBy: [{ expiresAt: 'asc' }, { createdAt: 'asc' }],
  });

  for (const lot of lots) {
    if (remaining <= 0) break;

    const consume = Math.min(lot.remainingPoints, remaining);
    await tx.loyaltyPointLot.update({
      where: { id: lot.id },
      data: { remainingPoints: { decrement: consume } },
    });
    remaining -= consume;
  }
}

export { addDays };
