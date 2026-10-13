'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCommonTranslations } from '@rentalshop/hooks';
import { ThemeSwitch } from './ThemeSwitch';
import { NotificationBell } from './NotificationBell';
import { ICONS, ShellIcon } from './Icon';
import { buildBreadcrumb, isSearchShortcut } from './breadcrumb';

/** Where am I (#960): menu item › sub-item › page; every crumb but the last is a link. */
function Breadcrumb() {
  const t = useCommonTranslations();
  const crumbs = buildBreadcrumb(usePathname());
  if (crumbs.length === 0) return <span className="flex-1" />;
  const last = crumbs.length - 1;
  return (
    <nav aria-label={t('shell.breadcrumb')} className="min-w-0 flex-1">
      <ol className="m-0 flex min-w-0 list-none items-center gap-1.5 p-0 text-[15px]">
        {crumbs.map((crumb, i) => {
          const text = crumb.labelKey ? t(crumb.labelKey) : crumb.label;
          // Narrow screens keep the first and the last crumb; the last one truncates.
          const middle = i > 0 && i < last ? 'hidden sm:flex' : 'flex';
          return (
            <li key={`${i}-${text}`} className={`${middle} min-w-0 items-center gap-1.5 ${i === last ? 'flex-1 sm:flex-none' : 'flex-none'}`}>
              {i > 0 && <ShellIcon d={ICONS.chevronRight} size={14} className="flex-none text-ar-faint" />}
              {crumb.href && i < last ? (
                <Link href={crumb.href} className="truncate font-medium text-ar-muted no-underline hover:text-ar-ink">
                  {text}
                </Link>
              ) : (
                <span aria-current="page" className="truncate font-semibold text-ar-ink">
                  {text}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Search behind an icon (#960): same form as before (→ Đơn hàng with `?q=`), opened by the icon or "/". */
function SearchButton() {
  const t = useCommonTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (isSearchShortcut({ key: e.key, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey, target })) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setOpen(false);
    router.push(q ? `/orders?q=${encodeURIComponent(q)}` : '/orders');
  };

  return (
    <div ref={boxRef} className="flex-none">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('shell.searchOpen')}
        aria-expanded={open}
        title={`${t('shell.search')} (/)`}
        className={`flex h-10 w-10 items-center justify-center rounded-[10px] hover:bg-ar-subtle hover:text-ar-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary ${
          open ? 'bg-ar-subtle text-ar-ink' : 'text-ar-muted'
        }`}
      >
        <ShellIcon d={ICONS.search} />
      </button>
      {open && (
        <form
          role="search"
          onSubmit={submit}
          className="absolute left-3 right-3 top-full z-40 mt-2 rounded-xl border border-ar-line bg-ar-surface p-2 shadow-lg lg:left-auto lg:right-8 lg:w-[520px]"
        >
          <label className="flex h-10 items-center gap-2 rounded-[10px] bg-ar-subtle px-3 text-ar-muted focus-within:ring-2 focus-within:ring-ar-primary">
            <ShellIcon d={ICONS.search} size={18} />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t('shell.search')}
              placeholder={t('shell.searchPlaceholder')}
              className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ar-ink outline-none placeholder:text-ar-muted"
            />
            <kbd className="hidden rounded-md border border-ar-line-strong px-1.5 text-xs font-normal text-ar-muted sm:inline">/</kbd>
          </label>
        </form>
      )}
    </div>
  );
}

export function ShopTopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const t = useCommonTranslations();
  return (
    <header className="relative flex items-center gap-3 border-b border-ar-line bg-ar-surface px-4 py-3 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('shell.openMenu')}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-ar-ink hover:bg-ar-subtle lg:hidden"
      >
        <ShellIcon d={ICONS.menu} />
      </button>
      <Breadcrumb />
      <SearchButton />
      <ThemeSwitch />
      <NotificationBell />
    </header>
  );
}
