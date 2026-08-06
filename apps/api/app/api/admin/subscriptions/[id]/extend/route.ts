import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import { z } from 'zod';

const extendSchema = z.object({
  months: z.number().int().min(1).max(24),
  reason: z.string().min(1).max(500),
  // Optional: amount paid for this extension (0 = free/promo, positive = paid)
  amount: z.number().min(0).optional(),
  currency: z.string().optional().default('VND'),
  // Optional: payment source for tracking
  paymentSource: z.enum(['TRANSFER', 'CASH', 'PROMO', 'OTHER']).optional(),
});

/**
 * POST /api/admin/subscriptions/[id]/extend
 * Manually extend a subscription (admin only).
 * Used for: direct bank transfers, promo codes, customer support.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['subscriptions.manage'])(async (request, { user }) => {
    try {
      if (user.role !== USER_ROLE.ADMIN) {
        return NextResponse.json(
          ResponseBuilder.error('ADMIN_REQUIRED'),
          { status: 403 }
        );
      }

      const subscriptionId = parseInt(id);
      if (isNaN(subscriptionId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_ID'),
          { status: 400 }
        );
      }

      const body = await request.json();
      const parsed = extendSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const { months, reason, amount: paidAmount, currency: paidCurrency, paymentSource } = parsed.data;

      // Find subscription
      const subscription = await db.prisma.subscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        return NextResponse.json(
          ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
          { status: 404 }
        );
      }

      // Calculate new period end
      const now = new Date();
      const currentEnd = subscription.currentPeriodEnd > now
        ? subscription.currentPeriodEnd
        : now;
      
      const newPeriodEnd = new Date(currentEnd);
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + months);

      // Update subscription — update billing info to match manual extension
      const intervalValue = months <= 1 ? 'monthly' : months <= 3 ? 'quarterly' : months <= 6 ? 'semi_annual' : 'annual';
      const updated = await db.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: newPeriodEnd,
          currentPeriodStart: subscription.status === 'EXPIRED' ? now : subscription.currentPeriodStart,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          cancelReason: null,
          // Keep billing info consistent (single source of truth)
          interval: intervalValue,
          intervalCount: 1,
          // Update amount if provided (0 = free promo, positive = paid)
          ...(paidAmount !== undefined && { amount: paidAmount }),
          ...(paidCurrency && { currency: paidCurrency }),
        },
      });

      // Create Payment record if amount > 0
      if (paidAmount && paidAmount > 0) {
        await db.prisma.payment.create({
          data: {
            amount: paidAmount,
            currency: paidCurrency || 'VND',
            method: (paymentSource === 'TRANSFER' ? 'TRANSFER' : paymentSource === 'CASH' ? 'CASH' : 'MANUAL') as any,
            type: 'SUBSCRIPTION_PAYMENT' as any,
            status: 'COMPLETED' as any,
            subscriptionId,
            merchantId,
            description: `Manual extension ${months} month(s): ${reason}`,
            processedAt: now,
          },
        });
      }

      // Log activity
      await db.prisma.subscriptionActivity.create({
        data: {
          subscriptionId,
          type: 'MANUAL_EXTENSION',
          description: `Extended ${months} month(s) by admin: ${reason}`,
          performedBy: user.id,
          reason,
          metadata: JSON.stringify({
            months,
            previousEnd: subscription.currentPeriodEnd.toISOString(),
            newEnd: newPeriodEnd.toISOString(),
            previousStatus: subscription.status,
          }),
        },
      });

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_EXTENDED', {
          subscription: updated,
          newPeriodEnd: newPeriodEnd.toISOString(),
          monthsAdded: months,
        })
      );
    } catch (error: any) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
