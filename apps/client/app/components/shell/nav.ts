/**
 * Shop shell navigation model (#509). Plain data so the role filter is unit-tested.
 * Icon `d` values are 24x24 stroke paths matching the approved web boards.
 */

export type ShellNavKey =
  | 'overview'
  | 'orders'
  | 'calendar'
  | 'availability'
  | 'products'
  | 'customers'
  | 'staff'
  | 'outlets'
  | 'categories'
  | 'loyalty'
  | 'settings';

export interface ShellNavItem {
  key: ShellNavKey;
  href: string;
  icon: string;
  /** Roles allowed to see the item; undefined = every shop role. */
  roles?: string[];
  /** Roles that never see the item. */
  hiddenFor?: string[];
}

export const SHELL_MAIN_NAV: ShellNavItem[] = [
  { key: 'overview', href: '/dashboard', icon: 'M5 20V11M12 20V5M19 20v-6' },
  { key: 'orders', href: '/orders', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
  { key: 'calendar', href: '/calendar', icon: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4' },
  { key: 'availability', href: '/availability', icon: 'M5 4h14v16H5zM9 12l2 2 4-4' },
  { key: 'products', href: '/products', icon: 'M8 3l4 3 4-3 4 4-3 3v11H7V10L4 7z' },
  { key: 'customers', href: '/customers', icon: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 5.1a3 3 0 0 1 0 5.8' },
];

export const SHELL_MANAGE_NAV: ShellNavItem[] = [
  { key: 'staff', href: '/users', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', hiddenFor: ['OUTLET_STAFF', 'OUTLET_INVENTORY'] },
  { key: 'outlets', href: '/outlets', icon: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6', hiddenFor: ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'] },
  { key: 'categories', href: '/categories', icon: 'M3 12l9-9h7a2 2 0 0 1 2 2v7l-9 9zM16 8h.01' },
  { key: 'loyalty', href: '/loyalty', icon: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H8a2.5 2.5 0 0 1 0-5c3 0 4 5 4 5zM12 7h4a2.5 2.5 0 0 0 0-5c-3 0-4 5-4 5z', roles: ['MERCHANT'] },
  { key: 'settings', href: '/settings', icon: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4' },
];

/** Same visibility rules as the previous ClientSidebar. */
export function filterNavForRole(items: ShellNavItem[], role?: string | null): ShellNavItem[] {
  if (!role) return items.filter((item) => !item.roles);
  const r = role.trim().toUpperCase();
  return items.filter(
    (item) => (!item.roles || item.roles.includes(r)) && !(item.hiddenFor || []).includes(r)
  );
}

/** `/orders/123` keeps Đơn hàng active; `/ordersx` does not. */
export function isNavActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
