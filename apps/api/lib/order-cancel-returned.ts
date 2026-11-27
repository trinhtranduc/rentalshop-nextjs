/**
 * #1688 a rental that was already returned (RETURNED) can be cancelled, but not by staff: OUTLET_STAFF and OUTLET_INVENTORY keep the
 * limits they have on money. MERCHANT, OUTLET_ADMIN (own outlet, checked by the route) and platform roles may. Every other change of
 * a RETURNED order stays refused by `canChangeOrderStatus`. Installed apps never offer "Huỷ" on a returned rental, so they never send this.
 */
import { isStaffLikeRole } from '@rentalshop/constants';

export function staffCannotCancelReturned(role: string | undefined | null, orderType: string, from: string, to: string): boolean {
  return orderType === 'RENT' && from === 'RETURNED' && to === 'CANCELLED' && isStaffLikeRole(role);
}
