import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { calculateProration, shouldApplyProration } from '@rentalshop/utils';
import { z } from 'zod';
import {API} from '@rentalshop/constants';

// Validation schema for plan change
const planChangeSchema = z.object({
  planId: z.number().positive('Plan ID is required'),
  planVariantId: z.number().positive().optional(),
  billingInterval: z.enum(['month', 'quarter', 'semiAnnual', 'year']).default('month'),
  reason: z.string().optional(),
  effectiveDate: z.string().optional().transform((val) => {
    if (!val) return undefined;
    // Handle both datetime-local format (2025-01-15T10:30) and full ISO format
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }),
  notifyMerchant: z.boolean().default(true)
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const merchantId = parseInt(params.id);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = planChangeSchema.parse(body);

    // Start transaction to ensure all operations succeed or fail together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get merchant
      const merchant = await tx.merchant.findUnique({
        where: { id: merchantId },
        include: { Plan: true, subscription: true } as any
      }) as any;

      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // 2. Get new plan
      const newPlan = await tx.plan.findUnique({
        where: { id: validatedData.planId }
      });

      if (!newPlan) {
        throw new Error('Plan not found');
      }

      if (!newPlan.isActive) {
        throw new Error('Plan is not active');
      }

      // 3. Get plan variant if specified
      let planVariant = null;
      if (validatedData.planVariantId) {
        // planVariant = await tx.planVariant.findUnique({
        //   where: { id: validatedData.planVariantId }
        // });

        // if (!planVariant) {
        //   throw new Error('Plan variant not found');
        // }

        // if (!planVariant.isActive) {
        //   throw new Error('Plan variant is not active');
        // }

        // if (planVariant.planId !== newPlan.id) {
        //   throw new Error('Plan variant does not belong to selected plan');
        // }
      }

      // 4. Check if merchant is already on this plan
      if (merchant.PlanId === newPlan.id) {
        throw new Error('Merchant is already on this plan');
      }

      // 5. Get current subscription
      const currentSubscription = merchant.subscription;
      const effectiveDate = validatedData.effectiveDate 
        ? new Date(validatedData.effectiveDate)
        : new Date();

      // 6. Calculate pricing and duration based on billing interval
      const finalPrice = newPlan.basePrice;
      
      // Use provided billing interval or current subscription's interval as default
      const billingInterval = validatedData.billingInterval || 
        (currentSubscription?.interval as string) || 
        'month';
      
      console.log('🔍 Plan change billing interval:', {
        provided: validatedData.billingInterval,
        currentSubscription: currentSubscription?.interval,
        final: billingInterval
      });
      
      // Calculate period duration in days based on billing interval
      const getPeriodDays = (interval: string): number => {
        switch (interval) {
          case 'month': return 30;
          case 'quarter': return 90;
          case 'semiAnnual': return 180;
          case 'year': return 365;
          default: return 30;
        }
      };
      
      const periodDays = getPeriodDays(billingInterval);
      const endDate = new Date(effectiveDate.getTime() + periodDays * 24 * 60 * 60 * 1000);

      // 7. Update existing subscription or create new one
      let newSubscription;
      
      if (currentSubscription) {
        // Update existing subscription
        newSubscription = await tx.subscription.update({
          where: { id: currentSubscription.id },
          data: {
            planId: newPlan.id,
            status: 'ACTIVE',
            currentPeriodStart: effectiveDate,
            currentPeriodEnd: endDate,
            amount: finalPrice,
            currency: newPlan.currency,
            interval: billingInterval,
            intervalCount: 1,
            cancelAtPeriodEnd: false,
            updatedAt: new Date()
          } as any
        });
      } else {
        // Create new subscription if none exists
        const lastSubscription = await tx.subscription.findFirst({
          orderBy: { id: 'desc' }
        });
        const subscriptionPublicId = (lastSubscription?.id || 0) + 1;

        newSubscription = await tx.subscription.create({
          data: {
            id: subscriptionPublicId,
            merchantId: merchant.id,
            planId: newPlan.id,
            status: 'ACTIVE',
            currentPeriodStart: effectiveDate,
            currentPeriodEnd: endDate,
            amount: finalPrice,
            currency: newPlan.currency,
            interval: billingInterval,
            intervalCount: 1,
            cancelAtPeriodEnd: false
          } as any
        });
      }

      // 8. Calculate proration for plan changes
      let prorationAmount = 0;
      let prorationNotes = '';
      
      if (currentSubscription && merchant.Plan) {
        const currentPrice = currentSubscription.amount;
        const proration = calculateProration(
          {
            amount: currentPrice,
            currentPeriodStart: currentSubscription.currentPeriodStart,
            currentPeriodEnd: currentSubscription.currentPeriodEnd || new Date()
          },
          finalPrice,
          effectiveDate
        );
        
        // Only charge proration for upgrades
        if (proration.isUpgrade && proration.chargeAmount > 0) {
          prorationAmount = proration.chargeAmount;
          prorationNotes = ` (Proration: $${prorationAmount.toFixed(2)} - ${proration.reason})`;
        }
      }

      // 9. Create payment record for plan change
      const lastPayment = await tx.payment.findFirst({
        orderBy: { id: 'desc' }
      });
      const paymentPublicId = (lastPayment?.id || 0) + 1;

      // Determine payment status based on plan change type
      let paymentStatus = 'COMPLETED';
      let paymentMethod = 'MANUAL';
      let paymentAmount = finalPrice;
      let paymentNotes = `Plan change from ${merchant.Plan?.name || 'None'} to ${newPlan.name}`;
      
      // Check if this is a free upgrade (trial to paid, or downgrade)
      const isFreeUpgrade = finalPrice === 0 || (merchant.Plan && newPlan.basePrice <= merchant.Plan.basePrice);
      const isTrialToPaid = merchant.subscriptionStatus === 'trial' && newPlan.basePrice > 0;
      
      if (isFreeUpgrade) {
        paymentStatus = 'COMPLETED';
        paymentMethod = 'MANUAL';
        paymentAmount = 0;
        paymentNotes += ' (Free upgrade - no payment required)';
      } else if (isTrialToPaid) {
        paymentStatus = 'PENDING';
        paymentMethod = 'MANUAL';
        paymentAmount = finalPrice;
        paymentNotes += ' (Trial to paid - payment pending)';
      } else if (prorationAmount > 0) {
        // Upgrade with proration
        paymentStatus = 'COMPLETED';
        paymentMethod = 'MANUAL';
        paymentAmount = prorationAmount;
        paymentNotes += prorationNotes;
      } else {
        // Regular plan change
        paymentStatus = 'COMPLETED';
        paymentMethod = 'MANUAL';
        paymentAmount = finalPrice;
        paymentNotes += ' (Admin-initiated plan change)';
      }

      const paymentRecord = await tx.payment.create({
        data: {
          id: paymentPublicId,
          amount: paymentAmount,
          method: paymentMethod,
          type: 'PLAN_CHANGE',
          status: paymentStatus,
          reference: `PLAN-CHANGE-${merchant.id}-${newSubscription.id}`,
          notes: paymentNotes,
          processedAt: paymentStatus === 'COMPLETED' ? new Date() : null,
          processedBy: user.databaseId,
          subscriptionId: newSubscription.id,
          merchantId: merchant.id
        } as any
      });

      // 9. Update merchant plan
      const updatedMerchant = await tx.merchant.update({
        where: { id: merchant.id },
        data: {
          planId: newPlan.id,
          subscriptionStatus: 'active',
          updatedAt: new Date()
        },
        include: { Plan: true } as any
      });

      // 10. Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'MERCHANT',
          entityId: merchant.id,
          action: 'PLAN_CHANGED',
          details: JSON.stringify({
            oldPlanId: merchant.Plan?.id || null,
            oldPlanName: merchant.Plan?.name || 'None',
            newPlanId: newPlan.id,
            newPlanName: newPlan.name,
            planVariantId: null,
            planVariantName: null,
            finalPrice: finalPrice,
            billingInterval: billingInterval,
            periodDays: periodDays,
            reason: validatedData.reason,
            effectiveDate: effectiveDate.toISOString(),
            changedBy: user.databaseId,
            changedByEmail: user.email
          }),
          userId: user.databaseId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return {
        merchant: {
          id: updatedMerchant.id,
          name: updatedMerchant.name,
          email: updatedMerchant.email,
          subscriptionStatus: updatedMerchant.subscriptionStatus,
          currentPlan: {
            id: newPlan.id,
            name: newPlan.name,
            description: newPlan.description,
            basePrice: newPlan.basePrice,
            currency: newPlan.currency,
            limits: JSON.parse(newPlan.limits),
            features: JSON.parse(newPlan.features)
          },
          subscriptionPeriod: {
            startDate: newSubscription.currentPeriodStart,
            endDate: newSubscription.currentPeriodEnd,
            duration: newSubscription.interval,
            billingInterval: newSubscription.interval,
            isActive: newSubscription.status === 'active',
            daysRemaining: Math.ceil((newSubscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
            nextBillingDate: newSubscription.currentPeriodEnd,
            isTrial: newSubscription.status === 'trial',
          }
        }
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant plan updated successfully',
      data: result
    });

  } catch (error: any) {
    console.error('Plan change error:', error);
    
    // Handle validation errors
    if (error.name === 'ZodError') {
      return NextResponse.json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      }, { status: 400 });
    }
    
    // Handle specific errors
    if (error.message === 'Merchant not found') {
      return NextResponse.json({
        success: false,
        message: 'Merchant not found'
      }, { status: API.STATUS.NOT_FOUND });
    }
    
    if (error.message === 'Plan not found') {
      return NextResponse.json({
        success: false,
        message: 'Plan not found'
      }, { status: API.STATUS.NOT_FOUND });
    }
    
    if (error.message === 'Plan is not active') {
      return NextResponse.json({
        success: false,
        message: 'Selected plan is not active'
      }, { status: 400 });
    }
    
    if (error.message === 'Merchant is already on this plan') {
      return NextResponse.json({
        success: false,
        message: 'Merchant is already on this plan'
      }, { status: 400 });
    }
    
    // Generic error
    return NextResponse.json({
      success: false,
      message: 'Failed to update merchant plan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}

// Get merchant's plan history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const merchantId = parseInt(params.id);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    // Get merchant with current plan and subscription history
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        Plan: true,
        subscription: {
          include: { plan: true } as any
        }
      } as any
    }) as any;

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Get plan change audit logs
    const planChangeLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'MERCHANT',
        entityId: merchant.id,
        action: 'PLAN_CHANGED'
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return NextResponse.json({
      success: true,
      data: {
        merchant: {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email,
          subscriptionStatus: merchant.subscriptionStatus,
          currentPlan: merchant.Plan ? {
            id: merchant.Plan.id,
            name: merchant.Plan.name,
            description: merchant.Plan.description,
            basePrice: merchant.Plan.basePrice,
            currency: merchant.Plan.currency,
            limits: JSON.parse(merchant.Plan.limits),
            features: JSON.parse(merchant.Plan.features)
          } : null
        },
        planChangeHistory: planChangeLogs.map(log => ({
          id: log.id,
          action: log.action,
          details: JSON.parse(log.details),
          createdAt: log.createdAt,
          changedBy: log.userId
        }))
      }
    });

  } catch (error: any) {
    console.error('Get merchant plan history error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get merchant plan history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}

// Disable or delete merchant plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const merchantId = parseInt(params.id);
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, subscriptionId, reason } = body;

    if (!action || !subscriptionId || !reason) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get merchant
      const merchant = await tx.merchant.findUnique({
        where: { id: merchantId }
      });

      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // Get subscription
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId }
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.merchantId !== merchant.id) {
        throw new Error('Subscription does not belong to this merchant');
      }

      let updatedSubscription;
      let auditAction;

      if (action === 'disable') {
        // Disable subscription
        updatedSubscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'DISABLED',
            cancelReason: reason,
            canceledAt: new Date(),
          } as any
        });
        auditAction = 'PLAN_DISABLED';
      } else if (action === 'delete') {
        // Soft delete subscription
        updatedSubscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'DELETED',
            cancelReason: reason,
            canceledAt: new Date(),
          } as any
        });
        auditAction = 'PLAN_DELETED';
      } else {
        throw new Error('Invalid action');
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'SUBSCRIPTION',
          entityId: subscription.id,
          action: auditAction,
          details: JSON.stringify({
            subscriptionId: subscription.id,
            planId: subscription.planId,
            action: action,
            reason: reason,
            changedBy: user.databaseId,
            changedByEmail: user.email
          }),
          userId: user.databaseId,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return {
        subscription: updatedSubscription,
        action: action,
        reason: reason
      };
    });

    return NextResponse.json({
      success: true,
      message: `Plan ${action === 'disable' ? 'disabled' : 'deleted'} successfully`,
      data: result
    });

  } catch (error: any) {
    console.error('Plan management error:', error);
    
    // Handle specific errors
    if (error.message === 'Merchant not found') {
      return NextResponse.json({
        success: false,
        message: 'Merchant not found'
      }, { status: API.STATUS.NOT_FOUND });
    }
    
    if (error.message === 'Subscription not found') {
      return NextResponse.json({
        success: false,
        message: 'Subscription not found'
      }, { status: API.STATUS.NOT_FOUND });
    }
    
    if (error.message === 'Subscription does not belong to this merchant') {
      return NextResponse.json({
        success: false,
        message: 'Subscription does not belong to this merchant'
      }, { status: 400 });
    }
    
    if (error.message === 'Invalid action') {
      return NextResponse.json({
        success: false,
        message: 'Invalid action. Must be "disable" or "delete"'
      }, { status: 400 });
    }
    
    // Generic error
    return NextResponse.json({
      success: false,
      message: 'Failed to manage plan',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}
