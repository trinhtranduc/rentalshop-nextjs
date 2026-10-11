import { NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { calculateAddonQuote, isMultiBranchPlan, ResponseBuilder } from '@rentalshop/utils';
import type { AddonQuote } from '@rentalshop/utils';

/**
 * #850: shared checks of "buy N packs of a price-list row for a shop" (quote and purchase use the same rules).
 * - the row exists and is on sale (paused = no new sales);
 * - an outlets row needs a multi-branch plan (#826);
 * - the shop has a subscription; the charge now is prorated on its current period (Vietnam days).
 */
export interface ShopSubscription {
  id: number;
  status: string;
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  interval?: string | null;
  intervalCount?: number | null;
  plan?: { id: number; name: string; basePrice: number; limits: unknown } | null;
}
export interface ShopMerchant {
  id: number;
  name: string;
  subscription?: ShopSubscription | null;
}
export interface AddonPriceRowLike {
  id: number;
  name: string;
  limitKind: string;
  packSize: number;
  monthlyPrice: number;
  isActive: boolean;
}
export interface ShopAddonItem {
  id: number;
  merchantId: number;
  addonPriceId: number | null;
  unitPrice: number | null;
  packs: number | null;
  isActive: boolean;
  removeAtPeriodEnd: boolean;
  endsAt: Date | null;
  outlets: number;
  users: number;
  products: number;
  customers: number;
  orders: number;
}

/** The merchant with its subscription and plan (`db.merchants.findById` includes both). */
export async function findShop(merchantId: number): Promise<ShopMerchant | null> {
  return (await db.merchants.findById(merchantId)) as unknown as ShopMerchant | null;
}

export type AddonPurchaseCheck =
  | { ok: true; merchant: ShopMerchant; subscription: ShopSubscription; addonPrice: AddonPriceRowLike; quote: AddonQuote }
  | { ok: false; response: NextResponse };

const fail = (code: string, status: number): AddonPurchaseCheck => ({
  ok: false,
  response: NextResponse.json(ResponseBuilder.error(code), { status }),
});

export async function checkAddonPurchase(merchantId: number, addonPriceId: number, packs: number, now = new Date()): Promise<AddonPurchaseCheck> {
  const merchant = await findShop(merchantId);
  if (!merchant) return fail('MERCHANT_NOT_FOUND', 404);
  const addonPrice = (await db.addonPrices.findById(addonPriceId)) as AddonPriceRowLike | null;
  if (!addonPrice) return fail('ADDON_PRICE_NOT_FOUND', 404);
  if (!addonPrice.isActive) return fail('ADDON_PRICE_NOT_ON_SALE', 422);
  const subscription = merchant.subscription;
  if (addonPrice.limitKind === 'outlets' && !isMultiBranchPlan(subscription?.plan?.limits)) {
    return fail('ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN', 422);
  }
  if (!subscription) return fail('SUBSCRIPTION_NOT_FOUND', 404);
  const quote = calculateAddonQuote({
    monthlyPrice: addonPrice.monthlyPrice,
    packs,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
    interval: subscription.interval,
    intervalCount: subscription.intervalCount,
    status: subscription.status,
    now,
  });
  return { ok: true, merchant, subscription, addonPrice, quote };
}

/** Numeric id from a route segment, or null. */
export function routeId(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
