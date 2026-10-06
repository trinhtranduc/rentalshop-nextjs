'use client';

import React, { useEffect, useState } from 'react';
import { useCommonTranslations } from '@rentalshop/hooks';
import { ShopSidebar, type ShopSidebarUser } from './ShopSidebar';
import { ShopTopBar } from './ShopTopBar';
import { ICONS, ShellIcon } from './Icon';

interface ShopShellProps {
  user?: ShopSidebarUser | null;
  pathname: string | null;
  onLogout: () => void;
  children: React.ReactNode;
}

/** Signed-in frame (#509): sidebar on lg+, drawer below; top bar; page area on the shell background. */
export function ShopShell({ user, pathname, onLogout, children }: ShopShellProps) {
  const t = useCommonTranslations();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="ar-theme flex h-screen bg-ar-page">
      <div className="hidden flex-none lg:block">
        <ShopSidebar user={user} pathname={pathname} onLogout={onLogout} />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label={t('shell.mainMenu')} className="relative h-full w-[248px]">
            <ShopSidebar user={user} pathname={pathname} onLogout={onLogout} onNavigate={() => setDrawerOpen(false)} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label={t('shell.closeMenu')}
              className="absolute -right-12 top-3 flex h-10 w-10 items-center justify-center rounded-[10px] bg-ar-surface text-ar-ink"
            >
              <ShellIcon d={ICONS.close} />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <ShopTopBar onOpenMenu={() => setDrawerOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-ar-page">{children}</main>
      </div>
    </div>
  );
}
