import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';
import { calculateProration, shouldApplyProration } from '@rentalshop/utils';
import { z } from 'zod';

// Validation schema for plan change
const planChangeSchema = z.object({
  planId: z.number().positive('Plan ID is required'),
  planVariantId: z.number().positive().optional(),
  reason: z.string().optional(),
  effectiveDate: z.string().datetime().optional(),
  notifyMerchant: z.boolean().default(true)
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
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
        where: { publicId: merchantId },
        include: { plan: true, subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } }
      });

      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // 2. Get new plan
      const newPlan = await tx.plan.findUnique({
        where: { publicId: validatedData.planId }
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
        planVariant = await tx.planVariant.findUnique({
          where: { publicId: validatedData.planVariantId }
        });

        if (!planVariant) {
          throw new Error('Plan variant not found');
        }

        if (!planVariant.isActive) {
          throw new Error('Plan variant is not active');
        }

        if (planVariant.planId !== newPlan.id) {
          throw new Error('Plan variant does not belong to selected plan');
        }
      }

      // 4. Check if merchant is already on this plan
      if (merchant.planId === newPlan.id) {
        throw new Error('Merchant is already on this plan');
      }

      // 5. Get current subscription
      const currentSubscription = merchant.subscriptions[0];
      const effectiveDate = validatedData.effectiveDate 
        ? new Date(validatedData.effectiveDate)
        : new Date();

      // 6. Calculate pricing and duration
      const finalPrice = planVariant ? planVariant.price : newPlan.basePrice;
      const durationMonths = planVariant ? planVariant.duration : 1;
      const endDate = new Date(effectiveDate.getTime() + (durationMonths * 30 * 24 * 60 * 60 * 1000));

      // 7. Create new subscription
      const lastSubscription = await tx.subscription.findFirst({
        orderBy: { publicId: 'desc' }
      });
      const subscriptionPublicId = (lastSubscription?.publicId || 0) + 1;

      const newSubscription = await tx.subscription.create({
        data: {
          publicId: subscriptionPublicId,
          merchantId: merchant.id,
          planId: newPlan.id,
          planVariantId: planVariant?.id,
          status: 'ACTIVE',
          startDate: effectiveDate,
          endDate: endDate,
          nextBillingDate: endDate,
          amount: finalPrice,
          currency: newPlan.currency,
          autoRenew: true,
          changeReason: validatedData.reason || 'Plan changed by admin',
          changedBy: user.id
        }
      });

      // 8. Calculate proration for plan changes
      let prorationAmount = 0;
      let prorationNotes = '';
      
      if (currentSubscription && merchant.plan) {
        const currentPrice = currentSubscription.amount;
        const proration = calculateProration(
          {
            amount: currentPrice,
            currentPeriodStart: currentSubscription.startDate,
            currentPeriodEnd: currentSubscription.endDate || new Date()
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
        orderBy: { publicId: 'desc' }
      });
      const paymentPublicId = (lastPayment?.publicId || 0) + 1;

      // Determine payment status based on plan change type
      let paymentStatus = 'COMPLETED';
      let paymentMethod = 'MANUAL';
      let paymentAmount = finalPrice;
      let paymentNotes = `Plan change from ${merchant.plan?.name || 'None'} to ${newPlan.name}${planVariant ? ` (${planVariant.name})` : ''}`;
      
      // Check if this is a free upgrade (trial to paid, or downgrade)
      const isFreeUpgrade = finalPrice === 0 || (merchant.plan && newPlan.basePrice <= merchant.plan.basePrice);
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
          publicId: paymentPublicId,
          amount: paymentAmount,
          method: paymentMethod,
          type: 'PLAN_CHANGE',
          status: paymentStatus,
          reference: `PLAN-CHANGE-${merchant.publicId}-${newSubscription.publicId}`,
          notes: paymentNotes,
          processedAt: paymentStatus === 'COMPLETED' ? new Date() : null,
          processedBy: user.id,
          subscriptionId: newSubscription.id,
          merchantId: merchant.id
        }
      });

      // 9. Update merchant plan
      const updatedMerchant = await tx.merchant.update({
        where: { id: merchant.id },
        data: {
          planId: newPlan.id,
          subscriptionStatus: 'active',
          updatedAt: new Date()
        },
        include: { plan: true }
      });

      // 10. Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'MERCHANT',
          entityId: merchant.id,
          action: 'PLAN_CHANGED',
          details: JSON.stringify({
            oldPlanId: merchant.plan?.publicId || null,
            oldPlanName: merchant.plan?.name || 'None',
            newPlanId: newPlan.publicId,
            newPlanName: newPlan.name,
            planVariantId: planVariant?.publicId || null,
            planVariantName: planVariant?.name || null,
            finalPrice: finalPrice,
            durationMonths: durationMonths,
            reason: validatedData.reason,
            effectiveDate: effectiveDate.toISOString(),
            changedBy: user.id,
            changedByEmail: user.email
          }),
          userId: user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return {
        merchant: updatedMerchant,
        subscription: newSubscription,
        planChange: {
          from: merchant.plan?.name || 'None',
          to: newPlan.name,
          variant: planVariant?.name || null,
          price: finalPrice,
          duration: durationMonths,
          effectiveDate: effectiveDate.toISOString(),
          reason: validatedData.reason
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
      }, { status: 404 });
    }
    
    if (error.message === 'Plan not found') {
      return NextResponse.json({
        success: false,
        message: 'Plan not found'
      }, { status: 404 });
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
    }, { status: 500 });
  }
}

// Get merchant's plan history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
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
      where: { publicId: merchantId },
      include: {
        plan: true,
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 404 }
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
          id: merchant.publicId,
          name: merchant.name,
          email: merchant.email,
          currentPlan: merchant.plan ? {
            id: merchant.plan.publicId,
            name: merchant.plan.name,
            price: merchant.plan.basePrice,
            currency: merchant.plan.currency
          } : null,
          subscriptionStatus: merchant.subscriptionStatus
        },
        subscriptions: merchant.subscriptions.map(sub => ({
          id: sub.publicId,
          planName: sub.plan.name,
          status: sub.status,
          startDate: sub.startDate,
          endDate: sub.endDate,
          amount: sub.amount,
          currency: sub.currency,
          changeReason: sub.changeReason
        })),
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
    }, { status: 500 });
  }
}

// Disable or delete merchant plan
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
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
        where: { publicId: merchantId }
      });

      if (!merchant) {
        throw new Error('Merchant not found');
      }

      // Get subscription
      const subscription = await tx.subscription.findUnique({
        where: { publicId: subscriptionId }
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
            cancellationReason: reason,
            cancelledAt: new Date(),
            autoRenew: false
          }
        });
        auditAction = 'PLAN_DISABLED';
      } else if (action === 'delete') {
        // Soft delete subscription
        updatedSubscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'DELETED',
            cancellationReason: reason,
            cancelledAt: new Date(),
            autoRenew: false
          }
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
            subscriptionId: subscription.publicId,
            planId: subscription.planId,
            action: action,
            reason: reason,
            changedBy: user.id,
            changedByEmail: user.email
          }),
          userId: user.id,
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
      }, { status: 404 });
    }
    
    if (error.message === 'Subscription not found') {
      return NextResponse.json({
        success: false,
        message: 'Subscription not found'
      }, { status: 404 });
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
    }, { status: 500 });
  }
}
