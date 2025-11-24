// ============================================================================
// SIMPLIFIED SUBSCRIPTION DATABASE FUNCTIONS
// ============================================================================

import { prisma } from './client';
import { calculateSubscriptionPrice, getPricingBreakdown } from '@rentalshop/utils';
import { SUBSCRIPTION_STATUS, PAYMENT_METHOD, PAYMENT_TYPE, PAYMENT_STATUS } from '@rentalshop/constants';
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

/**
 * Generate pricing object from base price
 */
function generatePricingFromBasePrice(basePrice: number) {
  const monthlyPrice = basePrice;
  const quarterlyPrice = monthlyPrice * 3;
  const semiAnnualPrice = monthlyPrice * 6;
  const annualPrice = monthlyPrice * 12;
  
  return {
    monthly: {
      price: monthlyPrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: quarterlyPrice * 0.95, // 5% discount
      discount: 5,
      savings: quarterlyPrice * 0.05
    },
    semi_annual: {
      price: semiAnnualPrice * 0.90, // 10% discount
      discount: 10,
      savings: semiAnnualPrice * 0.10
    },
    annual: {
      price: annualPrice * 0.80, // 20% discount
      discount: 20,
      savings: annualPrice * 0.20
    }
  };
}

/**
 * Convert Prisma plan object to our Plan type
 */
function convertPrismaPlanToPlan(prismaPlan: any): Plan {
  return {
    id: prismaPlan.id,
    name: prismaPlan.name,
    description: prismaPlan.description,
    basePrice: prismaPlan.basePrice,
    currency: prismaPlan.currency,
    trialDays: prismaPlan.trialDays,
    limits: JSON.parse(prismaPlan.limits as string) as PlanLimits,
    features: JSON.parse(prismaPlan.features as string) as string[],
    isActive: prismaPlan.isActive,
    isPopular: prismaPlan.isPopular,
    sortOrder: prismaPlan.sortOrder,
    pricing: generatePricingFromBasePrice(prismaPlan.basePrice),
    createdAt: prismaPlan.createdAt,
    updatedAt: prismaPlan.updatedAt,
    deletedAt: prismaPlan.deletedAt || undefined
  };
}

/**
 * Helper function to generate pricing object for a plan
 */
function generatePlanPricing(basePrice: number) {
  return {
    monthly: {
      price: basePrice,
      discount: 0,
      savings: 0
    },
    quarterly: {
      price: basePrice * 3 * 0.95, // 5% discount for quarterly
      discount: 5,
      savings: basePrice * 3 * 0.05
    },
    semi_annual: {
      price: basePrice * 6 * 0.90, // 10% discount for semi-annual
      discount: 10,
      savings: basePrice * 6 * 0.10
    },
    annual: {
      price: basePrice * 12 * 0.80, // 20% discount for annual
      discount: 20,
      savings: basePrice * 12 * 0.20
    }
  };
}

/**
 * Helper function to transform database plan to Plan type
 */
function transformPlanFromDb(plan: any): Plan {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    basePrice: plan.basePrice,
    currency: plan.currency,
    trialDays: plan.trialDays,
    limits: typeof plan.limits === 'string' ? JSON.parse(plan.limits) : plan.limits,
    features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
    isActive: plan.isActive,
    isPopular: plan.isPopular,
    sortOrder: plan.sortOrder,
    pricing: generatePlanPricing(plan.basePrice),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    ...(plan.deletedAt && { deletedAt: plan.deletedAt })
  };
}

/**
 * Helper function to transform Prisma subscription to Subscription type
 * Ensures all required fields are included
 */
function transformSubscriptionFromDb(sub: any): Subscription {
  return {
    id: sub.id,
    merchantId: sub.merchantId,
    planId: sub.planId,
    status: sub.status as SubscriptionStatus, // ✅ Type safe with Prisma enum
    billingInterval: sub.interval as BillingInterval,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    trialStart: sub.trialStart,
    trialEnd: sub.trialEnd,
    amount: sub.amount,
    currency: sub.currency || 'USD',
    interval: sub.interval,
    intervalCount: sub.intervalCount || 1,
    period: sub.period || 1,
    discount: sub.discount || 0,
    savings: sub.savings || 0,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd || false,
    canceledAt: sub.canceledAt,
    cancelReason: sub.cancelReason,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    ...(sub.merchant && { merchant: sub.merchant }),
    ...(sub.plan && { plan: convertPrismaPlanToPlan(sub.plan) })
  };
}

