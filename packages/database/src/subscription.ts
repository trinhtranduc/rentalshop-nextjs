// ============================================================================
// SIMPLIFIED SUBSCRIPTION DATABASE FUNCTIONS
// ============================================================================

import { prisma } from './client';
import { calculateSubscriptionPrice, getPricingBreakdown } from '@rentalshop/utils';
import type { 
  Subscription, 
  Plan, 
  PlanLimits,
  SubscriptionCreateInput, 
  SubscriptionUpdateInput,
  SubscriptionStatus,
  BillingInterval
} from '@rentalshop/types';

// ============================================================================
// PRICING UTILITIES
// ============================================================================

export function calculatePlanPricing(plan: Plan): Record<BillingInterval, number> {
  const pricing: Record<BillingInterval, number> = {} as any;
  
  const intervals: BillingInterval[] = ['month', 'quarter', 'semiAnnual', 'year'];
  
  for (const interval of intervals) {
    pricing[interval] = calculateSubscriptionPrice(plan, interval);
  }
  
  return pricing;
}

export function calculatePeriodEnd(startDate: Date, billingInterval: BillingInterval): Date {
  const endDate = new Date(startDate);
  
  switch (billingInterval) {
    case 'month':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarter':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'semiAnnual':
      endDate.setMonth(endDate.getMonth() + 6);
      break;
    case 'year':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    default:
      endDate.setMonth(endDate.getMonth() + 1);
  }
  
  return endDate;
}

// ============================================================================
// SUBSCRIPTION QUERIES
// ============================================================================

export async function getSubscriptionByMerchantId(merchantId: number): Promise<Subscription | null> {
  // Find the merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    return null;
  }
  
  const subscription = await prisma.subscription.findUnique({
    where: { merchantId: merchant.id },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });

  if (!subscription) return null;

  return {
    id: subscription.id,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    billingInterval: subscription.interval as BillingInterval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: JSON.parse(subscription.plan.limits as string) as PlanLimits,
      features: JSON.parse(subscription.plan.features as string) as string[],
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt
    }
  };
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return subscriptions.map((sub: any) => ({
    id: sub.id,
    merchantId: sub.merchantId,
    planId: sub.planId,
    status: sub.status as SubscriptionStatus,
    billingInterval: sub.interval as BillingInterval,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    amount: sub.amount,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    merchant: sub.merchant,
    plan: {
      id: sub.plan.id,
      name: sub.plan.name,
      description: sub.plan.description,
      basePrice: sub.plan.basePrice,
      currency: sub.plan.currency,
      trialDays: sub.plan.trialDays,
      limits: JSON.parse(sub.plan.limits as string) as PlanLimits,
      features: JSON.parse(sub.plan.features as string) as string[],
      isActive: sub.plan.isActive,
      isPopular: sub.plan.isPopular,
      sortOrder: sub.plan.sortOrder,
      createdAt: sub.plan.createdAt,
      updatedAt: sub.plan.updatedAt
    }
  }));
}

// ============================================================================
// SUBSCRIPTION SEARCH
// ============================================================================

export async function searchSubscriptions(filters: {
  merchantId?: number;
  planId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ subscriptions: Subscription[]; total: number; hasMore: boolean }> {
  const where: any = {};

  // Apply filters
  if (filters.merchantId) {
    where.merchantId = filters.merchantId;
  }

  if (filters.planId) {
    where.planId = filters.planId;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    where.currentPeriodStart = {};
    if (filters.startDate) where.currentPeriodStart.gte = filters.startDate;
    if (filters.endDate) where.currentPeriodStart.lte = filters.endDate;
  }

  // Get total count
  const total = await prisma.subscription.count({ where });

  // Get subscriptions with pagination
  const subscriptions = await prisma.subscription.findMany({
    where,
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    },
    orderBy: { createdAt: 'desc' },
    take: filters.limit || 20,
    skip: filters.offset || 0
  });

  const hasMore = (filters.offset || 0) + (filters.limit || 20) < total;

  return {
    subscriptions: subscriptions.map((sub: any) => ({
      id: sub.id,
      merchantId: sub.merchantId,
      planId: sub.planId,
      status: sub.status as SubscriptionStatus,
      billingInterval: sub.interval as BillingInterval,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      amount: sub.amount,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      merchant: sub.merchant,
      plan: {
        id: sub.plan.id,
        name: sub.plan.name,
        description: sub.plan.description,
        basePrice: sub.plan.basePrice,
        currency: sub.plan.currency,
        trialDays: sub.plan.trialDays,
        limits: JSON.parse(sub.plan.limits as string) as PlanLimits,
        features: JSON.parse(sub.plan.features as string) as string[],
        isActive: sub.plan.isActive,
        isPopular: sub.plan.isPopular,
        sortOrder: sub.plan.sortOrder,
        createdAt: sub.plan.createdAt,
        updatedAt: sub.plan.updatedAt
      }
    })),
    total,
    hasMore
  };
}

