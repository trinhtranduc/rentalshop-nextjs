import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { validateAddonDeletion } from '@rentalshop/utils/server';
import { addonColumnsFor, addonUnitsFit, handleApiError, isAddonEnded, isFeatureAddon, merchantAddonUpdateSchema, ResponseBuilder } from '@rentalshop/utils';
import type { LimitKind } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import { checkAddonPurchase, findShop, routeId } from '../../../../../../lib/merchant-addons';
import type { ShopAddonItem } from '../../../../../../lib/merchant-addons';

/**
 * PATCH /api/merchants/[id]/addons/[addonId] { removeAtPeriodEnd } — remove at the end of the period, or undo (#850).
 * ADMIN only. Marking sets `endsAt` = the subscription's current end; the item counts until then. Refused (422
 * CANNOT_DELETE_ADDON_LIMIT_EXCEEDED) when the shop's usage would be above the limit without it. Undo only while the
 * item is still in that period (else 422 ADDON_ALREADY_ENDED). No refund.
 *
 * PATCH { packs, method?, transactionId?, reference? } (#870, owner 2026-10-11): more packs apply at once and the extra
 * packs are charged now (the #850 quote: catalog price × extra × days left ÷ days; 0 in a trial or an ended period).
 * Fewer packs take effect at the next renewal (`nextPacks`), no refund; refused like a removal when the current usage
 * would not fit. The same number cancels a pending reduction.
 *
 * #943 feature add-on (attendance): `removeAtPeriodEnd` is "Tắt từ kỳ sau" (usable until the period end, no refund, data
 * kept); `packs` → 400 INVALID_INPUT.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; addonId: string }> | { id: string; addonId: string } }
) {
  const { id, addonId } = await Promise.resolve(params);
  return withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, ctx?: { user?: { id?: number; email?: string | null } }) => {
    try {
      const merchantId = routeId(id);
      const itemId = routeId(addonId);
      if (!merchantId || !itemId) return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      const parsed = merchantAddonUpdateSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const item = (await db.merchantAddons.findById(itemId)) as ShopAddonItem | null;
      if (!item || item.merchantId !== merchantId) {
        return NextResponse.json(ResponseBuilder.error('PLAN_LIMIT_ADDON_NOT_FOUND'), { status: 404 });
      }
      if (parsed.data.packs !== undefined) {
        // #943: a feature add-on is on/off, it has no packs
        if (isFeatureAddon(item)) return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
        const user = ctx?.user;
        return changePacks(merchantId, item, parsed.data, user?.email || (user?.id ? String(user.id) : undefined));
      }

      const merchant = await findShop(merchantId);
      const periodEnd: Date | null = merchant?.subscription?.currentPeriodEnd ? new Date(merchant.subscription.currentPeriodEnd) : null;
      const now = new Date();

      if (parsed.data.removeAtPeriodEnd) {
        if (isAddonEnded(item, now)) {
          return NextResponse.json(ResponseBuilder.error('ADDON_ALREADY_ENDED'), { status: 422 });
        }
        if (item.removeAtPeriodEnd) {
          return NextResponse.json(ResponseBuilder.success('MERCHANT_ADDON_UPDATED', { addon: item }));
        }
        const validation = await validateAddonDeletion(merchantId, {
          outlets: item.outlets,
          users: item.users,
          products: item.products,
          customers: item.customers,
          orders: item.orders,
        });
        if (!validation.isValid && validation.exceededLimits) {
          const body = {
            ...ResponseBuilder.error('CANNOT_DELETE_ADDON_LIMIT_EXCEEDED'),
            error: { exceededLimits: validation.exceededLimits, currentCounts: validation.currentCounts, futureLimits: validation.futureLimits },
          };
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


const limitExceeded = (validation: { exceededLimits?: unknown; currentCounts?: unknown; futureLimits?: unknown }) =>
  NextResponse.json(
    {
      ...ResponseBuilder.error('CANNOT_DELETE_ADDON_LIMIT_EXCEEDED'),
      error: { exceededLimits: validation.exceededLimits, currentCounts: validation.currentCounts, futureLimits: validation.futureLimits },
    },
    { status: 422 }
  );

async function changePacks(
  merchantId: number,
  item: ShopAddonItem,
  body: { packs?: number; method?: 'TRANSFER' | 'STRIPE'; transactionId?: string; reference?: string },
  createdBy?: string
) {
  const now = new Date();
  const packs = body.packs as number;
  if (isAddonEnded(item, now)) {
    return NextResponse.json(ResponseBuilder.error('ADDON_ALREADY_ENDED'), { status: 422 });
  }
  // An old free add-on has no price-list row: it has no packs to change
  if (item.addonPriceId == null || !item.limitKind || !item.packSize) {
    return NextResponse.json(ResponseBuilder.error('ADDON_PRICE_NOT_FOUND'), { status: 404 });
  }
  const current = Math.max(1, Number(item.packs) || 1);
  const kind = item.limitKind as LimitKind;

  if (packs === current) {
    const addon = item.nextPacks == null ? item : await db.merchantAddons.setNextPacks(item.id, null);
    return NextResponse.json(ResponseBuilder.success('MERCHANT_ADDON_UPDATED', { addon }));
  }

  if (packs < current) {
    // Next period: the limit drops by the item's pack size × (current − packs); refused when the usage would not fit
    const validation = await validateAddonDeletion(merchantId, addonColumnsFor(kind, item.packSize, current - packs));
    if (!validation.isValid && validation.exceededLimits) return limitExceeded(validation);
    const addon = await db.merchantAddons.setNextPacks(item.id, packs);
    return NextResponse.json(ResponseBuilder.success('MERCHANT_ADDON_UPDATED', { addon }));
  }

  if (!addonUnitsFit(item.packSize, packs)) {
    return NextResponse.json(ResponseBuilder.error('ADDON_AMOUNT_TOO_LARGE'), { status: 422 });
  }
  // More packs: same checks and quote as a purchase of the extra packs
  const extraPacks = packs - current;
  const check = await checkAddonPurchase(merchantId, item.addonPriceId, extraPacks, now);
  if (!check.ok) return check.response;
  const { addon, payment } = await db.merchantAddons.addPacks({
    itemId: item.id,
    merchantId,
    subscriptionId: check.subscription.id,
    name: check.addonPrice.name,
    packs,
    extraPacks,
    columns: addonColumnsFor(kind, item.packSize, packs),
    addonPriceId: check.addonPrice.id,
    unitPrice: check.addonPrice.monthlyPrice,
    quote: check.quote,
    method: body.method,
    transactionId: body.transactionId,
    reference: body.reference,
    createdBy,
  });
  return NextResponse.json(ResponseBuilder.success('MERCHANT_ADDON_UPDATED', { addon, payment, quote: check.quote }));
}
