/**
 * Admin shell navigation (#804). Same items and routes as the old packages/ui AdminSidebar; the role filter
 * (`filterAdminMenuByRole` from @rentalshop/ui) is applied by the sidebar.
 */
import type { ComponentType } from 'react';
import type { NavGroup } from './nav-groups';
import {
  Activity, Building2, Clock, CreditCard, DollarSign, FileText, FolderTree, Home, Image as ImageIcon,
  Package, RefreshCw, ScrollText, Settings, ShieldCheck, ShoppingCart, Tag, Trash2, TrendingUp, User,
  UserCircle, UserPlus, Users,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  subItems?: AdminNavItem[];
  /** Which of the six menu groups shows the item (#815); only top-level items carry it. */
  group?: NavGroup;
  /** Show the sub-items straight under the group heading instead of behind an expander (#815). */
  inline?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home, group: 'Overview' },
  { label: 'Merchants', href: '/merchants', icon: Building2, group: 'Merchants & Plans' },
  {
    label: 'Subscription', href: '/subscriptions', icon: Clock, group: 'Merchants & Plans', inline: true,
    subItems: [
      { label: 'Subscriptions', href: '/subscriptions', icon: Clock },
      { label: 'Payments', href: '/payments', icon: CreditCard },
    ],
  },
  {
    label: 'Plans', href: '/plans', icon: Package, group: 'Merchants & Plans', inline: true,
    subItems: [
      { label: 'Plans', href: '/plans', icon: Package },
      // #850: price list of the add-ons (ADMIN edits, OPS reads)
      { label: 'Add-on prices', href: '/plans/addon-prices', icon: Tag },
      { label: 'Stripe Billing', href: '/plans/billing', icon: DollarSign },
    ],
  },
  { label: 'Orders', href: '/orders', icon: ShoppingCart, group: 'Shop data' },
  { label: 'Customers', href: '/customers', icon: UserCircle, group: 'Shop data' },
  { label: 'Products', href: '/products', icon: Package, group: 'Shop data' },
  { label: 'Users', href: '/users', icon: Users, group: 'Shop data' },
  {
    label: 'Blog', href: '/posts', icon: FileText, group: 'Content',
    subItems: [
      { label: 'Posts', href: '/posts', icon: FileText },
      { label: 'Categories', href: '/posts/categories', icon: FolderTree },
      { label: 'Tags', href: '/posts/tags', icon: Tag },
      { label: 'Media', href: '/media', icon: ImageIcon },
    ],
  },
  { label: 'Referrals', href: '/referrals', icon: UserPlus, group: 'Growth' },
  { label: 'Affiliate Stats', href: '/affiliate/stats', icon: TrendingUp, group: 'Growth' },
  { label: 'AnyRent Users', href: '/system-users', icon: ShieldCheck, group: 'System' },
  {
    label: 'Settings', href: '/settings', icon: Settings, group: 'System',
    subItems: [
      { label: 'Admin Info', href: '/settings/admin', icon: User },
      { label: 'Audit Logs', href: '/system/audit-logs', icon: ScrollText },
      { label: 'Request Logs', href: '/request-logs', icon: Activity },
      { label: 'Deleted Records', href: '/system/deleted-records', icon: Trash2 },
    ],
  },
  { label: 'Data Sync', href: '/sync', icon: RefreshCw, group: 'System' },
];

/** `/merchants/2` keeps Merchants active; `/ordersx` does not. */
export function isNavActive(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Item active when it or one of its sub-items matches; a sub-item beats a parent that is only its prefix. */
export function isSubActive(pathname: string | null | undefined, item: AdminNavItem, sub: AdminNavItem): boolean {
  if (!isNavActive(pathname, sub.href)) return false;
  // `/plans` must not light up on `/plans/billing`: the longest matching sibling wins.
  const longest = (item.subItems || []).filter((s) => isNavActive(pathname, s.href)).sort((a, b) => b.href.length - a.href.length)[0];
  return longest?.href === sub.href;
}

/** Where the "create" button goes, and its label, for the section the admin is in. */
export function createActionFor(pathname: string | null | undefined): { href: string; label: string } {
  const p = pathname || '';
  if (p.startsWith('/posts')) return { href: '/posts/create', label: 'New post' };
  return { href: '/subscriptions/create', label: 'New subscription' };
}

/** Lists that read `?q=`; search from anywhere else lands on Merchants. */
const SEARCH_SECTIONS = ['/merchants', '/subscriptions', '/payments', '/products', '/customers', '/orders', '/users', '/plans'];
export function searchTargetFor(pathname: string | null | undefined, query: string): string {
  const section = SEARCH_SECTIONS.find((s) => isNavActive(pathname, s)) || '/merchants';
  const q = query.trim();
  return q ? `${section}?q=${encodeURIComponent(q)}` : section;
}