// ============================================================================
// SUBSCRIPTION MUTATIONS
// ============================================================================

export async function createSubscription(data: SubscriptionCreateInput): Promise<Subscription> {
  // Get merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: data.merchantId }
  });

  if (!merchant) {
    throw new Error('Merchant not found');
  }

  // Get plan by id
  const plan = await prisma.plan.findUnique({
    where: { id: data.planId }
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  // Check if merchant already has a subscription
  const existingSubscription = await prisma.subscription.findUnique({
    where: { merchantId: merchant.id }
  });

  if (existingSubscription) {
    throw new Error('Merchant already has a subscription');
  }

  // Calculate pricing based on billing interval
  const billingInterval = data.billingInterval || 'month';
  const amount = calculateSubscriptionPrice({
    ...plan,
    limits: JSON.parse(plan.limits as string) as PlanLimits,
    features: JSON.parse(plan.features as string) as string[],
    deletedAt: plan.deletedAt || undefined
  }, billingInterval);
  
  // Calculate dates
  const startDate = data.startDate || new Date();
  const currentPeriodEnd = calculatePeriodEnd(startDate, billingInterval);

  const subscription = await prisma.subscription.create({
    data: {
      merchantId: merchant.id,
      planId: plan.id,
      status: data.status || 'trial',
      interval: billingInterval,
      currentPeriodStart: startDate,
      currentPeriodEnd: currentPeriodEnd,
      amount: amount
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });

  // Update merchant subscription status
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      subscriptionStatus: subscription.status
    }
  });

  return {
    id: subscription.id,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    billingInterval: subscription.interval as BillingInterval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: JSON.parse(subscription.plan.limits as string) as PlanLimits,
      features: JSON.parse(subscription.plan.features as string) as string[],
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt
    }
  };
}

// ============================================================================
// PLAN FUNCTIONS
// ============================================================================

export async function getAllPlans(): Promise<Plan[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });

  return plans.map((plan: any) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    basePrice: plan.basePrice,
    currency: plan.currency,
    trialDays: plan.trialDays,
    limits: JSON.parse(plan.limits as string) as PlanLimits,
    features: JSON.parse(plan.features as string) as string[],
    isActive: plan.isActive,
    isPopular: plan.isPopular,
    sortOrder: plan.sortOrder,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    deletedAt: plan.deletedAt || undefined
  }));
}

export async function getPlanById(planId: number): Promise<Plan | null> {
  const plan = await prisma.plan.findUnique({
    where: { id: planId }
  });

  if (!plan) return null;

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    basePrice: plan.basePrice,
    currency: plan.currency,
    trialDays: plan.trialDays,
    limits: JSON.parse(plan.limits as string) as PlanLimits,
    features: JSON.parse(plan.features as string) as string[],
    isActive: plan.isActive,
    isPopular: plan.isPopular,
    sortOrder: plan.sortOrder,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    deletedAt: plan.deletedAt || undefined
  };
}

// ============================================================================
// SUBSCRIPTION ACTIONS
// ============================================================================

