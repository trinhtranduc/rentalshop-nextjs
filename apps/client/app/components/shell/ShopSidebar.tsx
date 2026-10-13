'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCommonTranslations } from '@rentalshop/hooks';
import { activeNavChild, filterNavGroups, isNavActive, navChildHref, navItemTone, type ShellNavItem } from './nav';
import { ICONS, ShellIcon } from './Icon';
import { settingsHref } from '../../settings/settings-model';
import { BRANCH_SELECTION_EVENT, readStoredBranchLabel, type BranchLabel } from '../../dashboard/branch-model';
import { useMerchantModules } from '../../attendance/useMerchantModules';

export interface ShopSidebarUser {
  firstName?: string;
  lastName?: string;
  name?: string;
  role?: string;
  merchant?: { id?: number; name?: string } | null;
  merchantId?: number | null;
  outlet?: { name?: string } | null;
}

interface ShopSidebarProps {
  user?: ShopSidebarUser | null;
  pathname: string | null;
  /** Cài đặt dialog is open (#539): the settings item shows active. */
  settingsOpen?: boolean;
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

export function ShopSidebar({ user, pathname, settingsOpen = false, onNavigate, onLogout }: ShopSidebarProps) {
  const t = useCommonTranslations();
  const router = useRouter();
  const role = user?.role;
  const modules = useMerchantModules(user);
  const groups = filterNavGroups(role, modules);
  const displayName = fullName(user);
  const shopName = user?.merchant?.name || 'AnyRent';
  // #827: label only — the branches picked on Tổng quan ("Tất cả chi nhánh (N)", one name, or "N chi nhánh")
  const merchantId = user?.merchant?.id ?? user?.merchantId ?? null;
  const [branch, setBranch] = useState<BranchLabel | null>(null);
  useEffect(() => {
    if (user?.outlet?.name || merchantId == null) return;
    const read = () => {
      let storage: Storage | null = null;
      try {
        storage = window.localStorage;
      } catch {
        storage = null;
      }
      setBranch(readStoredBranchLabel(storage, merchantId));
    };
    read();
    window.addEventListener(BRANCH_SELECTION_EVENT, read);
    window.addEventListener('storage', read);
    return () => {
      window.removeEventListener(BRANCH_SELECTION_EVENT, read);
      window.removeEventListener('storage', read);
    };
  }, [user?.outlet?.name, merchantId]);
  const branchText = !branch
    ? t('shell.allOutlets')
    : branch.kind === 'all'
      ? t('shell.allOutletsCount', { count: branch.count })
      : branch.kind === 'one'
        ? branch.name
        : t('shell.someOutlets', { count: branch.count });
  const outletName = user?.outlet?.name || branchText;

  const itemClass = (active: boolean) =>
    `flex min-h-[40px] w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[15px] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary ${navItemTone(active)}`;

  const renderItem = (item: ShellNavItem) => {
    // Cài đặt opens as a dialog over the current page (#539) instead of navigating.
    if (item.key === 'settings') {
      return (
        <button
          key={item.key}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={settingsOpen}
          onClick={() => {
            onNavigate?.();
            router.replace(settingsHref(pathname || '/dashboard', window.location.search), { scroll: false });
          }}
          className={`border-0 ${settingsOpen ? "" : "bg-transparent"} ${itemClass(settingsOpen)}`}
        >
          <ShellIcon d={item.icon} />
          <span className="flex-1">{t(`shell.nav.${item.key}`)}</span>
        </button>
      );
    }
    if (item.children?.length) {
      return (
        <NavGroup
          key={item.key}
          item={item}
          pathname={settingsOpen ? null : pathname}
          label={t(`shell.nav.${item.key}`)}
          childLabel={(key) => t(`shell.nav.${item.key}Sub.${key}`)}
          itemClass={itemClass}
          onNavigate={onNavigate}
        />
      );
    }
    const active = !settingsOpen && isNavActive(pathname, item.href);
    return (
      <Link
        key={item.key}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={itemClass(active)}
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
        {groups.map((group) => (
          <React.Fragment key={group.key ?? 'top'}>
            {group.key && (
              <span className="px-2.5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.07em] text-ar-faint">
                {t(`shell.groups.${group.key}`)}
              </span>
            )}
            {group.items.map(renderItem)}
          </React.Fragment>
        ))}
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

/**
 * A menu item with a sub-menu (#960). Opens itself while one of its pages is shown; the header toggles it.
 * Only the active sub-item is highlighted, so one row is highlighted at a time.
 */
function NavGroup({
  item,
  pathname,
  label,
  childLabel,
  itemClass,
  onNavigate,
}: {
  item: ShellNavItem;
  pathname: string | null;
  label: string;
  childLabel: (key: string) => string;
  itemClass: (active: boolean) => string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const current = activeNavChild(item, pathname);
  const inside = Boolean(current);
  const [open, setOpen] = useState(inside);
  useEffect(() => {
    if (inside) setOpen(true);
  }, [inside, pathname]);
  const listId = `nav-sub-${item.key}`;
  // A long menu scrolls; keep the open page's row in view (short screens, the mobile drawer).
  const activeRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [current?.key, open]);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className={`border-0 bg-transparent ${itemClass(false)} ${inside ? 'font-semibold text-ar-ink' : ''}`}
      >
        <ShellIcon d={item.icon} />
        <span className="flex-1">{label}</span>
        <ShellIcon d={ICONS.chevronDown} size={16} className={`text-ar-faint transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul id={listId} className="m-0 mb-1 ml-[21px] mt-0.5 flex list-none flex-col gap-0.5 border-l-2 border-ar-line p-0 pl-2">
          {item.children!.map((child) => {
            const active = current?.key === child.key;
            return (
              <li key={child.key}>
                <Link
                  ref={active ? activeRef : undefined}
                  href={child.href}
                  onClick={(e) => {
                    // Keep the picked outlet / month when moving between the screens (old tab strip did too).
                    const to = navChildHref(item, child, window.location.search);
                    if (to !== child.href && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                      e.preventDefault();
                      router.push(to);
                    }
                    onNavigate?.();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-[34px] items-center rounded-lg px-2.5 text-[14px] no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary ${navItemTone(active)}`}
                >
                  {childLabel(child.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
