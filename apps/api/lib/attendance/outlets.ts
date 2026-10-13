/**
 * #949 The outlets a user may clock in at. One place for the rule so a person of several outlets can be added later.
 * MERCHANT (owner): every outlet of the shop. OUTLET_ADMIN / OUTLET_STAFF / OUTLET_INVENTORY: their own outlet.
 */
import { db } from '@rentalshop/database';
import type { AttendanceUser } from './context';

export interface OutletRef {
  id: number;
  name: string;
}

export async function allowedOutletsOf(user: Pick<AttendanceUser, 'role' | 'merchantId' | 'outletId'>): Promise<OutletRef[]> {
  const owner = user.role === 'MERCHANT';
  if (!owner && !user.outletId) return [];
  const outlets = await db.attendance.listOutlets(user.merchantId, owner ? null : user.outletId);
  return outlets.map((o: OutletRef) => ({ id: o.id, name: o.name }));
}