export async function changePlan(
  subscriptionId: number, 
  newPlanId: number, 
  billingInterval: BillingInterval = 'month'
): Promise<Subscription> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId }
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const plan = await prisma.plan.findUnique({
    where: { id: newPlanId }
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  const amount = calculateSubscriptionPrice({
    ...plan,
    limits: JSON.parse(plan.limits as string) as PlanLimits,
    features: JSON.parse(plan.features as string) as string[],
    deletedAt: plan.deletedAt || undefined
  }, billingInterval);

  // Calculate new period dates based on billing interval
  const now = new Date();
  const newPeriodStart = now;
  
  // Calculate period duration in days based on billing interval
  const getPeriodDays = (interval: BillingInterval): number => {
    switch (interval) {
      case 'month': return 30;
      case 'quarter': return 90;
      case 'semiAnnual': return 180;
      case 'year': return 365;
      default: return 30;
    }
  };
  
  const periodDays = getPeriodDays(billingInterval);
  const newPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

  const updatedSubscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      planId: plan.id,
      interval: billingInterval,
      amount: amount,
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });

  // Update merchant's subscription status
  await prisma.merchant.update({
    where: { id: subscription.merchantId },
    data: { subscriptionStatus: updatedSubscription.status }
  });

  return {
    id: updatedSubscription.id,
    merchantId: updatedSubscription.merchantId,
    planId: updatedSubscription.planId,
    status: updatedSubscription.status as SubscriptionStatus,
    billingInterval: updatedSubscription.interval as BillingInterval,
    currentPeriodStart: updatedSubscription.currentPeriodStart,
    currentPeriodEnd: updatedSubscription.currentPeriodEnd,
    amount: updatedSubscription.amount,
    createdAt: updatedSubscription.createdAt,
    updatedAt: updatedSubscription.updatedAt,
    // Enhanced subscription period information
    subscriptionPeriod: {
      startDate: updatedSubscription.currentPeriodStart,
      endDate: updatedSubscription.currentPeriodEnd,
      duration: updatedSubscription.interval,
      isActive: updatedSubscription.status === 'active',
      daysRemaining: Math.ceil((updatedSubscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      nextBillingDate: updatedSubscription.currentPeriodEnd
    },
    merchant: updatedSubscription.merchant,
    plan: {
      id: updatedSubscription.plan.id,
      name: updatedSubscription.plan.name,
      description: updatedSubscription.plan.description,
      basePrice: updatedSubscription.plan.basePrice,
      currency: updatedSubscription.plan.currency,
      trialDays: updatedSubscription.plan.trialDays,
      limits: JSON.parse(updatedSubscription.plan.limits as string) as PlanLimits,
      features: JSON.parse(updatedSubscription.plan.features as string) as string[],
      isActive: updatedSubscription.plan.isActive,
      isPopular: updatedSubscription.plan.isPopular,
      sortOrder: updatedSubscription.plan.sortOrder,
      createdAt: updatedSubscription.plan.createdAt,
      updatedAt: updatedSubscription.plan.updatedAt
    }
  };
}

export async function pauseSubscription(subscriptionId: number): Promise<Subscription> {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'paused',
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });

  return {
    id: subscription.id,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    billingInterval: subscription.interval as BillingInterval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: JSON.parse(subscription.plan.limits as string) as PlanLimits,
      features: JSON.parse(subscription.plan.features as string) as string[],
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt
    }
  };
}

export async function resumeSubscription(subscriptionId: number): Promise<Subscription> {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'active',
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });

  return {
    id: subscription.id,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    billingInterval: subscription.interval as BillingInterval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: JSON.parse(subscription.plan.limits as string) as PlanLimits,
      features: JSON.parse(subscription.plan.features as string) as string[],
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt
    }
  };
}

