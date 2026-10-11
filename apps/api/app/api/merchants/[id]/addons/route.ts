import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { getPlanLimitsInfo } from '@rentalshop/utils/server';
import {
  addonRenewalLines,
  calculateRenewalTotal,
  handleApiError,
  isMultiBranchPlan,
  merchantAddonCreateSchema,
  ResponseBuilder,
} from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import { checkAddonPurchase, routeId } from '../../../../../lib/merchant-addons';

/**
 * GET /api/merchants/[id]/addons — the shop's add-ons that still count, its limits (plan + add-ons = total, usage),
 * and what a 1-month renewal would charge (plan + add-ons renewed at today's list price) (#850). ADMIN and OPS.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);
  return withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.OPS])(async () => {
    try {
      const merchantId = routeId(id);
      if (!merchantId) return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      const merchant: any = await db.merchants.findById(merchantId);
      if (!merchant) return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: 404 });

      const now = new Date();
      const subscription = merchant.subscription || null;
      const items = await db.merchantAddons.listForMerchant(merchantId, now);
      const priceIds = Array.from(new Set(items.map((i: any) => i.addonPriceId).filter((v: any) => v != null)));
      const rows = priceIds.length ? await db.addonPrices.findManyByIds(priceIds as number[]) : [];
      const catalog = new Map(rows.map((r: any) => [r.id, r]));
      const { lines, monthlyTotal: renewalAddonMonthly } = addonRenewalLines(items, catalog, now);
      const lineById = new Map(lines.map((l) => [l.id, l]));

      const addons = items.map((item: any) => {
        const line = lineById.get(item.id);
        return {
          ...item,
          legacy: item.addonPriceId == null,
          monthlyAmount: (item.unitPrice || 0) * (item.packs || 1),
          renews: !!line?.renew,
          renewUnitPrice: line?.renew ? line.unitPrice : null,
          renewMonthlyAmount: line?.monthlyAmount ?? 0,
        };
      });

      let limits = null;
      if (subscription) {
        try {
          const info: any = await getPlanLimitsInfo(merchantId);
          limits = { plan: info.basePlanLimits, addons: info.addonLimits, total: info.planLimits, usage: info.currentCounts };
        } catch {
          limits = null;
        }
      }

      const planPrice = subscription?.plan?.basePrice ?? 0;
      const renewal = subscription
        ? {
            addonMonthlyTotal: renewalAddonMonthly,
            monthly: calculateRenewalTotal({
              basePrice: planPrice,
              addonMonthlyTotal: renewalAddonMonthly,
              interval: 'monthly',
              currentPeriodEnd: subscription.currentPeriodEnd,
              now,
            }),
          }
        : null;

      return NextResponse.json(
        ResponseBuilder.success('MERCHANT_ADDONS_FOUND', {
          merchant: { id: merchant.id, name: merchant.name },
          subscription: subscription
            ? {
                id: subscription.id,
                status: subscription.status,
                currentPeriodStart: subscription.currentPeriodStart,
                currentPeriodEnd: subscription.currentPeriodEnd,
                interval: subscription.interval,
                intervalCount: subscription.intervalCount,
                plan: subscription.plan ? { id: subscription.plan.id, name: subscription.plan.name, basePrice: planPrice } : null,
              }
            : null,
          multiBranchPlan: isMultiBranchPlan(subscription?.plan?.limits),
          addons,
          monthlyTotal: addons.reduce((sum: number, a: any) => sum + a.monthlyAmount, 0),
          limits,
          renewal,
        })
      );
    } catch (error) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * POST /api/merchants/[id]/addons — buy `packs` packs of a price-list row for the shop (#850). ADMIN only.
 * The price comes from the list (never from the body) and is captured on the item. The limit rises at once.
 * A payment is written when something is charged now.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);
  return withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user }: any) => {
    try {
      const merchantId = routeId(id);
      if (!merchantId) return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      const parsed = merchantAddonCreateSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const check = await checkAddonPurchase(merchantId, parsed.data.addonPriceId, parsed.data.packs);
      if (!check.ok) return check.response;

      const result = await db.merchantAddons.add({
        merchantId,
        subscriptionId: check.subscription?.id ?? null,
        addonPrice: check.addonPrice,
        packs: parsed.data.packs,
        quote: check.quote,
        method: parsed.data.method,
        transactionId: parsed.data.transactionId,
        reference: parsed.data.reference,
        createdBy: user?.email || (user?.id ? String(user.id) : undefined),
      });
      return NextResponse.json(
        ResponseBuilder.success('MERCHANT_ADDON_ADDED', { addon: result.addon, payment: result.payment, quote: check.quote }),
        { status: 201 }
      );
    } catch (error) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
