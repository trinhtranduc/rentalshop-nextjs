'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { filterAdminMenuByRole } from '@rentalshop/ui';
import { groupNavItems } from './nav-groups';
import { ADMIN_NAV, createActionFor, isNavActive, isSubActive, type AdminNavItem } from './nav';
import { ICONS, ShellIcon } from './Icon';

export interface AdminSideNavUser {
  name?: string;
  email?: string;
  role?: string;
}

interface AdminSideNavProps {
  user?: AdminSideNavUser | null;
  pathname: string | null;
  onNavigate?: () => void;
  onLogout: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin', OPS: 'Operations', ARTICLE: 'Content', MERCHANT: 'Merchant',
  OUTLET_ADMIN: 'Outlet admin', OUTLET_STAFF: 'Outlet staff', OUTLET_INVENTORY: 'Inventory',
};

function initials(user?: AdminSideNavUser | null): string {
  const words = (user?.name || user?.email || '').split(/[\s@]+/).filter(Boolean);
  if (words.length === 0) return '·';
  return (words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0].slice(0, 2)).toUpperCase();
}

const rowClass = (active: boolean) =>
  `flex min-h-[44px] w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[15px] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary lg:min-h-[40px] ${
    active ? 'bg-ar-primary-soft font-semibold text-ar-primary-ink' : 'font-medium text-ar-ink-2 hover:bg-ar-subtle'
  }`;

export function AdminSideNav({ user, pathname, onNavigate, onLogout }: AdminSideNavProps) {
  const items = filterAdminMenuByRole(ADMIN_NAV, user?.role);
  const [open, setOpen] = useState<string[]>([]);
  const create = createActionFor(pathname);

  // The group that owns the current page opens by itself.
  useEffect(() => {
    const owner = items.find((i) => !i.inline && i.subItems?.some((s) => isNavActive(pathname, s.href)));
    if (owner) setOpen((prev) => (prev.includes(owner.href) ? prev : [...prev, owner.href]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const renderItem = (item: AdminNavItem) => {
    const Icon = item.icon;
    if (item.subItems?.length && item.inline) {
      // Sub-pages straight under the group heading (#815)
      return (
        <div key={item.href} className="flex flex-col gap-0.5">
          {item.subItems.map((sub) => {
            const SubIcon = sub.icon;
            const active = isSubActive(pathname, item, sub);
            return (
              <Link key={sub.href} href={sub.href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={rowClass(active)}>
                <SubIcon className="h-5 w-5 flex-none" />
                <span className="flex-1">{sub.label}</span>
              </Link>
            );
          })}
        </div>
      );
    }
    if (item.subItems?.length) {
      const expanded = open.includes(item.href);
      const groupActive = item.subItems.some((s) => isNavActive(pathname, s.href));
      return (
        <div key={item.href}>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setOpen((p) => (p.includes(item.href) ? p.filter((h) => h !== item.href) : [...p, item.href]))}
            className={`border-0 ${groupActive && !expanded ? '' : 'bg-transparent'} ${rowClass(groupActive && !expanded)}`}
          >
            <Icon className="h-5 w-5 flex-none" />
            <span className="flex-1">{item.label}</span>
            <ShellIcon d={ICONS.chevronRight} size={16} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
          {expanded && (
            <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-ar-line pl-2">
              {item.subItems.map((sub) => {
                const SubIcon = sub.icon;
                const active = isSubActive(pathname, item, sub);
                return (
                  <Link key={sub.href} href={sub.href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={rowClass(active)}>
                    <SubIcon className="h-4 w-4 flex-none" />
                    <span className="flex-1">{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }
    const active = isNavActive(pathname, item.href);
    return (
      <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className={rowClass(active)}>
        <Icon className="h-5 w-5 flex-none" />
        <span className="flex-1">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-[248px] flex-col gap-3.5 border-r border-ar-line bg-ar-surface px-3 py-4">
      <div className="flex items-center gap-2.5 px-2 py-1">
        <Image src="/anyrent-brandmark-ribbon.png" alt="" width={32} height={32} className="rounded-lg object-contain" />
        <span className="flex flex-col leading-tight">
          <span className="text-lg font-bold tracking-[-0.01em] text-ar-ink">AnyRent</span>
          <span className="text-xs text-ar-muted">Admin</span>
        </span>
      </div>

      <Link
        href={create.href}
        onClick={onNavigate}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ar-primary text-[15px] font-semibold text-ar-on-primary no-underline hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ar-primary lg:hidden"
      >
        <ShellIcon d={ICONS.plus} size={18} />
        {create.label}
      </Link>

      <nav aria-label="Main menu" className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {groupNavItems(items).map((group) => (
          <div key={group.label} role="group" aria-label={group.label} className="flex flex-col gap-0.5">
            <p className="m-0 px-2.5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.06em] text-ar-faint">{group.label}</p>
            {group.items.map(renderItem)}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-ar-subtle px-2 pt-2.5">
        <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ar-reserved-bg text-sm font-bold text-ar-reserved">
          {initials(user)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-ar-ink">{user?.name || user?.email}</span>
          {user?.role && <span className="truncate text-xs text-ar-muted">{ROLE_LABEL[user.role] || user.role}</span>}
        </span>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Logout"
          title="Logout"
          className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] text-ar-muted hover:bg-ar-subtle hover:text-ar-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary lg:h-9 lg:w-9"
        >
          <ShellIcon d={ICONS.logout} size={18} />
        </button>
      </div>
    </aside>
  );
}
