'use client';

import React, { useEffect, useState } from 'react';
import { AdminSideNav, type AdminSideNavUser } from './AdminSideNav';
import { AdminTopBar } from './AdminTopBar';
import { ICONS, ShellIcon } from './Icon';

interface AdminShellProps {
  user?: AdminSideNavUser | null;
  pathname: string | null;
  onLogout: () => void;
  /** Rendered above the page (subscription expiry banner). */
  banner?: React.ReactNode;
  children: React.ReactNode;
}

/** Signed-in frame (#804): sidebar on lg+, drawer below; top bar; page area on the shell background. */
export function AdminShell({ user, pathname, onLogout, banner, children }: AdminShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);

  // Marks <html> while the shell is mounted so portalled dialogs pick up the shell tokens.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('ar-shell');
    return () => root.classList.remove('ar-shell');
  }, []);

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
        <AdminSideNav user={user} pathname={pathname} onLogout={onLogout} />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Main menu" className="relative h-full w-[272px] max-w-[85vw]">
            <AdminSideNav user={user} pathname={pathname} onLogout={onLogout} onNavigate={() => setDrawerOpen(false)} />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute -right-12 top-3 flex h-11 w-11 items-center justify-center rounded-[10px] bg-ar-surface text-ar-ink"
            >
              <ShellIcon d={ICONS.close} />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar pathname={pathname} onOpenMenu={() => setDrawerOpen(true)} />
        {banner}
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-ar-page">{children}</main>
      </div>
    </div>
  );
}
