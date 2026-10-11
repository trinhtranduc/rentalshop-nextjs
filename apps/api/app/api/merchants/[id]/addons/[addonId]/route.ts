import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { validateAddonDeletion } from '@rentalshop/utils/server';
import { handleApiError, isAddonEnded, merchantAddonUpdateSchema, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import { routeId } from '../../../../../../lib/merchant-addons';

/**
 * PATCH /api/merchants/[id]/addons/[addonId] { removeAtPeriodEnd } — remove at the end of the period, or undo (#850).
 * ADMIN only. Marking sets `endsAt` = the subscription's current end; the item counts until then. Refused (422
 * CANNOT_DELETE_ADDON_LIMIT_EXCEEDED) when the shop's usage would be above the limit without it. Undo only while the
 * item is still in that period (else 422 ADDON_ALREADY_ENDED). No refund.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addonId: string }> | { id: string; addonId: string } }
) {
  const { id, addonId } = await Promise.resolve(params);
  return withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest) => {
    try {
      const merchantId = routeId(id);
      const itemId = routeId(addonId);
      if (!merchantId || !itemId) return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      const parsed = merchantAddonUpdateSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const item: any = await db.merchantAddons.findById(itemId);
      if (!item || item.merchantId !== merchantId) {
        return NextResponse.json(ResponseBuilder.error('PLAN_LIMIT_ADDON_NOT_FOUND'), { status: 404 });
      }
      const merchant: any = await db.merchants.findById(merchantId);
      const periodEnd: Date | null = merchant?.subscription?.currentPeriodEnd ? new Date(merchant.subscription.currentPeriodEnd) : null;
      const now = new Date();

      if (parsed.data.removeAtPeriodEnd) {
        if (isAddonEnded(item, now)) {
          return NextResponse.json(ResponseBuilder.error('ADDON_ALREADY_ENDED'), { status: 422 });
        }
        if (item.removeAtPeriodEnd) {
          return NextResponse.json(ResponseBuilder.success('MERCHANT_ADDON_UPDATED', { addon: item }));
        }
        const validation: any = await validateAddonDeletion(merchantId, {
          outlets: item.outlets,
          users: item.users,
          products: item.products,
          customers: item.customers,
          orders: item.orders,
        });
        if (!validation.isValid && validation.exceededLimits) {
          const body: any = ResponseBuilder.error('CANNOT_DELETE_ADDON_LIMIT_EXCEEDED');
          body.error = { exceededLimits: validation.exceededLimits, currentCounts: validation.currentCounts, futureLimits: validation.futureLimits };
          return NextResponse.json(body, { status: 422 });
        }
        const addon = await db.merchantAddons.setRemoveAtPeriodEnd(itemId, true, periodEnd ?? now);
        return NextResponse.json(ResponseBuilder.success('MERCHANT_ADDON_UPDATED', { addon }));
      }

      // Undo: only in the same period, before its end
      const samePeriod =
        item.endsAt && periodEnd && new Date(item.endsAt).getTime() === periodEnd.getTime() && periodEnd.getTime() > now.getTime();
      if (item.removeAtPeriodEnd && !samePeriod) {
        return NextResponse.json(ResponseBuilder.error('ADDON_ALREADY_ENDED'), { status: 422 });
      }
      if (isAddonEnded(item, now)) {
        return NextResponse.json(ResponseBuilder.error('ADDON_ALREADY_ENDED'), { status: 422 });
      }
      const addon = await db.merchantAddons.setRemoveAtPeriodEnd(itemId, false, null);
      return NextResponse.json(ResponseBuilder.success('MERCHANT_ADDON_UPDATED', { addon }));
    } catch (error) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
