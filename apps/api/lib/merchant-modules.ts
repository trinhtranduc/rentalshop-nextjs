/** #907 Merchant module rows → API shape (admin routes) and the login / profile `merchant.modules` list. */
import { MODULES, resolveActiveModules } from '@rentalshop/constants';
import { db } from '@rentalshop/database';
import { formatDateKeyInTimeZone } from '../../../packages/utils/src/core/date-range';

const VN = 'Asia/Ho_Chi_Minh';

/**
 * #907 / #1187: modules the admin switch may turn on (`PUT /api/merchants/[id]/modules/[key]`). Loyalty can also come
 * from the plan or a paid feature add-on (#967); the switch is for shops whose plan does not include it.
 */
export const LEGACY_SWITCH_MODULE_KEYS: string[] = ['attendance', 'loyalty'];

export function moduleCatalogView(rows: Array<{ key: string; enabled: boolean; endsAt: Date | string | null }>, now = new Date()) {
  const active = new Set(resolveActiveModules(rows, now));
  return MODULES.filter((m) => LEGACY_SWITCH_MODULE_KEYS.includes(m.key)).map((m) => {
    const row = rows.find((r) => r.key === m.key);
    return {
      key: m.key,
      enabled: !!row?.enabled,
      endDate: row?.endsAt ? formatDateKeyInTimeZone(new Date(row.endsAt), VN) : null,
      active: active.has(m.key),
    };
  });
}

/** Active module keys for login / profile. Fail-safe: any error (e.g. table not migrated yet) → []. */
export async function activeModuleKeysSafe(merchantId: number | null | undefined): Promise<string[]> {
  if (!merchantId) return [];
  try {
    const keys = await db.merchantModules.getActiveKeys(merchantId);
    return Array.isArray(keys) ? keys : [];
  } catch (error) {
    console.error('⚠️ merchant.modules lookup failed, sending []:', error);
    return [];
  }
}
