import { mergeModuleSources, resolveActiveModules } from '@rentalshop/constants';
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
 * Active module keys of a merchant at `now` (e.g. ['attendance']). #943: a module is on through an un-ended feature
 * add-on (PlanLimitAddon with a featureKey) or, for shops switched on before #943, an active legacy row.
 */
export async function getActiveMerchantModuleKeys(merchantId: number, now: Date = new Date()): Promise<string[]> {
  const [rows, featureAddons] = await Promise.all([
    prisma.merchantModule.findMany({
      where: { merchantId },
      select: { key: true, enabled: true, endsAt: true },
    }),
    prisma.planLimitAddon.findMany({
      where: { merchantId, featureKey: { not: null }, isActive: true, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      select: { featureKey: true, isActive: true, endsAt: true },
    }),
  ]);
  return resolveActiveModules(mergeModuleSources(rows, featureAddons, now), now);
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
  isActive: isMerchantModuleActive,
  upsert: upsertMerchantModule,
};