export function calculatePlanPricing(plan: Plan): Record<BillingInterval, number> {
  const pricing: Record<BillingInterval, number> = {} as any;
  
  const intervals: BillingInterval[] = ['monthly', 'quarterly', 'semi_annual', 'annual'];
  
  for (const interval of intervals) {
    pricing[interval] = calculateSubscriptionPrice(plan, interval);
  }
  
  return pricing;
}

export function calculatePeriodEnd(startDate: Date, billingInterval: BillingInterval): Date {
  const endDate = new Date(startDate);
  
  switch (billingInterval) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'semi_annual':
      endDate.setMonth(endDate.getMonth() + 6);
      break;
    case 'annual':
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
        }
      },
      plan: true
    }
  });

  if (!subscription) return null;

  return transformSubscriptionFromDb(subscription);
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  const subscriptions = await prisma.subscription.findMany({
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      plan: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return subscriptions.map((sub: any) => transformSubscriptionFromDb(sub));
}

// ============================================================================
// SUBSCRIPTION SEARCH
// ============================================================================

export async function searchSubscriptions(filters: {
  search?: string;
  merchantId?: number;
  planId?: number;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ subscriptions: Subscription[]; total: number; hasMore: boolean }> {
  const where: any = {};

  // Apply search filter (merchant name)
  if (filters.search) {
    where.merchant = {
      name: {
        contains: filters.search,
        mode: 'insensitive'
      }
    };
  }

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
    subscriptions: subscriptions.map((sub: any) => transformSubscriptionFromDb(sub)),
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
  const billingInterval = data.billingInterval || 'monthly';
  const convertedPlan = convertPrismaPlanToPlan(plan);
  const amount = calculateSubscriptionPrice(convertedPlan, billingInterval);
  
  // Calculate dates
  const startDate = data.startDate || new Date();
  const currentPeriodEnd = calculatePeriodEnd(startDate, billingInterval);

  const subscription = await prisma.subscription.create({
    data: {
      merchantId: merchant.id,
      planId: plan.id,
      status: (data.status || SUBSCRIPTION_STATUS.TRIAL) as SubscriptionStatus, // ✅ Type safe with enum constant
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
        }
      },
      plan: true
    }
  });

  // Update merchant subscription status
  await prisma.merchant.update({
    where: { id: merchant.id },
    data: {
      // // subscriptionStatus: (removed - use subscription.status) (removed - use subscription.status) subscription.status
    }
  });

  return transformSubscriptionFromDb(subscription);
}

// ============================================================================
// PLAN FUNCTIONS
// ============================================================================

export async function getAllPlans(): Promise<Plan[]> {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });

  return plans.map((plan: any) => convertPrismaPlanToPlan(plan));
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
    pricing: generatePricingFromBasePrice(plan.basePrice),
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
  billingInterval: BillingInterval = 'monthly'
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

  const convertedPlan = convertPrismaPlanToPlan(plan);
  const amount = calculateSubscriptionPrice(convertedPlan, billingInterval);

  // Calculate new period dates based on billing interval
  const now = new Date();
  const newPeriodStart = now;
  
  // Calculate period duration in days based on billing interval
  const getPeriodDays = (interval: BillingInterval): number => {
    switch (interval) {
      case 'monthly': return 30;
      case 'quarterly': return 90;
      case 'semi_annual': return 180;
      case 'annual': return 365;
      default: return 30;
    }
  };
  
  const periodDays = getPeriodDays(billingInterval);
  const newPeriodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

  const updatedSubscription = await prisma.subscription.update({
    where: { merchantId: subscription.merchantId },
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
        }
      },
      plan: true
    }
  });

  // No need to update merchant - subscription.status is the single source of truth

  const result = transformSubscriptionFromDb(updatedSubscription);
  
  // Add enhanced subscription period information
  return {
    ...result,
    subscriptionPeriod: {
      startDate: updatedSubscription.currentPeriodStart,
      endDate: updatedSubscription.currentPeriodEnd,
      duration: updatedSubscription.interval,
      isActive: updatedSubscription.status === SUBSCRIPTION_STATUS.ACTIVE, // ✅ Use enum constant
      daysRemaining: Math.ceil((updatedSubscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
      nextBillingDate: updatedSubscription.currentPeriodEnd
    }
  };
}

export async function pauseSubscription(subscriptionId: number): Promise<Subscription> {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: SUBSCRIPTION_STATUS.PAUSED, // ✅ Use enum constant
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      plan: true
    }
  });

  return transformSubscriptionFromDb(subscription);
}

