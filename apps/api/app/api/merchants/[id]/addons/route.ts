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
import { checkAddonPurchase, findShop, routeId } from '../../../../../lib/merchant-addons';
import { moduleCatalogView } from '../../../../../lib/merchant-modules';
import type { AddonPriceRowLike, ShopAddonItem } from '../../../../../lib/merchant-addons';

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
      const merchant = await findShop(merchantId);
      if (!merchant) return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: 404 });

      const now = new Date();
      const subscription = merchant.subscription || null;
      const items = (await db.merchantAddons.listForMerchant(merchantId, now)) as ShopAddonItem[];
      const priceIds = Array.from(new Set(items.map((i) => i.addonPriceId).filter((v): v is number => v != null)));
      const rows = (priceIds.length ? await db.addonPrices.findManyByIds(priceIds) : []) as AddonPriceRowLike[];
      const catalog = new Map<number, AddonPriceRowLike>(rows.map((r) => [r.id, r] as [number, AddonPriceRowLike]));
      const { lines, monthlyTotal: renewalAddonMonthly, paidMonthlyTotal } = addonRenewalLines(items, catalog, now);
      const lineById = new Map(lines.map((l) => [l.id, l]));
      const legacyModules = await legacyModuleSwitches(merchantId, now);
      const featureSources = await moduleSources(merchantId, now);

      const addons = items.map((item) => {
        const line = lineById.get(item.id);
        return {
          ...item,
          legacy: item.addonPriceId == null,
          monthlyAmount: (item.unitPrice || 0) * (item.packs || 1),
          renews: !!line?.renew,
          renewUnitPrice: line?.renew ? line.unitPrice : null,
          renewMonthlyAmount: line?.monthlyAmount ?? 0,
          // #870: packs and pack size of the next period (pending reduction, current catalog pack size)
          renewPacks: line?.renew ? line.packs : null,
          renewPackSize: line?.renew ? line.packSize : null,
        };
      });

      let limits = null;
      if (subscription) {
        try {
          const info = await getPlanLimitsInfo(merchantId);
          limits = { plan: info.basePlanLimits, addons: info.addonLimits, total: info.planLimits, usage: info.currentCounts };
        } catch {
          limits = null;
        }
      }

      const planPrice = subscription?.plan?.basePrice ?? 0;
      const renewal = subscription
        ? {
            addonMonthlyTotal: renewalAddonMonthly,
            // #870: what the current period's renewed add-ons were bought at (change-plan credit preview)
            addonPaidMonthlyTotal: paidMonthlyTotal,
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
          monthlyTotal: addons.reduce((sum, a) => sum + a.monthlyAmount, 0),
          limits,
          renewal,
          legacyModules,
          featureSources,
        })
      );
    } catch (error) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * #943: modules switched on the old way (#907) until the admin moves the shop to the feature add-on. Informational:
 * any error (e.g. table not migrated) → [] so the add-on page still loads.
 */
async function legacyModuleSwitches(merchantId: number, now: Date) {
  try {
    const rows = await db.merchantModules.listForMerchant(merchantId);
    return moduleCatalogView(rows, now).filter((m) => m.enabled);
  } catch {
    return [];
  }
}

/**
 * #967: per module, on or off and where from (plan / feature add-on / legacy switch), so admin can show "theo gói" or
 * "theo add-on". Informational: any error → [] so the add-on page still loads.
 */
async function moduleSources(merchantId: number, now: Date) {
  try {
    const list = await db.merchantModules.sources(merchantId, now);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * POST /api/merchants/[id]/addons — buy `packs` packs of a price-list row for the shop (#850). ADMIN only.
 * #943: a feature row (attendance) is bought once (packs 1); a second un-ended one → 422 ADDON_FEATURE_ALREADY_ON.
 * The price comes from the list (never from the body) and is captured on the item. The limit rises at once.
 * A payment is written when something is charged now.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);
  return withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user }: { user?: { id?: number; email?: string | null } }) => {
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
        packs: check.packs,
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
