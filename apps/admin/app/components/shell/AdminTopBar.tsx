'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminThemeSwitch } from './AdminThemeSwitch';
import { createActionFor, searchTargetFor } from './nav';
import { ICONS, ShellIcon } from './Icon';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

export function AdminTopBar({ pathname, onOpenMenu }: { pathname: string | null; onOpenMenu: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const create = createActionFor(pathname);

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
    router.push(searchTargetFor(pathname, query));
  };

  return (
    <header className="flex items-center gap-2 border-b border-ar-line bg-ar-surface px-3 py-2 lg:gap-3 lg:px-8 lg:py-3">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open menu"
        className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] text-ar-ink hover:bg-ar-subtle lg:hidden"
      >
        <ShellIcon d={ICONS.menu} />
      </button>
      <form role="search" onSubmit={submit} className="min-w-0 flex-1 lg:max-w-[520px]">
        <label className="flex h-11 items-center gap-2 rounded-[10px] bg-ar-subtle px-3 text-ar-muted focus-within:ring-2 focus-within:ring-ar-primary lg:h-10">
          <ShellIcon d={ICONS.search} size={18} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
            placeholder="Search..."
            className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ar-ink outline-none placeholder:text-ar-muted"
          />
          <kbd className="hidden rounded-md border border-ar-line-strong px-1.5 text-xs font-normal text-ar-muted sm:inline">/</kbd>
        </label>
      </form>
      <span className="hidden flex-1 lg:block" />
      <Link
        href={create.href}
        aria-label={create.label}
        className="hidden h-10 flex-none items-center gap-2 rounded-[10px] bg-ar-primary px-4 text-[15px] font-semibold text-ar-on-primary no-underline hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ar-primary lg:flex"
      >
        <ShellIcon d={ICONS.plus} size={18} />
        {create.label}
      </Link>
      <AdminThemeSwitch />
    </header>
  );
}
