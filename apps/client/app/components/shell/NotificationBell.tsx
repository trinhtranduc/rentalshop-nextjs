'use client';

/**
 * Bell + panel (#509, redrawn to the Thong-bao board in #528): pill tabs, rows grouped by
 * Vietnam day with the weekday, an icon per event, unread rows tinted with a dot, a row opens
 * its order and marks it read, "Đã đọc hết", a ⋯ menu, and "Xem tất cả thông báo" → /notifications.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getLocalDateKey, notificationsApi, type Notification } from '@rentalshop/utils';
import { useCommonTranslations } from '@rentalshop/hooks';
import { groupByShopDay } from './notification-groups';
import { NOTIFICATIONS_CHANGED_EVENT, NotificationGroups, announceNotificationsChanged } from './NotificationList';
import { ICONS, ShellIcon } from './Icon';

const REFRESH_MS = 60_000;
const DOUBLE_CHECK = 'M2 12l5 5L18 6M12 17l1 1 9-11';

type Tab = 'all' | 'unread';

export function badgeText(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function NotificationBell() {
  const t = useCommonTranslations();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      if (res.success && typeof res.data?.count === 'number') setUnread(res.data.count);
    } catch {
      // The badge is a hint; a failed refresh keeps the last value.
    }
  }, []);

  const loadItems = useCallback(async (which: Tab) => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await notificationsApi.getNotificationsPaginated(1, 20, which === 'unread' ? { isRead: false } : {});
      if (res.success && res.data) {
        setItems(res.data.notifications || []);
        if (typeof res.data.unreadCount === 'number') setUnread(res.data.unreadCount);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, REFRESH_MS);
    window.addEventListener('focus', refreshCount);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshCount);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshCount);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshCount);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (open) loadItems(tab);
    else setMenuOpen(false);
  }, [open, tab, loadItems]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const openItem = async (item: Notification) => {
    setOpen(false);
    if (item.isRead) return;
    setItems((list) => list.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markAsRead(item.id);
    } catch {
      refreshCount();
    }
    announceNotificationsChanged();
  };

  const markAll = async () => {
    setItems((list) => (tab === 'unread' ? [] : list.map((n) => ({ ...n, isRead: true }))));
    setUnread(0);
    try {
      await notificationsApi.markAllAsRead();
    } catch {
      refreshCount();
    }
    announceNotificationsChanged();
  };

  const deleteRead = async () => {
    setMenuOpen(false);
    try {
      await notificationsApi.deleteAllRead();
    } catch {
      // The reload below shows what is left.
    }
    loadItems(tab);
    announceNotificationsChanged();
  };

  const weekdays = useMemo(() => t('shell.notifications.weekdays').split(','), [t]);
  const groups = useMemo(() => groupByShopDay(items, new Date(), getLocalDateKey), [items]);
  const bellLabel = unread > 0 ? t('shell.notifications.bellLabel', { count: unread }) : t('shell.notifications.title');
  const pill = (on: boolean) =>
    `h-[34px] rounded-full px-3 text-sm ${
      on ? 'bg-ar-ink font-semibold text-ar-page' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'
    }`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={bellLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-[10px] border focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary ${
          open ? 'border-ar-primary bg-ar-primary-soft text-ar-primary-ink' : 'border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'
        }`}
      >
        <ShellIcon d={ICONS.bell} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-ar-surface bg-ar-danger px-1 text-xs font-bold text-white">
            {badgeText(unread)}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label={t('shell.notifications.title')}
          className="fixed left-4 right-4 top-[68px] z-50 flex flex-col overflow-hidden rounded-2xl border border-ar-line bg-ar-surface shadow-[0_12px_32px_rgba(15,23,42,0.16)] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[440px]"
        >
          <div className="flex items-center gap-1 pb-2 pl-5 pr-2 pt-3">
            <h2 className="m-0 flex-1 text-lg font-bold text-ar-ink">{t('shell.notifications.title')}</h2>
            <button
              type="button"
              onClick={markAll}
              disabled={unread === 0}
              className="flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-sm font-semibold text-ar-primary-ink hover:bg-ar-primary-soft disabled:cursor-default disabled:text-ar-faint disabled:hover:bg-transparent"
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d={DOUBLE_CHECK} />
              </svg>
              {t('shell.notifications.markAllRead')}
            </button>
            <div className="relative">
              <button
                type="button"
                aria-label={t('shell.notifications.moreActions')}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ar-ink hover:bg-ar-subtle"
              >
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="19" cy="12" r="1.8" />
                </svg>
              </button>
              {menuOpen && (
                <ul role="menu" className="absolute right-0 z-10 m-0 mt-1 min-w-[220px] list-none rounded-xl border border-ar-line-soft bg-ar-surface p-1 shadow-ar">
                  <li role="none">
                    <Link
                      role="menuitem"
                      href="/notifications"
                      onClick={() => setOpen(false)}
                      className="flex h-9 items-center rounded-lg px-3 text-sm text-ar-ink no-underline hover:bg-ar-subtle"
                    >
                      {t('shell.notifications.seeAll')}
                    </Link>
                  </li>
                  <li role="none">
                    <button
                      role="menuitem"
                      type="button"
                      onClick={deleteRead}
                      className="flex h-9 w-full items-center rounded-lg px-3 text-left text-sm text-ar-danger hover:bg-ar-subtle"
                    >
                      {t('shell.notifications.deleteRead')}
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </div>

          <div role="tablist" className="flex gap-2 border-b border-ar-subtle px-5 pb-3">
            {(['all', 'unread'] as Tab[]).map((key) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={pill(tab === key)}>
                {key === 'all' ? t('shell.notifications.all') : t('shell.notifications.unread')}
                {key === 'unread' && unread > 0 ? ` · ${badgeText(unread)}` : ''}
              </button>
            ))}
          </div>

          <div className="max-h-[min(640px,calc(100vh-220px))] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex flex-col gap-3 px-5 py-4" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="block h-12 animate-pulse rounded-lg bg-ar-subtle" />
                ))}
              </div>
            ) : failed ? (
              <div role="alert" className="flex flex-wrap items-center justify-center gap-3 px-5 py-8 text-sm text-ar-muted">
                <span>{t('shell.notifications.loadError')}</span>
                <button
                  type="button"
                  onClick={() => loadItems(tab)}
                  className="h-9 rounded-[10px] border border-ar-line px-3 font-semibold text-ar-ink hover:bg-ar-subtle"
                >
                  {t('shell.notifications.retry')}
                </button>
              </div>
            ) : items.length === 0 ? (
              <p className="m-0 px-5 py-8 text-center text-sm text-ar-muted">
                {tab === 'unread' ? t('shell.notifications.emptyUnread') : t('shell.notifications.empty')}
              </p>
            ) : (
              <NotificationGroups
                groups={groups}
                labels={{ today: t('shell.notifications.today'), yesterday: t('shell.notifications.yesterday'), weekdays }}
                onOpen={openItem}
              />
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex min-h-[48px] items-center justify-center border-t border-ar-subtle text-[15px] font-semibold text-ar-primary-ink no-underline hover:bg-ar-surface-muted"
          >
            {t('shell.notifications.seeAll')}
          </Link>
        </section>
      )}
    </div>
  );
}
