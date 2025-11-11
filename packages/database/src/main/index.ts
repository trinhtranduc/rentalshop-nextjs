import type { TenantWithSubscription, PlanRecord, SubscriptionRecord } from './types';
import { getMainPrismaClient } from './client';

export async function findTenantByKey(tenantKey: string): Promise<TenantWithSubscription | null> {
  const prisma = getMainPrismaClient();
  return prisma.tenant.findUnique({
    where: { tenantKey },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { plan: true },
      },
    },
  }) as Promise<TenantWithSubscription | null>;
}

export async function findTenantById(id: string): Promise<TenantWithSubscription | null> {
    const prisma = getMainPrismaClient();
    return prisma.tenant.findUnique({
    where: { id },
    include: {
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { plan: true },
      },
    },
  }) as Promise<TenantWithSubscription | null>;
}

export async function listPlans(): Promise<PlanRecord[]> {
  const prisma = getMainPrismaClient();
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  }) as Promise<PlanRecord[]>;
}

export async function listTenantSubscriptions(tenantId: string): Promise<SubscriptionRecord[]> {
  const prisma = getMainPrismaClient();
  return prisma.subscription.findMany({
    where: { tenantId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  }) as Promise<SubscriptionRecord[]>;
}

export { getMainPrismaClient } from './client';
export * from './types';

