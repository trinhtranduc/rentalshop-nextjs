import { prisma } from '@rentalshop/database';
import type { CustomerLoyaltySnapshot } from '@rentalshop/types';

type LoyaltyRow = {
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  totalSpent: number;
  totalOrders: number;
  currentTier?: {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    multiplier: number;
  } | null;
} | null;

function toSnapshot(row: LoyaltyRow): CustomerLoyaltySnapshot | null {
  if (!row) {
    return null;
  }

  return {
    points: row.points,
    totalEarned: row.totalEarned,
    totalRedeemed: row.totalRedeemed,
    totalSpent: row.totalSpent,
    totalOrders: row.totalOrders,
    tier: row.currentTier
      ? {
          id: row.currentTier.id,
          name: row.currentTier.name,
          color: row.currentTier.color,
          icon: row.currentTier.icon,
          multiplier: row.currentTier.multiplier,
        }
      : null,
  };
}

export async function fetchCustomerLoyaltySnapshots(customerIds: number[]) {
  if (customerIds.length === 0) {
    return new Map<number, CustomerLoyaltySnapshot>();
  }

  const rows = await prisma.customerLoyalty.findMany({
    where: {
      customerId: { in: customerIds },
    },
    include: {
      currentTier: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          multiplier: true,
        },
      },
    },
  });

  const snapshots = new Map<number, CustomerLoyaltySnapshot>();
  for (const row of rows) {
    const snapshot = toSnapshot(row);
    if (snapshot) {
      snapshots.set(row.customerId, snapshot);
    }
  }

  return snapshots;
}

export async function fetchCustomerLoyaltySnapshot(customerId: number) {
  const row = await prisma.customerLoyalty.findFirst({
    where: { customerId },
    include: {
      currentTier: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          multiplier: true,
        },
      },
    },
  });

  return toSnapshot(row);
}

export async function fetchMerchantLoyaltyStatus(merchantId: number): Promise<'active' | 'inactive'> {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { merchantId },
    select: { isActive: true },
  });

  return program?.isActive ? 'active' : 'inactive';
}

export async function fetchMerchantLoyaltyStatuses(merchantIds: number[]) {
  if (merchantIds.length === 0) {
    return new Map<number, 'active' | 'inactive'>();
  }

  const programs = await prisma.loyaltyProgram.findMany({
    where: {
      merchantId: { in: merchantIds },
    },
    select: {
      merchantId: true,
      isActive: true,
    },
  });

  const statusMap = new Map<number, 'active' | 'inactive'>();
  for (const merchantId of merchantIds) {
    statusMap.set(merchantId, 'inactive');
  }

  for (const program of programs) {
    statusMap.set(program.merchantId, program.isActive ? 'active' : 'inactive');
  }

  return statusMap;
}
