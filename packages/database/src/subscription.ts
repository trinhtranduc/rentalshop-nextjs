// ============================================================================
// MODERN SUBSCRIPTION DATABASE FUNCTIONS (Following Stripe/Shopify Patterns)
// ============================================================================

import { prisma } from './client';
import { calculatePricing, PRICING_CONFIG } from '@rentalshop/types';
import type { 
  Subscription, 
  Plan, 
  SubscriptionCreateInput, 
  SubscriptionUpdateInput,
  SubscriptionStatus,
  BillingInterval,
  BillingPeriod,
  PricingCalculation
} from '@rentalshop/types';

// ============================================================================
// PRICING UTILITIES
// ============================================================================

export function calculatePlanPricing(basePrice: number): {
  monthly: {
    price: number;
    discount: number;
    savings: number;
    interval: 'month';
    intervalCount: 1;
  };
  quarterly: {
    price: number;
    discount: number;
    savings: number;
    interval: 'quarter';
    intervalCount: 3;
  };
  yearly: {
    price: number;
    discount: number;
    savings: number;
    interval: 'year';
    intervalCount: 1;
  };
} {
  const monthly = calculatePricing(basePrice, 1);
  const quarterly = calculatePricing(basePrice, 3);
  const yearly = calculatePricing(basePrice, 12);

  return {
    monthly: {
      price: monthly.finalPrice,
      discount: monthly.discount,
      savings: monthly.savings,
      interval: 'month' as const,
      intervalCount: 1 as const
    },
    quarterly: {
      price: quarterly.finalPrice,
      discount: quarterly.discount,
      savings: quarterly.savings,
      interval: 'quarter' as const,
      intervalCount: 3 as const
    },
    yearly: {
      price: yearly.finalPrice,
      discount: yearly.discount,
      savings: yearly.savings,
      interval: 'year' as const,
      intervalCount: 1 as const
    }
  };
}

// ============================================================================
// SUBSCRIPTION QUERIES
// ============================================================================