export async function resumeSubscription(subscriptionId: number): Promise<Subscription> {
  const subscription = await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: SUBSCRIPTION_STATUS.ACTIVE, // ✅ Use enum constant
      updatedAt: new Date()
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      plan: true
    }
  });

  return transformSubscriptionFromDb(subscription);
}

export async function cancelSubscription(subscriptionId: number): Promise<{ success: boolean; message: string; data?: Subscription; statusCode?: number }> {
  try {
    const subscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SUBSCRIPTION_STATUS.CANCELLED, // ✅ Use enum constant
        updatedAt: new Date()
      },
      include: {
        merchant: {
          select: {
      id: true,
            name: true,
            email: true,
          }
        },
        plan: true
      }
    });

    const result = transformSubscriptionFromDb(subscription);

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
        in: [SUBSCRIPTION_STATUS.ACTIVE, SUBSCRIPTION_STATUS.TRIAL] // ✅ Use enum constants
      }
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      plan: true
    },
    orderBy: { currentPeriodEnd: 'asc' }
  });

  return subscriptions.map((sub: any) => transformSubscriptionFromDb(sub));
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
        }
      },
      plan: true
    }
  });

  if (!subscription) return null;

  return transformSubscriptionFromDb(subscription);
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
        }
      },
      plan: true
    }
  });

  return transformSubscriptionFromDb(subscription);
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
      method: (data.method || PAYMENT_METHOD.STRIPE) as any, // ✅ Prisma sẽ convert string -> enum automatically
      type: PAYMENT_TYPE.SUBSCRIPTION_PAYMENT as any, // ✅ Prisma sẽ convert string -> enum automatically
      status: (data.status || PAYMENT_STATUS.PENDING) as any, // ✅ Prisma sẽ convert string -> enum automatically
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

// ============================================================================
// SUBSCRIPTION PAYMENT HISTORY
// ============================================================================

/**
 * Get payment history for a subscription
 * @param subscriptionId - Subscription ID
 * @param filters - Optional filters for payments
 * @returns Payment history with pagination
 */
export async function getSubscriptionPaymentHistory(
  subscriptionId: number,
  filters?: {
    status?: string;
    method?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<{
  payments: SubscriptionPayment[];
  total: number;
  hasMore: boolean;
}> {
  const where: any = {
    subscriptionId,
    type: 'SUBSCRIPTION'
  };

  // Apply filters
  if (filters?.status) {
    where.status = filters.status.toUpperCase();
  }

  if (filters?.method) {
    where.method = filters.method.toUpperCase();
  }

  if (filters?.startDate || filters?.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;

  // Get total count and payments
  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })
  ]);

  const hasMore = offset + limit < total;

  return {
    payments: payments.map((p: any) => ({
      id: p.id,
      subscriptionId: subscriptionId,
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      status: p.status,
      transactionId: p.transactionId || '',
      description: p.description || undefined,
      failureReason: p.failureReason || undefined,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    })),
    total,
    hasMore
  };
}

// ============================================================================
// SUBSCRIPTION RENEWAL
// ============================================================================

/**
 * Renew subscription for another month with payment
 * @param subscriptionId - Subscription ID
 * @param paymentData - Payment information
 * @returns Updated subscription and payment record
 */
