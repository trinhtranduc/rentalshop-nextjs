export type BillingInterval = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'YEARLY';

export type TenantStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

export interface TenantRecord {
  id: string;
  tenantKey: string;
  name: string;
  description: string | null;
  primaryDomain: string | null;
  status: TenantStatus;
  databaseUrl: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  subscriptions?: SubscriptionRecord[];
}

export interface PlanRecord {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  interval: BillingInterval;
  trialPeriodDays: number | null;
  isActive: boolean;
  sortOrder: number;
  limits: Record<string, unknown> | null;
  features: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionRecord {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  renewedAt: Date | null;
  lastCheckedAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  plan?: PlanRecord | null;
}

export interface TenantWithSubscription extends TenantRecord {
  subscriptions: SubscriptionRecord[];
}

