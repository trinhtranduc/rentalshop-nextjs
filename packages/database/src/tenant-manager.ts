import type { PrismaClient } from '@prisma/client';
import { createPrismaClientForUrl } from './client';
import {
  findTenantByKey,
  findTenantById,
  TenantWithSubscription,
  SubscriptionRecord,
  PlanRecord,
  TenantStatus,
} from './main';

export type TenantIdentifier = { tenantId?: string; tenantKey?: string };

const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const DEFAULT_CACHE_SIZE = 50;

export class TenantManagerError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'TenantManagerError';
  }
}

export class TenantNotFoundError extends TenantManagerError {
  constructor(identifier: TenantIdentifier) {
    super(`Tenant not found (${JSON.stringify(identifier)})`, 'TENANT_NOT_FOUND');
  }
}

export class TenantInactiveError extends TenantManagerError {
  constructor(status: TenantStatus, identifier: TenantIdentifier) {
    super(`Tenant is not active (status: ${status})`, 'TENANT_INACTIVE');
    this.details = identifier;
  }

  details: TenantIdentifier;
}

export class TenantSubscriptionError extends TenantManagerError {
  constructor(message: string) {
    super(message, 'TENANT_SUBSCRIPTION_INVALID');
  }
}

export interface TenantContext {
  tenant: TenantWithSubscription;
  subscription: SubscriptionRecord | null;
  plan: PlanRecord | null;
  prisma: PrismaClient;
}

interface TenantCacheEntry extends TenantContext {
  lastAccessed: number;
}

function normalizeTenantKey(tenantKey: string): string {
  return tenantKey.trim().toLowerCase();
}

function isSubscriptionValid(subscription: SubscriptionRecord | null): boolean {
  if (!subscription) {
    return false;
  }

  if (subscription.status === 'CANCELLED') {
    return false;
  }

  if (subscription.status === 'PAST_DUE') {
    return false;
  }

  if (subscription.status === 'ACTIVE') {
    return subscription.currentPeriodEnd > new Date();
  }

  if (subscription.status === 'TRIAL') {
    const trialEnd = subscription.trialEndsAt ?? subscription.currentPeriodEnd;
    return trialEnd > new Date();
  }

  return false;
}

export class TenantManager {
  private tenantCache = new Map<string, TenantCacheEntry>();

  private readonly cacheTtl: number;

  private readonly maxCacheSize: number;

  constructor(options?: { cacheTtlMs?: number; cacheSize?: number }) {
    this.cacheTtl = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.maxCacheSize = options?.cacheSize ?? DEFAULT_CACHE_SIZE;
  }

  private enforceCacheSizeLimit() {
    if (this.tenantCache.size <= this.maxCacheSize) {
      return;
    }

    const entries = Array.from(this.tenantCache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const excess = this.tenantCache.size - this.maxCacheSize;
    for (let i = 0; i < excess; i += 1) {
      const [key, entry] = entries[i];
      entry.prisma.$disconnect().catch(() => null);
      this.tenantCache.delete(key);
    }
  }

  private isEntryExpired(entry: TenantCacheEntry): boolean {
    return Date.now() - entry.lastAccessed > this.cacheTtl;
  }

  private ensureTenantIsActive(tenant: TenantWithSubscription, identifier: TenantIdentifier) {
    if (tenant.status !== 'ACTIVE') {
      throw new TenantInactiveError(tenant.status, identifier);
    }
  }

  private extractSubscription(tenant: TenantWithSubscription): SubscriptionRecord | null {
    if (!tenant.subscriptions || tenant.subscriptions.length === 0) {
      return null;
    }

    return tenant.subscriptions[0];
  }

  private buildTenantContext(
    tenant: TenantWithSubscription,
    prisma: PrismaClient
  ): TenantCacheEntry {
    const subscription = this.extractSubscription(tenant);

    if (!isSubscriptionValid(subscription)) {
      throw new TenantSubscriptionError(
        'Tenant subscription is missing or not in an active/trial state.'
      );
    }

    return {
      tenant,
      subscription,
      plan: subscription?.plan ?? null,
      prisma,
      lastAccessed: Date.now(),
    };
  }

  private createTenantClient(databaseUrl: string): PrismaClient {
    return createPrismaClientForUrl(databaseUrl);
  }

  private async resolveTenant(identifier: TenantIdentifier): Promise<TenantWithSubscription> {
    if (identifier.tenantId) {
      const tenant = await findTenantById(identifier.tenantId);
      if (tenant) {
        return tenant;
      }
    }

    if (identifier.tenantKey) {
      const tenant = await findTenantByKey(normalizeTenantKey(identifier.tenantKey));
      if (tenant) {
        return tenant;
      }
    }

    throw new TenantNotFoundError(identifier);
  }

  async getTenantContext(identifier: TenantIdentifier): Promise<TenantContext> {
    if (!identifier.tenantId && !identifier.tenantKey) {
      throw new TenantManagerError('Tenant identifier required', 'TENANT_IDENTIFIER_MISSING');
    }

    const cacheKey =
      identifier.tenantId ?? normalizeTenantKey(identifier.tenantKey as string);

    const cached = this.tenantCache.get(cacheKey);
    if (cached && !this.isEntryExpired(cached)) {
      cached.lastAccessed = Date.now();
      return {
        tenant: cached.tenant,
        subscription: cached.subscription,
        plan: cached.plan,
        prisma: cached.prisma,
      };
    }

    if (cached) {
      cached.prisma.$disconnect().catch(() => null);
      this.tenantCache.delete(cacheKey);
    }

    const tenant = await this.resolveTenant(identifier);
    this.ensureTenantIsActive(tenant, identifier);
    const prisma = this.createTenantClient(tenant.databaseUrl);
    const context = this.buildTenantContext(tenant, prisma);

    this.tenantCache.set(cacheKey, context);
    this.enforceCacheSizeLimit();

    return {
      tenant: context.tenant,
      subscription: context.subscription,
      plan: context.plan,
      prisma: context.prisma,
    };
  }

  async getCachedTenantContext(cacheKey: string): Promise<TenantContext | null> {
    const cached = this.tenantCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    if (this.isEntryExpired(cached)) {
      cached.prisma.$disconnect().catch(() => null);
      this.tenantCache.delete(cacheKey);
      return null;
    }

    cached.lastAccessed = Date.now();
    return {
      tenant: cached.tenant,
      subscription: cached.subscription,
      plan: cached.plan,
      prisma: cached.prisma,
    };
  }

  invalidateTenant(cacheKey: string) {
    const cached = this.tenantCache.get(cacheKey);
    if (cached) {
      cached.prisma.$disconnect().catch(() => null);
      this.tenantCache.delete(cacheKey);
    }
  }

  async shutdown() {
    await Promise.all(
      Array.from(this.tenantCache.values()).map((entry) => entry.prisma.$disconnect())
    );
    this.tenantCache.clear();
  }
}

export const tenantManager = new TenantManager({
  cacheTtlMs:
    process.env.TENANT_CLIENT_CACHE_TTL_MS !== undefined
      ? Number(process.env.TENANT_CLIENT_CACHE_TTL_MS)
      : undefined,
  cacheSize:
    process.env.TENANT_CLIENT_CACHE_SIZE !== undefined
      ? Number(process.env.TENANT_CLIENT_CACHE_SIZE)
      : undefined,
});