export async function getSubscriptionByMerchantId(merchantId: number): Promise<Subscription | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { merchantId: merchantId.toString() },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
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
    publicId: subscription.publicId,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialStart: subscription.trialStart || undefined,
    trialEnd: subscription.trialEnd || undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt || undefined,
    cancelReason: subscription.cancelReason || undefined,
    amount: subscription.amount,
    currency: subscription.currency,
    interval: subscription.interval as BillingInterval,
    intervalCount: subscription.intervalCount,
    period: subscription.period as BillingPeriod,
    discount: subscription.discount,
    savings: subscription.savings,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      publicId: subscription.plan.publicId,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: {
        outlets: subscription.plan.maxOutlets,
        users: subscription.plan.maxUsers,
        products: subscription.plan.maxProducts,
        customers: subscription.plan.maxCustomers
      },
      features: JSON.parse(subscription.plan.features || '[]'),
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt,
      pricing: calculatePlanPricing(subscription.plan.basePrice)
    }
  };
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return subscriptions.map(sub => ({
    id: sub.id,
    publicId: sub.publicId,
    merchantId: sub.merchantId,
    planId: sub.planId,
    status: sub.status as SubscriptionStatus,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    trialStart: sub.trialStart || undefined,
    trialEnd: sub.trialEnd || undefined,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    canceledAt: sub.canceledAt || undefined,
    cancelReason: sub.cancelReason || undefined,
    amount: sub.amount,
    currency: sub.currency,
    interval: sub.interval as BillingInterval,
    intervalCount: sub.intervalCount,
    period: sub.period as BillingPeriod,
    discount: sub.discount,
    savings: sub.savings,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    merchant: sub.merchant,
    plan: {
      id: sub.plan.id,
      publicId: sub.plan.publicId,
      name: sub.plan.name,
      description: sub.plan.description,
      basePrice: sub.plan.basePrice,
      currency: sub.plan.currency,
      trialDays: sub.plan.trialDays,
      limits: {
        outlets: sub.plan.maxOutlets,
        users: sub.plan.maxUsers,
        products: sub.plan.maxProducts,
        customers: sub.plan.maxCustomers
      },
      features: JSON.parse(sub.plan.features || '[]'),
      isActive: sub.plan.isActive,
      isPopular: sub.plan.isPopular,
      sortOrder: sub.plan.sortOrder,
      createdAt: sub.plan.createdAt,
      updatedAt: sub.plan.updatedAt,
      pricing: calculatePlanPricing(sub.plan.basePrice)
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
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: filters.merchantId }
    });
    if (merchant) {
      where.merchantId = merchant.id;
    }
  }

  if (filters.planId) {
    const plan = await prisma.plan.findUnique({
      where: { publicId: filters.planId }
    });
    if (plan) {
      where.planId = plan.id;
    }
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
          publicId: true,
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
    subscriptions: subscriptions.map(sub => ({
      id: sub.id,
      publicId: sub.publicId,
      merchantId: sub.merchantId,
      planId: sub.planId,
      status: sub.status as SubscriptionStatus,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialStart: sub.trialStart || undefined,
      trialEnd: sub.trialEnd || undefined,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      canceledAt: sub.canceledAt || undefined,
      cancelReason: sub.cancelReason || undefined,
      amount: sub.amount,
      currency: sub.currency,
      interval: sub.interval as BillingInterval,
      intervalCount: sub.intervalCount,
      period: sub.period as BillingPeriod,
      discount: sub.discount,
      savings: sub.savings,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      merchant: sub.merchant,
      plan: {
        id: sub.plan.id,
        publicId: sub.plan.publicId,
        name: sub.plan.name,
        description: sub.plan.description,
        basePrice: sub.plan.basePrice,
        currency: sub.plan.currency,
        trialDays: sub.plan.trialDays,
        limits: {
          outlets: sub.plan.maxOutlets,
          users: sub.plan.maxUsers,
          products: sub.plan.maxProducts,
          customers: sub.plan.maxCustomers
        },
        features: JSON.parse(sub.plan.features || '[]'),
        isActive: sub.plan.isActive,
        isPopular: sub.plan.isPopular,
        sortOrder: sub.plan.sortOrder,
        createdAt: sub.plan.createdAt,
        updatedAt: sub.plan.updatedAt,
        pricing: calculatePlanPricing(sub.plan.basePrice)
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
  // Get merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: data.merchantId }
  });

  if (!merchant) {
    throw new Error('Merchant not found');
  }

  // Get plan by publicId
  const plan = await prisma.plan.findUnique({
    where: { publicId: data.planId }
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

  // Calculate pricing based on period
  const period = data.period || 1;
  const pricing = calculatePricing(plan.basePrice, period);
  
  // Calculate dates
  const now = new Date();
  const trialStart = plan.trialDays > 0 ? now : undefined;
  const trialEnd = plan.trialDays > 0 ? new Date(now.getTime() + (plan.trialDays * 24 * 60 * 60 * 1000)) : undefined;
  
  const currentPeriodStart = trialEnd || now;
  const currentPeriodEnd = new Date(currentPeriodStart.getTime() + (period * 30 * 24 * 60 * 60 * 1000));

  // Generate publicId
  const lastSubscription = await prisma.subscription.findFirst({
    orderBy: { publicId: 'desc' }
  });
  const publicId = (lastSubscription?.publicId || 0) + 1;

  const subscription = await prisma.subscription.create({
    data: {
      publicId,
      merchantId: merchant.id,
      planId: plan.id,
      status: data.status || 'trial',
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
      amount: pricing.finalPrice,
      currency: data.currency || plan.currency,
      interval: pricing.interval,
      intervalCount: pricing.intervalCount,
      period: period,
      discount: pricing.discount,
      savings: pricing.savings
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
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
      planId: plan.id,
      subscriptionStatus: subscription.status
    }
  });

  return {
    id: subscription.id,
    publicId: subscription.publicId,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialStart: subscription.trialStart || undefined,
    trialEnd: subscription.trialEnd || undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt || undefined,
    cancelReason: subscription.cancelReason || undefined,
    amount: subscription.amount,
    currency: subscription.currency,
    interval: subscription.interval as BillingInterval,
    intervalCount: subscription.intervalCount,
    period: subscription.period as BillingPeriod,
    discount: subscription.discount,
    savings: subscription.savings,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      publicId: subscription.plan.publicId,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: {
        outlets: subscription.plan.maxOutlets,
        users: subscription.plan.maxUsers,
        products: subscription.plan.maxProducts,
        customers: subscription.plan.maxCustomers
      },
      features: JSON.parse(subscription.plan.features || '[]'),
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt,
      pricing: calculatePlanPricing(subscription.plan.basePrice)
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

  return plans.map(plan => ({
    id: plan.id,
    publicId: plan.publicId,
    name: plan.name,
    description: plan.description,
    basePrice: plan.basePrice,
    currency: plan.currency,
    trialDays: plan.trialDays,
    limits: {
      outlets: plan.maxOutlets,
      users: plan.maxUsers,
      products: plan.maxProducts,
      customers: plan.maxCustomers
    },
    features: JSON.parse(plan.features || '[]'),
    isActive: plan.isActive,
    isPopular: plan.isPopular,
    sortOrder: plan.sortOrder,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    pricing: calculatePlanPricing(plan.basePrice)
  }));
}

export async function getPlanById(planId: number): Promise<Plan | null> {
  const plan = await prisma.plan.findUnique({
    where: { publicId: planId }
  });

  if (!plan) return null;

  return {
    id: plan.id,
    publicId: plan.publicId,
    name: plan.name,
    description: plan.description,
    basePrice: plan.basePrice,
    currency: plan.currency,
    trialDays: plan.trialDays,
    limits: {
      outlets: plan.maxOutlets,
      users: plan.maxUsers,
      products: plan.maxProducts,
      customers: plan.maxCustomers
    },
    features: JSON.parse(plan.features || '[]'),
    isActive: plan.isActive,
    isPopular: plan.isPopular,
    sortOrder: plan.sortOrder,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    pricing: calculatePlanPricing(plan.basePrice)
  };
}

// ============================================================================
// SUBSCRIPTION ACTIONS (Modern SaaS Actions)
// ============================================================================

export async function changePlan(
  subscriptionId: number, 
  newPlanId: number, 
  period: BillingPeriod = 1,
  reason?: string
): Promise<Subscription> {
  const subscription = await prisma.subscription.findUnique({
    where: { publicId: subscriptionId }
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  const plan = await prisma.plan.findUnique({
    where: { publicId: newPlanId }
  });

  if (!plan) {
    throw new Error('Plan not found');
  }

  const pricing = calculatePricing(plan.basePrice, period);

  const updatedSubscription = await prisma.subscription.update({
    where: { publicId: subscriptionId },
    data: {
      planId: plan.id,
      amount: pricing.finalPrice,
      currency: plan.currency,
      interval: pricing.interval,
      intervalCount: pricing.intervalCount,
      period: period,
      discount: pricing.discount,
      savings: pricing.savings,
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
          email: true,
          subscriptionStatus: true
        }
      },
      plan: true
    }
  });

  // Update merchant's plan reference
  await prisma.merchant.update({
    where: { id: subscription.merchantId },
    data: { planId: plan.id }
  });

  return {
    id: updatedSubscription.id,
    publicId: updatedSubscription.publicId,
    merchantId: updatedSubscription.merchantId,
    planId: updatedSubscription.planId,
    status: updatedSubscription.status as SubscriptionStatus,
    currentPeriodStart: updatedSubscription.currentPeriodStart,
    currentPeriodEnd: updatedSubscription.currentPeriodEnd,
    trialStart: updatedSubscription.trialStart || undefined,
    trialEnd: updatedSubscription.trialEnd || undefined,
    cancelAtPeriodEnd: updatedSubscription.cancelAtPeriodEnd,
    canceledAt: updatedSubscription.canceledAt || undefined,
    cancelReason: updatedSubscription.cancelReason || undefined,
    amount: updatedSubscription.amount,
    currency: updatedSubscription.currency,
    interval: updatedSubscription.interval as BillingInterval,
    intervalCount: updatedSubscription.intervalCount,
    period: updatedSubscription.period as BillingPeriod,
    discount: updatedSubscription.discount,
    savings: updatedSubscription.savings,
    createdAt: updatedSubscription.createdAt,
    updatedAt: updatedSubscription.updatedAt,
    merchant: updatedSubscription.merchant,
    plan: {
      id: updatedSubscription.plan.id,
      publicId: updatedSubscription.plan.publicId,
      name: updatedSubscription.plan.name,
      description: updatedSubscription.plan.description,
      basePrice: updatedSubscription.plan.basePrice,
      currency: updatedSubscription.plan.currency,
      trialDays: updatedSubscription.plan.trialDays,
      limits: {
        outlets: updatedSubscription.plan.maxOutlets,
        users: updatedSubscription.plan.maxUsers,
        products: updatedSubscription.plan.maxProducts,
        customers: updatedSubscription.plan.maxCustomers
      },
      features: JSON.parse(updatedSubscription.plan.features || '[]'),
      isActive: updatedSubscription.plan.isActive,
      isPopular: updatedSubscription.plan.isPopular,
      sortOrder: updatedSubscription.plan.sortOrder,
      createdAt: updatedSubscription.plan.createdAt,
      updatedAt: updatedSubscription.plan.updatedAt,
      pricing: calculatePlanPricing(updatedSubscription.plan.basePrice)
    }
  };
}

export async function pauseSubscription(
  subscriptionId: number, 
  reason?: string
): Promise<Subscription> {
  const subscription = await prisma.subscription.update({
    where: { publicId: subscriptionId },
    data: {
      status: 'paused',
      cancelReason: reason,
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
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
    publicId: subscription.publicId,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialStart: subscription.trialStart || undefined,
    trialEnd: subscription.trialEnd || undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt || undefined,
    cancelReason: subscription.cancelReason || undefined,
    amount: subscription.amount,
    currency: subscription.currency,
    interval: subscription.interval as BillingInterval,
    intervalCount: subscription.intervalCount,
    period: subscription.period as BillingPeriod,
    discount: subscription.discount,
    savings: subscription.savings,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      publicId: subscription.plan.publicId,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: {
        outlets: subscription.plan.maxOutlets,
        users: subscription.plan.maxUsers,
        products: subscription.plan.maxProducts,
        customers: subscription.plan.maxCustomers
      },
      features: JSON.parse(subscription.plan.features || '[]'),
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt,
      pricing: calculatePlanPricing(subscription.plan.basePrice)
    }
  };
}

export async function resumeSubscription(subscriptionId: number): Promise<Subscription> {
  const subscription = await prisma.subscription.update({
    where: { publicId: subscriptionId },
    data: {
      status: 'active',
      cancelAtPeriodEnd: false,
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
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
    publicId: subscription.publicId,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialStart: subscription.trialStart || undefined,
    trialEnd: subscription.trialEnd || undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt || undefined,
    cancelReason: subscription.cancelReason || undefined,
    amount: subscription.amount,
    currency: subscription.currency,
    interval: subscription.interval as BillingInterval,
    intervalCount: subscription.intervalCount,
    period: subscription.period as BillingPeriod,
    discount: subscription.discount,
    savings: subscription.savings,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      publicId: subscription.plan.publicId,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: {
        outlets: subscription.plan.maxOutlets,
        users: subscription.plan.maxUsers,
        products: subscription.plan.maxProducts,
        customers: subscription.plan.maxCustomers
      },
      features: JSON.parse(subscription.plan.features || '[]'),
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt,
      pricing: calculatePlanPricing(subscription.plan.basePrice)
    }
  };
}

export async function cancelSubscription(
  subscriptionId: number, 
  reason?: string
): Promise<Subscription> {
  const subscription = await prisma.subscription.update({
    where: { publicId: subscriptionId },
    data: {
      status: 'cancelled',
      cancelAtPeriodEnd: true,
      cancelReason: reason,
      canceledAt: new Date(),
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
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
    publicId: subscription.publicId,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialStart: subscription.trialStart || undefined,
    trialEnd: subscription.trialEnd || undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt || undefined,
    cancelReason: subscription.cancelReason || undefined,
    amount: subscription.amount,
    currency: subscription.currency,
    interval: subscription.interval as BillingInterval,
    intervalCount: subscription.intervalCount,
    period: subscription.period as BillingPeriod,
    discount: subscription.discount,
    savings: subscription.savings,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      publicId: subscription.plan.publicId,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: {
        outlets: subscription.plan.maxOutlets,
        users: subscription.plan.maxUsers,
        products: subscription.plan.maxProducts,
        customers: subscription.plan.maxCustomers
      },
      features: JSON.parse(subscription.plan.features || '[]'),
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt,
      pricing: calculatePlanPricing(subscription.plan.basePrice)
    }
  };
}

export async function reactivateSubscription(subscriptionId: number): Promise<Subscription> {
  const subscription = await prisma.subscription.update({
    where: { publicId: subscriptionId },
    data: {
      status: 'active',
      cancelAtPeriodEnd: false,
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
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
    publicId: subscription.publicId,
    merchantId: subscription.merchantId,
    planId: subscription.planId,
    status: subscription.status as SubscriptionStatus,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    trialStart: subscription.trialStart || undefined,
    trialEnd: subscription.trialEnd || undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    canceledAt: subscription.canceledAt || undefined,
    cancelReason: subscription.cancelReason || undefined,
    amount: subscription.amount,
    currency: subscription.currency,
    interval: subscription.interval as BillingInterval,
    intervalCount: subscription.intervalCount,
    period: subscription.period as BillingPeriod,
    discount: subscription.discount,
    savings: subscription.savings,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    merchant: subscription.merchant,
    plan: {
      id: subscription.plan.id,
      publicId: subscription.plan.publicId,
      name: subscription.plan.name,
      description: subscription.plan.description,
      basePrice: subscription.plan.basePrice,
      currency: subscription.plan.currency,
      trialDays: subscription.plan.trialDays,
      limits: {
        outlets: subscription.plan.maxOutlets,
        users: subscription.plan.maxUsers,
        products: subscription.plan.maxProducts,
        customers: subscription.plan.maxCustomers
      },
      features: JSON.parse(subscription.plan.features || '[]'),
      isActive: subscription.plan.isActive,
      isPopular: subscription.plan.isPopular,
      sortOrder: subscription.plan.sortOrder,
      createdAt: subscription.plan.createdAt,
      updatedAt: subscription.plan.updatedAt,
      pricing: calculatePlanPricing(subscription.plan.basePrice)
    }
  };
}