export async function cancelSubscription(subscriptionId: number): Promise<{ success: boolean; message: string; data?: Subscription; statusCode?: number }> {
  try {
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'cancelled',
        updatedAt: new Date()
      },
      include: {
        merchant: {
          select: {
      id: true,
            name: true,
            email: true,
            subscriptionStatus: true
          }
        },
        plan: true
      }
    });

    const result: Subscription = {
      id: subscription.id,
      merchantId: subscription.merchantId,
      planId: subscription.planId,
      status: subscription.status as SubscriptionStatus,
      billingInterval: subscription.interval as BillingInterval,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      amount: subscription.amount,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      merchant: subscription.merchant,
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        description: subscription.plan.description,
        basePrice: subscription.plan.basePrice,
        currency: subscription.plan.currency,
        trialDays: subscription.plan.trialDays,
        limits: JSON.parse(subscription.plan.limits as string) as PlanLimits,
        features: JSON.parse(subscription.plan.features as string) as string[],
        isActive: subscription.plan.isActive,
        isPopular: subscription.plan.isPopular,
        sortOrder: subscription.plan.sortOrder,
        createdAt: subscription.plan.createdAt,
        updatedAt: subscription.plan.updatedAt
      }
    };

    return {
      success: true,
      message: 'Subscription cancelled successfully',
      data: result
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return {
      success: false,
      message: 'Failed to cancel subscription',
      statusCode: 500
    };
  }
}

// ============================================================================
// SUBSCRIPTION RENEWAL FUNCTIONS
// ============================================================================

export async function getExpiredSubscriptions(): Promise<Subscription[]> {
  const now = new Date();
  
  const subscriptions = await prisma.subscription.findMany({
    where: {
      currentPeriodEnd: {
        lt: now
      },
      status: {
        in: ['active', 'trial']
      }
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    },
    orderBy: { currentPeriodEnd: 'asc' }
  });

  return subscriptions.map((sub: any) => ({
    id: sub.id,
    merchantId: sub.merchantId,
    planId: sub.planId,
    status: sub.status as SubscriptionStatus,
    billingInterval: sub.interval as BillingInterval,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    amount: sub.amount,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    merchant: sub.merchant,
    plan: {
      id: sub.plan.id,
      name: sub.plan.name,
      description: sub.plan.description,
      basePrice: sub.plan.basePrice,
      currency: sub.plan.currency,
      trialDays: sub.plan.trialDays,
      limits: JSON.parse(sub.plan.limits as string) as PlanLimits,
      features: JSON.parse(sub.plan.features as string) as string[],
      isActive: sub.plan.isActive,
      isPopular: sub.plan.isPopular,
      sortOrder: sub.plan.sortOrder,
      createdAt: sub.plan.createdAt,
      updatedAt: sub.plan.updatedAt
    }
  }));
}

export async function getSubscriptionById(id: number): Promise<Subscription | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { id },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });

  if (!subscription) return null;

  return {
    id: subscription.id,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    billingInterval: subscription.interval as BillingInterval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: JSON.parse(subscription.plan.limits as string) as PlanLimits,
      features: JSON.parse(subscription.plan.features as string) as string[],
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt
    }
  };
}

export async function updateSubscription(
  subscriptionId: number, 
  data: Partial<{
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    amount: number;
  }>
): Promise<Subscription> {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      ...data,
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });

  return {
    id: subscription.id,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    billingInterval: subscription.interval as BillingInterval,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    amount: subscription.amount,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: JSON.parse(subscription.plan.limits as string) as PlanLimits,
      features: JSON.parse(subscription.plan.features as string) as string[],
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt
    }
  };
}

// ============================================================================
// SUBSCRIPTION PAYMENT FUNCTIONS
// ============================================================================

export interface SubscriptionPaymentCreateInput {
  subscriptionId: number;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string;
  description?: string;
  failureReason?: string;
}

export interface SubscriptionPayment {
  id: number;
  subscriptionId: number;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId: string;
  description?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createSubscriptionPayment(data: SubscriptionPaymentCreateInput): Promise<SubscriptionPayment> {
  // Find subscription by id
  const subscription = await prisma.subscription.findUnique({
    where: { id: data.subscriptionId },
    select: { id: true }
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const payment = await prisma.payment.create({
    data: {
      subscriptionId: subscription.id,
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      type: 'SUBSCRIPTION',
      status: data.status,
      transactionId: data.transactionId,
      description: data.description,
      failureReason: data.failureReason
    }
  });

  return {
    id: payment.id,
    subscriptionId: data.subscriptionId,
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    status: payment.status,
    transactionId: payment.transactionId || '',
    description: payment.description || undefined,
    failureReason: payment.failureReason || undefined,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
}