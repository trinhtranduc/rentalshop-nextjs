import { NextResponse } from 'next/server';
import { MODULE_KEY, planModuleKeys } from '@rentalshop/constants';
import { db } from '@rentalshop/database';
import { addonUnitsFit, calculateAddonQuote, isBasicPlanName, isFeatureAddon, ResponseBuilder } from '@rentalshop/utils';
import type { AddonQuote } from '@rentalshop/utils';

/**
 * #850: shared checks of "buy N packs of a price-list row for a shop" (quote and purchase use the same rules).
 * - the row exists and is on sale (paused = no new sales);
 * - an outlets row is sold on any plan, same as extra users (#1187);
 * - the shop has a subscription; the charge now is prorated on its current period (Vietnam days).
 */
export interface ShopSubscription {
  id: number;
  status: string;
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  interval?: string | null;
  intervalCount?: number | null;
  plan?: { id: number; name: string; basePrice: number; limits: unknown; features?: unknown } | null;
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
  /** #943: module key of a feature row */
  featureKey?: string | null;
}
export interface ShopAddonItem {
  id: number;
  merchantId: number;
  addonPriceId: number | null;
  unitPrice: number | null;
  packs: number | null;
  /** #870: fewer packs from the next renewal */
  nextPacks?: number | null;
  limitKind?: string | null;
  packSize?: number | null;
  isActive: boolean;
  removeAtPeriodEnd: boolean;
  endsAt: Date | null;
  /** #943: module key of a feature item */
  featureKey?: string | null;
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
  | { ok: true; merchant: ShopMerchant; subscription: ShopSubscription; addonPrice: AddonPriceRowLike; quote: AddonQuote; packs: number }
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
  if (!subscription) return fail('SUBSCRIPTION_NOT_FOUND', 404);
  // #943: a feature (attendance…) is on/off: packs are always 1, and a shop holds at most one un-ended item of it
  // (a turned-off one is undone, not bought again)
  const feature = isFeatureAddon(addonPrice);
  const effectivePacks = feature ? 1 : packs;
  // #967: a feature the plan already includes (loyalty) is not sold on top of it (no double charge)
  if (feature && addonPrice.featureKey && planModuleKeys(subscription.plan?.features).includes(addonPrice.featureKey)) {
    return fail('ADDON_FEATURE_IN_PLAN', 422);
  }
  // #782 (owner): loyalty is not sold to Basic until it can be set up on the phone
  if (feature && addonPrice.featureKey === MODULE_KEY.LOYALTY && isBasicPlanName(subscription.plan?.name)) {
    return fail('ADDON_LOYALTY_NOT_FOR_BASIC', 422);
  }
  if (!feature && !addonUnitsFit(addonPrice.packSize, packs)) return fail('ADDON_AMOUNT_TOO_LARGE', 422);
  if (feature && addonPrice.featureKey && (await db.merchantAddons.findActiveFeature(merchantId, addonPrice.featureKey))) {
    return fail('ADDON_FEATURE_ALREADY_ON', 422);
  }
  const quote = calculateAddonQuote({
    monthlyPrice: addonPrice.monthlyPrice,
    packs: effectivePacks,
    periodStart: subscription.currentPeriodStart,
    periodEnd: subscription.currentPeriodEnd,
    interval: subscription.interval,
    intervalCount: subscription.intervalCount,
    status: subscription.status,
    now,
  });
  return { ok: true, merchant, subscription, addonPrice, quote, packs: effectivePacks };
}

/** Numeric id from a route segment, or null. */
export function routeId(raw: string | undefined): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
