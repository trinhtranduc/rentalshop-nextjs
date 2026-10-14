import { describeModuleSources, mergeModuleSources, planModuleKeys, resolveActiveModules } from '@rentalshop/constants';
import { prisma } from './client';

/**
 * #907 Feature modules per merchant (MerchantModule). The catalog and the "active" rule live in
 * @rentalshop/constants (MODULES, resolveActiveModules).
 */

export async function listMerchantModules(merchantId: number) {
  return prisma.merchantModule.findMany({
    where: { merchantId },
    select: { key: true, enabled: true, endsAt: true, updatedAt: true, updatedById: true },
  });
}

/**
 * The three module sources of a merchant: legacy #907 rows, un-ended feature add-ons (#943) and, #967, the plan's
 * `features` (subscription plan, else the legacy `merchant.Plan`, as the loyalty gate always read it).
 */
async function loadModuleSources(merchantId: number, now: Date) {
  const [rows, featureAddons, merchant] = await Promise.all([
    prisma.merchantModule.findMany({
      where: { merchantId },
      select: { key: true, enabled: true, endsAt: true },
    }),
    prisma.planLimitAddon.findMany({
      where: { merchantId, featureKey: { not: null }, isActive: true, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      select: { featureKey: true, isActive: true, endsAt: true },
    }),
    prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { subscription: { select: { plan: { select: { features: true } } } }, Plan: { select: { features: true } } },
    }),
  ]);
  const planFeatures = merchant?.subscription?.plan?.features ?? merchant?.Plan?.features ?? [];
  return { rows, featureAddons, planFeatures };
}

/**
 * Active module keys of a merchant at `now` (e.g. ['attendance', 'loyalty']). #943: a module is on through an
 * un-ended feature add-on (PlanLimitAddon with a featureKey) or, for shops switched on before #943, an active legacy
 * row. #967: or the plan includes it (loyalty). This is the one check behind `merchant.modules`, MODULE_NOT_ENABLED
 * and the loyalty gate (`@rentalshop/loyalty` merchantHasLoyaltyFeature / assertLoyaltyFeature).
 */
export async function getActiveMerchantModuleKeys(merchantId: number, now: Date = new Date()): Promise<string[]> {
  const { rows, featureAddons, planFeatures } = await loadModuleSources(merchantId, now);
  return resolveActiveModules(mergeModuleSources(rows, featureAddons, now, planModuleKeys(planFeatures)), now);
}

/** #967 per module: on or off and where from (plan / add-on / legacy row), for the admin Add-on page. */
export async function getMerchantModuleSources(merchantId: number, now: Date = new Date()) {
  const { rows, featureAddons, planFeatures } = await loadModuleSources(merchantId, now);
  return describeModuleSources({ rows, featureAddons, planFeatures, now });
}

export async function isMerchantModuleActive(merchantId: number, key: string, now: Date = new Date()): Promise<boolean> {
  const keys = await getActiveMerchantModuleKeys(merchantId, now);
  return keys.includes(key);
}

export async function upsertMerchantModule(
  merchantId: number,
  key: string,
  data: { enabled: boolean; endsAt: Date | null; updatedById?: number | null }
) {
  return prisma.merchantModule.upsert({
    where: { merchantId_key: { merchantId, key } },
    create: { merchantId, key, enabled: data.enabled, endsAt: data.endsAt, updatedById: data.updatedById ?? null },
    update: { enabled: data.enabled, endsAt: data.endsAt, updatedById: data.updatedById ?? null },
    select: { key: true, enabled: true, endsAt: true, updatedAt: true },
  });
}

export const merchantModules = {
  listForMerchant: listMerchantModules,
  getActiveKeys: getActiveMerchantModuleKeys,
  sources: getMerchantModuleSources,
  isActive: isMerchantModuleActive,
  upsert: upsertMerchantModule,
};
