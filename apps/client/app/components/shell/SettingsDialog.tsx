'use client';

/**
 * Cài đặt as a large dialog over the current page (#539), like Claude's settings: tab list on the
 * left, section on the right. Open state is `?settings=<tab>` so back, refresh and links work.
 * Rendered inside the shell (`.ar-theme`) for the dark tokens, at z-[60]: below the shared
 * @rentalshop/ui dialogs (z-[100]) that sections open, above the shell drawer (z-50).
 */
import React, { useEffect, useId, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@rentalshop/hooks';
import { SettingsPanel } from '../../settings/SettingsPanel';
import { SETTINGS_PARAM, closeSettingsHref, resolveTab, settingsHref, type SettingsTab } from '../../settings/settings-model';

export function SettingsDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname() || '/dashboard';
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  const requested = searchParams.get(SETTINGS_PARAM);
  const open = requested !== null;
  const role = String((user as { role?: string } | null)?.role || '').toUpperCase();
  const { tab, redirect } = resolveTab(requested, role);
  const search = searchParams.toString();

  useEffect(() => onOpenChange?.(open), [open, onOpenChange]);

  // Unknown or forbidden tab → the role's default; `loyalty` left Settings (#528).
  useEffect(() => {
    if (!open || !role) return;
    if (redirect) router.replace(redirect);
    else if (requested !== tab) router.replace(settingsHref(pathname, search, tab), { scroll: false });
  }, [open, role, redirect, requested, tab, pathname, search, router]);

  const close = () => router.replace(closeSettingsHref(pathname, search), { scroll: false });
  const onTab = (next: SettingsTab) => router.replace(settingsHref(pathname, search, next), { scroll: false });

  // Focus in on open, back to the opener on close; lock the page scroll behind the dialog.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    panelRef.current?.focus();
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = 'hidden';
    return () => {
      root.style.overflow = prev;
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Shared dialogs opened from a section are portalled, but React still bubbles their keys here:
    // only an Esc from inside this panel closes Cài đặt; theirs closes just them.
    if (e.key === 'Escape' && panelRef.current?.contains(e.target as Node)) {
      e.stopPropagation();
      close();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center lg:p-6" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex h-full w-full flex-col overflow-hidden bg-ar-surface shadow-2xl outline-none lg:h-[min(720px,100%)] lg:w-[min(1040px,100%)] lg:rounded-2xl lg:border lg:border-ar-line"
      >
        <SettingsPanel tab={tab} onTab={onTab} onClose={close} titleId={titleId} />
      </div>
    </div>
  );
}
