/**
 * Shop shell navigation model (#509; groups and sub-menus #960). Plain data so the role filter is unit-tested.
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
  | 'attendance'
  | 'outlets'
  | 'categories'
  | 'loyalty'
  | 'settings';

/** A sub-menu entry (#960). Shown only when its parent is; label `shell.nav.<parent>Sub.<key>`. */
export interface ShellNavChild {
  key: string;
  href: string;
  /** Active only on `href` itself (the group's index page), not on its children. */
  exact?: boolean;
  /** Other pages that belong to this entry without a menu row of their own (e.g. a detail reached from it). */
  also?: string[];
}

export interface ShellNavItem {
  key: ShellNavKey;
  href: string;
  icon: string;
  /** Roles allowed to see the item; undefined = every shop role. */
  roles?: string[];
  /** Roles that never see the item. */
  hiddenFor?: string[];
  /** Only shown when the merchant has this module on (`merchant.modules`, #908). */
  module?: string;
  /** Sub-menu (#960): the item becomes a collapsible group of these links. */
  children?: ShellNavChild[];
  /** Query keys a sub-item link carries over from the current URL (e.g. the picked outlet and month). */
  keepQuery?: string[];
}

const NAV: Record<ShellNavKey, ShellNavItem> = {
  overview: { key: 'overview', href: '/dashboard', icon: 'M5 20V11M12 20V5M19 20v-6' },
  orders: { key: 'orders', href: '/orders', icon: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6' },
  calendar: { key: 'calendar', href: '/calendar', icon: 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4' },
  availability: { key: 'availability', href: '/availability', icon: 'M5 4h14v16H5zM9 12l2 2 4-4' },
  products: { key: 'products', href: '/products', icon: 'M8 3l4 3 4-3 4 4-3 3v11H7V10L4 7z' },
  categories: { key: 'categories', href: '/categories', icon: 'M3 12l9-9h7a2 2 0 0 1 2 2v7l-9 9zM16 8h.01' },
  customers: { key: 'customers', href: '/customers', icon: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 5.1a3 3 0 0 1 0 5.8' },
  loyalty: { key: 'loyalty', href: '/loyalty', icon: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H8a2.5 2.5 0 0 1 0-5c3 0 4 5 4 5zM12 7h4a2.5 2.5 0 0 0 0-5c-3 0-4 5-4 5z', roles: ['MERCHANT'] },
  staff: { key: 'staff', href: '/users', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', hiddenFor: ['OUTLET_STAFF', 'OUTLET_INVENTORY'] },
  attendance: {
    key: 'attendance',
    href: '/attendance',
    icon: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2.5M10 2h4',
    roles: ['MERCHANT', 'OUTLET_ADMIN'],
    module: 'attendance',
    keepQuery: ['outletId', 'month'],
    children: [
      // Chi tiết theo người is opened from Bảng công (a name or a cell), not from the menu.
      { key: 'timesheet', href: '/attendance', exact: true, also: ['/attendance/person'] },
      { key: 'shifts', href: '/attendance/shifts' },
      { key: 'templates', href: '/attendance/templates' },
      { key: 'locations', href: '/attendance/locations' },
    ],
  },
  outlets: { key: 'outlets', href: '/outlets', icon: 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6', hiddenFor: ['OUTLET_ADMIN', 'OUTLET_STAFF', 'OUTLET_INVENTORY'] },
  settings: { key: 'settings', href: '/settings', icon: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4v4M10 10v4M18 16v4' },
};

/** Header label `shell.groups.<key>`; `null` = no header (Tổng quan on top). */
export type ShellNavGroupKey = 'sales' | 'goods' | 'customers' | 'people' | 'shop';

export interface ShellNavGroup {
  key: ShellNavGroupKey | null;
  items: ShellNavItem[];
}

/** Menu grouped by daily work (#960, owner option A). */
export const SHELL_NAV_GROUPS: ShellNavGroup[] = [
  { key: null, items: [NAV.overview] },
  { key: 'sales', items: [NAV.orders, NAV.calendar, NAV.availability] },
  { key: 'goods', items: [NAV.products, NAV.categories] },
  { key: 'customers', items: [NAV.customers, NAV.loyalty] },
  { key: 'people', items: [NAV.staff, NAV.attendance] },
  { key: 'shop', items: [NAV.outlets, NAV.settings] },
];

/** Every menu item in menu order. */
export const SHELL_NAV_ITEMS: ShellNavItem[] = SHELL_NAV_GROUPS.flatMap((g) => g.items);

/** Same visibility rules as the previous ClientSidebar; module items need the merchant's module (#908). */
export function filterNavForRole(items: ShellNavItem[], role?: string | null, modules: string[] = []): ShellNavItem[] {
  const withModule = items.filter((item) => !item.module || modules.includes(item.module));
  if (!role) return withModule.filter((item) => !item.roles);
  const r = role.trim().toUpperCase();
  return withModule.filter((item) => {
    if (item.roles && !item.roles.includes(r)) return false;
    return !(item.hiddenFor || []).includes(r);
  });
}

/** Groups with the items this role sees; a group with nothing left has no header either. */
export function filterNavGroups(role?: string | null, modules: string[] = []): ShellNavGroup[] {
  return SHELL_NAV_GROUPS.map((g) => ({ key: g.key, items: filterNavForRole(g.items, role, modules) })).filter(
    (g) => g.items.length > 0,
  );
}

/** Menu row tone. Hover must not look like the active row (#960: two rows looked selected). */
export function navItemTone(active: boolean): string {
  return active
    ? 'bg-ar-primary-soft font-semibold text-ar-primary-ink'
    : 'font-medium text-ar-ink-2 hover:bg-ar-surface-muted hover:text-ar-ink';
}

/** `/orders/123` keeps Đơn hàng active; `/ordersx` does not. */
export function isNavActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** `exact` children (Bảng công on `/attendance`) match only themselves; the rest match their children too. */
export function isNavChildActive(pathname: string | null | undefined, child: ShellNavChild): boolean {
  if (!pathname) return false;
  if ((child.also || []).some((href) => isNavActive(pathname, href))) return true;
  return child.exact ? pathname === child.href : isNavActive(pathname, child.href);
}

/** The sub-item to highlight; the most specific match wins. */
export function activeNavChild(item: ShellNavItem, pathname: string | null | undefined): ShellNavChild | undefined {
  return (item.children || [])
    .filter((child) => isNavChildActive(pathname, child))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** Sub-item link that keeps the parent's `keepQuery` keys from `search` (e.g. `?outletId=3&month=2026-10`). */
export function navChildHref(item: ShellNavItem, child: ShellNavChild, search: string): string {
  const from = new URLSearchParams(search);
  const keep = new URLSearchParams();
  for (const key of item.keepQuery || []) {
    const value = from.get(key);
    if (value) keep.set(key, value);
  }
  const q = keep.toString();
  return q ? `${child.href}?${q}` : child.href;
}
