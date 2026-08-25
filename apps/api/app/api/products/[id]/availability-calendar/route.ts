import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { ORDER_TYPE, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import {
  AVAILABILITY_CALENDAR_TIMEZONE,
  calendarDayAvailability,
  getAvailabilityCivilDayBounds,
} from '../../../../../lib/availability-calendar-days';
import { z } from 'zod';

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From must be YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To must be YYYY-MM-DD'),
  outletId: z.coerce.number().int().positive().optional(),
});

/**
 * GET /api/products/[id]/availability-calendar
 * Remaining units per shop civil day for Order Check (stock − overlapping RENT qty).
 * Day keys use Asia/Ho_Chi_Minh — same model as Lịch Thuê / getLocalDateKey.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const { id } = resolvedParams;

  return withPermissions(['products.view'], { requireActiveSubscription: false })(
    async (request, { user, userScope }) => {
      try {
        if (!/^\d+$/.test(id)) {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_PRODUCT_ID_FORMAT'),
            { status: 400 }
          );
        }

        const productId = parseInt(id, 10);
        const query = Object.fromEntries(new URL(request.url).searchParams.entries());
        const parsed = querySchema.safeParse(query);
        if (!parsed.success) {
          return NextResponse.json(
            ResponseBuilder.validationError(parsed.error.flatten()),
            { status: 400 }
          );
        }

        const { from, to, outletId: queryOutletId } = parsed.data;
        const userMerchantId = userScope.merchantId;
        const userOutletId = userScope.outletId;

        if (user.role !== USER_ROLE.ADMIN && !userMerchantId) {
          return NextResponse.json(
            ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
            { status: 400 }
          );
        }

        let finalOutletId = 0;
        if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
          finalOutletId = queryOutletId || userOutletId || 0;
        } else if (user.role === USER_ROLE.MERCHANT || user.role === USER_ROLE.ADMIN) {
          if (!queryOutletId) {
            return NextResponse.json(
              ResponseBuilder.error('OUTLET_REQUIRED'),
              { status: 400 }
            );
          }
          finalOutletId = queryOutletId;
        } else {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_USER_ROLE'),
            { status: 400 }
          );
        }

        if (!finalOutletId) {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_OUTLET_ID'),
            { status: 400 }
          );
        }

        const product = await db.products.findById(productId);
        if (!product) {
          return NextResponse.json(
            ResponseBuilder.error('PRODUCT_NOT_FOUND'),
            { status: 404 }
          );
        }

        const productMerchantId = product.merchant?.id;
        if (user.role !== USER_ROLE.ADMIN && productMerchantId !== userMerchantId) {
          return NextResponse.json(
            ResponseBuilder.error('PRODUCT_ACCESS_DENIED'),
            { status: 403 }
          );
        }

        const outletStock = await db.prisma.outletStock.findFirst({
          where: { productId, outletId: finalOutletId },
          select: { stock: true },
        });

        if (!outletStock) {
          return NextResponse.json(
            ResponseBuilder.error('PRODUCT_OUTLET_NOT_FOUND'),
            { status: 404 }
          );
        }

        // Query window in shop civil days (VN), not UTC midnight — matches Lịch Thuê.
        const fromBounds = getAvailabilityCivilDayBounds(from, AVAILABILITY_CALENDAR_TIMEZONE);
        const toBounds = getAvailabilityCivilDayBounds(to, AVAILABILITY_CALENDAR_TIMEZONE);
        if (!fromBounds || !toBounds) {
          return NextResponse.json(
            ResponseBuilder.error('INVALID_DATE_FORMAT'),
            { status: 400 }
          );
        }
        const rangeStart = fromBounds.start;
        const rangeEnd = toBounds.end;

        const orders = await db.prisma.order.findMany({
          where: {
            orderType: ORDER_TYPE.RENT as any,
            status: {
              in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any],
            },
            outletId: finalOutletId,
            deletedAt: null,
            pickupPlanAt: { lt: rangeEnd },
            returnPlanAt: { gt: rangeStart },
            orderItems: {
              some: { productId },
            },
          },
          select: {
            pickupPlanAt: true,
            returnPlanAt: true,
            orderItems: {
              where: { productId },
              select: { quantity: true },
            },
          },
        });

        const days = calendarDayAvailability({
          stock: outletStock.stock,
          fromYmd: from,
          toYmd: to,
          timeZone: AVAILABILITY_CALENDAR_TIMEZONE,
          orders: orders.map((order) => ({
            pickupPlanAt: order.pickupPlanAt,
            returnPlanAt: order.returnPlanAt,
            quantity: order.orderItems.reduce((sum, item) => sum + item.quantity, 0),
          })),
        });

        return NextResponse.json(
          ResponseBuilder.success('AVAILABILITY_CHECKED', {
            stock: outletStock.stock,
            from,
            to,
            timeZone: AVAILABILITY_CALENDAR_TIMEZONE,
            days,
            occupiedDates: days.filter((d) => d.available === 0).map((d) => d.date),
          })
        );
      } catch (error) {
        console.error('Error in GET /api/products/[id]/availability-calendar:', error);
        const { response, statusCode } = handleApiError(error);
        return NextResponse.json(response, { status: statusCode });
      }
    }
  )(request);
}
