import { prisma } from '@rentalshop/database';
import type { LoyaltyCustomerSummary } from '@rentalshop/types';
import { calculateEarn } from './earn';
import { getNextTier } from './tier';
import type { LoyaltyProgramLike, LoyaltyTierLike } from './types';

export async function ensureDefaultTier(programId: number): Promise<LoyaltyTierLike> {
  const existing = await prisma.loyaltyTier.findFirst({
    where: { programId, threshold: 0 },
    orderBy: { sortOrder: 'asc' },
  });

  if (existing) return existing;

  return prisma.loyaltyTier.create({
    data: {
      programId,
      name: 'Thành viên',
      threshold: 0,
      multiplier: 1,
      color: '#888888',
      sortOrder: 0,
    },
  });
}

export async function upsertLoyaltyProgram(
  merchantId: number,
  data: Partial<LoyaltyProgramLike> & { name: string }
) {
  const program = await prisma.loyaltyProgram.upsert({
    where: { merchantId },
    create: {
      merchantId,
      name: data.name,
      isActive: data.isActive ?? true,
      rentEarnEnabled: data.rentEarnEnabled ?? true,
      rentEarnRate: data.rentEarnRate ?? 1,
      rentEarnPerAmount: data.rentEarnPerAmount ?? 10000,
      saleEarnEnabled: data.saleEarnEnabled ?? true,
      saleEarnRate: data.saleEarnRate ?? 1,
      saleEarnPerAmount: data.saleEarnPerAmount ?? 10000,
      pointValue: data.pointValue ?? 1000,
      minRedeemPoints: data.minRedeemPoints ?? 10,
      maxRedeemPercent: data.maxRedeemPercent ?? 50,
      redeemOnRent: data.redeemOnRent ?? true,
      redeemOnSale: data.redeemOnSale ?? true,
      tierMetric: data.tierMetric ?? 'total_spend',
      tierPeriod: data.tierPeriod ?? 'lifetime',
      tierDowngrade: data.tierDowngrade ?? 'never',
      pointsExpiryMode: data.pointsExpiryMode ?? 'never',
      pointsExpiryDays: data.pointsExpiryDays ?? null,
      yearlyResetMonth: data.yearlyResetMonth ?? null,
      yearlyResetDay: data.yearlyResetDay ?? null,
    },
    update: {
      ...data,
      updatedAt: new Date(),
    },
  });

  await ensureDefaultTier(program.id);
  return program;
}

export async function getOrCreateCustomerLoyalty(
  customerId: number,
  merchantId: number,
  programId: number
) {
  const defaultTier = await ensureDefaultTier(programId);

  return prisma.customerLoyalty.upsert({
    where: {
      customerId_merchantId: { customerId, merchantId },
    },
    create: {
      customerId,
      merchantId,
      points: 0,
      currentTierId: defaultTier.id,
    },
    update: {},
    include: {
      currentTier: true,
    },
  });
}

export async function buildCustomerSummary(
  customerId: number,
  merchantId: number
): Promise<LoyaltyCustomerSummary | null> {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { merchantId },
    include: { tiers: { orderBy: { sortOrder: 'asc' } } },
  });

  if (!program) return null;

  const loyalty = await getOrCreateCustomerLoyalty(customerId, merchantId, program.id);
  const defaultTier = program.tiers.find((tier) => tier.threshold === 0) || program.tiers[0];
  const currentTier = loyalty.currentTier || defaultTier;
  const nextTierInfo = getNextTier(loyalty, program, program.tiers);

  const maxByPercent = Math.floor(
    (1000000 * program.maxRedeemPercent) / 100 / program.pointValue
  );
  const maxRedeemPoints = Math.min(loyalty.points, maxByPercent);

  return {
    customerId,
    points: loyalty.points,
    totalEarned: loyalty.totalEarned,
    totalRedeemed: loyalty.totalRedeemed,
    totalSpent: loyalty.totalSpent,
    totalOrders: loyalty.totalOrders,
    tier: currentTier
      ? {
          id: currentTier.id,
          name: currentTier.name,
          color: currentTier.color,
          icon: currentTier.icon,
          multiplier: currentTier.multiplier,
        }
      : null,
    nextTier: nextTierInfo
      ? {
          name: nextTierInfo.tier.name,
          threshold: nextTierInfo.tier.threshold,
          remaining: nextTierInfo.remaining,
        }
      : null,
    canRedeem: program.isActive && loyalty.points >= program.minRedeemPoints,
    maxRedeemPoints,
  };
}

export async function estimateEarnPoints(input: {
  customerId: number;
  merchantId: number;
  orderType: 'RENT' | 'SALE';
  orderTotalAmount: number;
  loyaltyDiscount?: number;
}) {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { merchantId: input.merchantId },
    include: { tiers: true },
  });

  if (!program || !program.isActive) {
    return {
      estimatedPoints: 0,
      eligibleAmount: 0,
      tier: null,
      isEstimate: true,
    };
  }

  const loyalty = await getOrCreateCustomerLoyalty(
    input.customerId,
    input.merchantId,
    program.id
  );

  const currentTier =
    loyalty.currentTier ||
    program.tiers.find((tier) => tier.threshold === 0) ||
    program.tiers[0];

  const loyaltyDiscount = input.loyaltyDiscount || 0;
  const estimatedPoints = calculateEarn({
    order: {
      id: 0,
      orderNumber: '',
      orderType: input.orderType,
      status: 'RESERVED',
      totalAmount: input.orderTotalAmount,
      loyaltyDiscount,
      outletId: 0,
      customerId: input.customerId,
    },
    program,
    customerLoyalty: loyalty,
    currentTier: currentTier!,
  });

  return {
    estimatedPoints,
    eligibleAmount: Math.max(0, input.orderTotalAmount - loyaltyDiscount),
    tier: currentTier
      ? {
          id: currentTier.id,
          name: currentTier.name,
          multiplier: currentTier.multiplier,
        }
      : null,
    isEstimate: true,
  };
}

export async function assertCustomerInMerchantScope(
  customerId: number,
  merchantId: number
): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, merchantId, deletedAt: null },
    select: { id: true },
  });

  if (!customer) {
    throw new Error('CUSTOMER_NOT_FOUND');
  }
}