export async function renewSubscription(
  subscriptionId: number,
  paymentData: {
    method: 'STRIPE' | 'TRANSFER';
    transactionId: string;
    reference?: string;
    description?: string;
  }
): Promise<{
  subscription: Subscription;
  payment: SubscriptionPayment;
}> {
  // 1. Get subscription with merchant
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      merchant: true,
      plan: true
    }
  });

  if (!subscription) {
    throw new Error('Subscription not found');
  }

  // 2. Validate subscription can be renewed
  if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) { // ✅ Use enum constant
    throw new Error('Cannot renew cancelled subscription');
  }

  // 3. Calculate new period (extend by 1 month)
  const newPeriodStart = subscription.currentPeriodEnd;
  const newPeriodEnd = calculatePeriodEnd(newPeriodStart, 'monthly');

  // 4. Use database transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx: any) => {
    // Create payment record
    const payment = await tx.payment.create({
      data: {
        subscriptionId: subscription.id,
        merchantId: subscriptionId,
        amount: subscription.amount,
        currency: subscription.currency,
        method: paymentData.method,
        type: PAYMENT_TYPE.SUBSCRIPTION_PAYMENT as any,
        status: paymentData.method === PAYMENT_METHOD.STRIPE ? PAYMENT_STATUS.COMPLETED as any : PAYMENT_STATUS.PENDING as any,
        transactionId: paymentData.transactionId,
        reference: paymentData.reference,
        description: paymentData.description || `Monthly subscription renewal - ${new Date().toLocaleDateString()}`,
        processedAt: paymentData.method === PAYMENT_METHOD.STRIPE ? new Date() : null
      }
    });

    // Update subscription period
    const updatedSubscription = await tx.subscription.update({
      where: { merchantId: subscription.merchantId },
      data: {
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        status: SUBSCRIPTION_STATUS.ACTIVE, // ✅ Use enum constant
        updatedAt: new Date()
      },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        plan: true
      }
    });

    // Update merchant status
    await tx.merchant.update({
      where: { id: subscription.merchantId },
      data: {
        // subscriptionStatus removed - use subscription.status instead
        lastActiveAt: new Date()
      }
    });

    return { updatedSubscription, payment };
  });

  // 5. Return formatted response
  return {
    subscription: transformSubscriptionFromDb(result.updatedSubscription),
    payment: {
      id: result.payment.id,
      subscriptionId: subscriptionId,
      amount: result.payment.amount,
      currency: result.payment.currency,
      method: result.payment.method,
      status: result.payment.status,
      transactionId: result.payment.transactionId || '',
      description: result.payment.description || undefined,
      createdAt: result.payment.createdAt,
      updatedAt: result.payment.updatedAt
    }
  };
}

// ============================================================================
// SIMPLIFIED API FUNCTIONS (for db object)
// ============================================================================

export const simplifiedSubscriptions = {
  /**
   * Find subscription by ID (simplified API)
   */
  findById: async (id: number) => {
    return await prisma.subscription.findUnique({
      where: { id },
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });
  },

  /**
   * Find subscription by merchant ID (simplified API)
   */
  findByMerchantId: async (merchantId: number) => {
    return await prisma.subscription.findFirst({
      where: { 
        merchantId,
        status: { not: 'CANCELLED' }
      },
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });
  },

  /**
   * Create new subscription (simplified API)
   */
  create: async (data: any) => {
    return await prisma.subscription.create({
      data,
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } }
      }
    });
  },

  /**
   * Update subscription (simplified API)
   */
  update: async (id: number, data: any) => {
    return await prisma.subscription.update({
      where: { id },
      data,
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } }
      }
    });
  },

  /**
   * Delete subscription (simplified API)
   */
  delete: async (id: number) => {
    return await prisma.subscription.update({
      where: { id },
      data: { 
        status: 'CANCELLED',
        canceledAt: new Date()
      }
    });
  },

  /**
   * Search subscriptions with simple filters (simplified API)
   */
  search: async (filters: any) => {
    const { page = 1, limit = 20, ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    // Apply search filter (merchant name)
    if (whereFilters.search) {
      where.merchant = {
        name: {
          contains: whereFilters.search,
          mode: 'insensitive'
        }
      };
    }
    
    if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
    if (whereFilters.planId) where.planId = whereFilters.planId;
    if (whereFilters.isActive !== undefined) {
      if (whereFilters.isActive) {
        where.status = { not: 'CANCELLED' };
      } else {
        where.status = 'CANCELLED';
      }
    }
    if (whereFilters.status) where.status = whereFilters.status;
    
    // Date range filters
    if (whereFilters.startDate || whereFilters.endDate) {
      where.createdAt = {};
      if (whereFilters.startDate) where.createdAt.gte = whereFilters.startDate;
      if (whereFilters.endDate) where.createdAt.lte = whereFilters.endDate;
    }

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        include: {
          merchant: { select: { id: true, name: true } },
          plan: { select: { id: true, name: true } },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.subscription.count({ where })
    ]);

    return {
      data: subscriptions,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },

  /**
   * Find first subscription matching criteria (simplified API)
   */
  findFirst: async (whereClause: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.subscription.findFirst({
      where,
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });
  },

  /**
   * Get subscription statistics (simplified API)
   */
  getStats: async (whereClause?: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.subscription.count({ where });
  },

  /**
   * Get expired subscriptions (simplified API)
   */
  getExpired: async () => {
    const now = new Date();
    
    return await prisma.subscription.findMany({
      where: {
        status: { not: 'CANCELLED' },
        OR: [
          { 
            status: 'TRIAL',
            trialEnd: { lt: now }
          },
          {
            status: 'ACTIVE',
            currentPeriodEnd: { lt: now }
          }
        ]
      },
      include: {
        merchant: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true } }
      },
      orderBy: { currentPeriodEnd: 'asc' }
    });
  }
};