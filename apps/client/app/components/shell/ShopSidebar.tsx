'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCommonTranslations } from '@rentalshop/hooks';
import { SHELL_MAIN_NAV, SHELL_MANAGE_NAV, filterNavForRole, isNavActive, type ShellNavItem } from './nav';
import { ICONS, ShellIcon } from './Icon';

export interface ShopSidebarUser {
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  merchant?: { name?: string } | null;
  outlet?: { name?: string } | null;
}

interface ShopSidebarProps {
  user?: ShopSidebarUser | null;
  pathname: string | null;
  onNavigate?: () => void;
  onLogout: () => void;
}

/** Vietnamese order, family name first: "Nguyễn Hoa Mai". */
function fullName(user?: ShopSidebarUser | null): string {
  return [user?.lastName, user?.firstName].filter(Boolean).join(' ').trim() || user?.name || '';
}

/** Initials from the given name: "Nguyễn Hoa Mai" → "HM". */
function initials(user?: ShopSidebarUser | null): string {
  const words = fullName(user).split(/\s+/).filter(Boolean);
  if (words.length === 0) return '·';
  const first = words.length > 1 ? words[words.length - 2] : words[0];
  const last = words[words.length - 1];
  return (words.length > 1 ? first[0] + last[0] : last.slice(0, 2)).toUpperCase();
}

export function ShopSidebar({ user, pathname, onNavigate, onLogout }: ShopSidebarProps) {
  const t = useCommonTranslations();
  const role = user?.role;
  const main = filterNavForRole(SHELL_MAIN_NAV, role);
  const manage = filterNavForRole(SHELL_MANAGE_NAV, role);
  const displayName = fullName(user);
  const shopName = user?.merchant?.name || 'AnyRent';
  const outletName = user?.outlet?.name || t('shell.allOutlets');

  const renderItem = (item: ShellNavItem) => {
    const active = isNavActive(pathname, item.href);
    return (
      <Link
        key={item.key}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={`flex min-h-[40px] items-center gap-2.5 rounded-[10px] px-2.5 text-[15px] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary ${
          active ? 'bg-ar-primary-soft font-semibold text-ar-primary-ink' : 'font-medium text-ar-ink-2 hover:bg-ar-subtle'
        }`}
      >
        <ShellIcon d={item.icon} />
        <span className="flex-1">{t(`shell.nav.${item.key}`)}</span>
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-[248px] flex-col gap-3.5 border-r border-ar-line bg-ar-surface px-3 py-4">
      <div className="flex items-center gap-2.5 px-2 py-1">
        <Image src="/anyrent-brandmark-ribbon.png" alt="" width={32} height={32} className="rounded-lg object-contain" />
        <span className="text-lg font-bold tracking-[-0.01em] text-ar-ink">AnyRent</span>
      </div>

      <div className="flex min-h-[52px] flex-col justify-center rounded-xl border border-ar-line px-2.5 py-1.5">
        <span className="truncate text-[15px] font-semibold text-ar-ink">{shopName}</span>
        <span className="truncate text-xs text-ar-muted">{outletName}</span>
      </div>

      <Link
        href="/orders/create"
        onClick={onNavigate}
        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-ar-primary text-[15px] font-semibold text-ar-on-primary no-underline hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ar-primary"
      >
        <ShellIcon d={ICONS.plus} size={18} />
        {t('shell.createOrder')}
      </Link>

      <nav aria-label={t('shell.mainMenu')} className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {main.map(renderItem)}
        {manage.length > 0 && (
          <>
            <span className="px-2.5 pb-1.5 pt-3.5 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">
              {t('shell.manage')}
            </span>
            {manage.map(renderItem)}
          </>
        )}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-ar-subtle px-2 pt-2.5">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ar-reserved-bg text-sm font-bold text-ar-reserved"
        >
          {initials(user)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-ar-ink">{displayName}</span>
          {role && <span className="truncate text-xs text-ar-muted">{t(`roles.${role}`)}</span>}
        </span>
        <button
          type="button"
          onClick={onLogout}
          aria-label={t('shell.logout')}
          title={t('shell.logout')}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ar-muted hover:bg-ar-subtle hover:text-ar-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary"
        >
          <ShellIcon d={ICONS.logout} size={18} />
        </button>
      </div>
    </aside>
  );
}
