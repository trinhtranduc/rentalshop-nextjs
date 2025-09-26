// ============================================================================
// MERCHANT REGISTRATION WITH AUTO TRIAL ENROLLMENT
// ============================================================================

import { prisma } from './client';
import { createUser } from './user';
import { createSubscription } from './subscription';
import { hashPassword } from '@rentalshop/auth';
import type { UserCreateInput } from '@rentalshop/types';

export interface MerchantRegistrationInput {
  // Merchant details
  merchantName: string;
  merchantEmail: string;
  merchantPhone?: string;
  merchantDescription?: string;
  
  // User details (merchant owner)
  userEmail: string;
  userPassword: string;
  userFirstName: string;
  userLastName: string;
  userPhone?: string;
  
  // Optional outlet details
  outletName?: string;
  outletAddress?: string;
  outletDescription?: string;
}

export interface MerchantRegistrationResult {
  merchant: {
    id: number;
    name: string;
    email: string;
    subscriptionStatus: string;
  };
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  subscription: {
    id: number;
    status: string;
    trialEnd: Date;
    planName: string;
  };
  outlet?: {
    id: number;
    name: string;
    address?: string;
  };
}

/**
 * Register a new merchant with automatic trial plan enrollment
 */
export async function registerMerchantWithTrial(
  data: MerchantRegistrationInput
): Promise<MerchantRegistrationResult> {
  try {
    // Start transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Check if merchant email already exists
      const existingMerchant = await tx.merchant.findUnique({
        where: { email: data.merchantEmail }
      });

      if (existingMerchant) {
        throw new Error('Merchant with this email already exists');
      }

      // 2. Check if user email already exists
      const existingUser = await tx.user.findUnique({
        where: { email: data.userEmail }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // 3. Get trial plan
      const trialPlan = await tx.plan.findFirst({
        where: { 
          name: 'Trial',
          isActive: true 
        }
      });

      if (!trialPlan) {
        throw new Error('Trial plan not found. Please contact support.');
      }

      // 4. Generate merchant id
      const lastMerchant = await tx.merchant.findFirst({
        orderBy: { id: 'desc' }
      });
      const merchantPublicId = (lastMerchant?.id || 0) + 1;

      // 5. Create merchant
      const merchant = await tx.merchant.create({
        data: {
          id: merchantPublicId,
          name: data.merchantName,
          email: data.merchantEmail,
          phone: data.merchantPhone,
          description: data.merchantDescription,
          isActive: true,
          subscriptionStatus: 'trial'
        }
      });

      // 6. Create merchant owner user
      const hashedPassword = await hashPassword(data.userPassword);
      
      const lastUser = await tx.user.findFirst({
        orderBy: { id: 'desc' }
      });
      const userPublicId = (lastUser?.id || 0) + 1;

      const user = await tx.user.create({
        data: {
          id: userPublicId,
          email: data.userEmail,
          password: hashedPassword,
          firstName: data.userFirstName,
          lastName: data.userLastName,
          phone: data.userPhone,
          role: 'MERCHANT',
          merchantId: merchant.id,
          isActive: true
        }
      });

      // 7. Create default outlet if provided
      let outlet = null;
      if (data.outletName) {
        const lastOutlet = await tx.outlet.findFirst({
          orderBy: { id: 'desc' }
        });
        const outletPublicId = (lastOutlet?.id || 0) + 1;

        outlet = await tx.outlet.create({
          data: {
            id: outletPublicId,
            name: data.outletName,
            address: data.outletAddress,
            description: data.outletDescription,
            merchantId: merchant.id,
            isActive: true
          }
        });
      }

      // 8. Create trial subscription
      const subscriptionStartDate = new Date();
      const endDate = new Date(subscriptionStartDate.getTime() + (trialPlan.trialDays * 24 * 60 * 60 * 1000));
      
      const lastSubscription = await tx.subscription.findFirst({
        orderBy: { id: 'desc' }
      });
      const subscriptionPublicId = (lastSubscription?.id || 0) + 1;

      const subscription = await tx.subscription.create({
        data: {
          id: subscriptionPublicId,
          merchantId: merchant.id,
          planId: trialPlan.id,
          status: 'trial',
          currentPeriodStart: subscriptionStartDate,
          currentPeriodEnd: endDate,
          trialStart: subscriptionStartDate,
          amount: 0, // Free trial
          currency: trialPlan.currency,
          interval: 'month',
          intervalCount: 1,
          period: 1,
          discount: 0,
          savings: 0,
          cancelAtPeriodEnd: false
        }
      });

      // 9. Update merchant with plan reference
      await tx.merchant.update({
        where: { id: merchant.id },
        data: {
          planId: trialPlan.id
        }
      });

      return {
        merchant: {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email,
          subscriptionStatus: merchant.subscriptionStatus
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        subscription: {
          id: subscription.id,
          status: subscription.status,
          trialEnd: subscription.trialEnd!,
          planName: trialPlan.name
        },
        outlet: outlet ? {
          id: outlet.id,
          name: outlet.name,
          address: outlet.address || undefined
        } : undefined
      };
    });

    return result;
  } catch (error) {
    console.error('Error registering merchant with trial:', error);
    throw error;
  }
}

/**
 * Get trial plan details
 */
export async function getTrialPlan() {
  return await prisma.plan.findFirst({
    where: { 
      name: 'Trial',
      isActive: true 
    }
  });
}

/**
 * Check if merchant is on trial
 */
export async function isMerchantOnTrial(merchantId: number): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      merchant: { id: merchantId },
      status: 'TRIAL'
    },
    include: {
      plan: true
    }
  });

  if (!subscription) return false;

  // Check if trial has expired
  const now = new Date();
  return subscription.trialEnd ? subscription.trialEnd > now : false;
}

/**
 * Get merchant trial status
 */
export async function getMerchantTrialStatus(merchantId: number) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      merchant: { id: merchantId },
      status: 'TRIAL'
    },
    include: {
      plan: true
    }
  });

  if (!subscription) {
    return {
      isOnTrial: false,
      trialEnd: null,
      daysRemaining: 0,
      planName: null
    };
  }

  const now = new Date();
  const trialEnd = subscription.trialEnd;
  const isOnTrial = trialEnd ? trialEnd > now : false;
  const daysRemaining = trialEnd ? 
    Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  return {
    isOnTrial,
    trialEnd,
    daysRemaining,
    planName: subscription.plan.name
  };
}
