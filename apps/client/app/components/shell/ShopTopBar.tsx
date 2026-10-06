'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCommonTranslations } from '@rentalshop/hooks';
import { ThemeSwitch } from './ThemeSwitch';
import { NotificationBell } from './NotificationBell';
import { ICONS, ShellIcon } from './Icon';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function ShopTopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const t = useCommonTranslations();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" focuses search, as hinted in the field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/orders?q=${encodeURIComponent(q)}` : '/orders');
  };

  return (
    <header className="flex items-center gap-3 border-b border-ar-line bg-ar-surface px-4 py-3 lg:px-8">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('shell.openMenu')}
        className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] text-ar-ink hover:bg-ar-subtle lg:hidden"
      >
        <ShellIcon d={ICONS.menu} />
      </button>
      <form role="search" onSubmit={submit} className="min-w-0 flex-1 lg:max-w-[520px]">
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
      <span className="hidden flex-1 lg:block" />
      <ThemeSwitch />
      <NotificationBell />
    </header>
  );
}
