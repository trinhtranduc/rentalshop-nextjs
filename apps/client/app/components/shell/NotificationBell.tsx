'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getLocalDateKey, notificationsApi, SHOP_TIMEZONE, type Notification } from '@rentalshop/utils';
import { useCommonTranslations } from '@rentalshop/hooks';
import { groupByShopDay } from './notification-groups';
import { ICONS, ShellIcon } from './Icon';

const REFRESH_MS = 60_000;

type Tab = 'all' | 'unread';

const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: SHOP_TIMEZONE,
});

function badgeText(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function NotificationBell() {
  const t = useCommonTranslations();
  const [open, setOpen] = useState(false);
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
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshCount);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (open) loadItems(tab);
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

  const markOne = async (item: Notification) => {
    if (item.isRead) return;
    setItems((list) => list.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    setUnread((c) => Math.max(0, c - 1));
    try {
      await notificationsApi.markAsRead(item.id);
    } catch {
      refreshCount();
    }
  };

  const markAll = async () => {
    setItems((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await notificationsApi.markAllAsRead();
    } catch {
      refreshCount();
    }
  };

  const groups = useMemo(() => groupByShopDay(items, new Date(), getLocalDateKey), [items]);
  const bellLabel = unread > 0 ? t('shell.notifications.bellLabel', { count: unread }) : t('shell.notifications.title');

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={bellLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-[10px] border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-ar-primary"
      >
        <ShellIcon d={ICONS.bell} />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-ar-surface bg-ar-danger px-1 text-xs font-bold text-white">
            {badgeText(unread)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('shell.notifications.title')}
          className="absolute right-0 top-12 z-50 w-[440px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-ar-line-soft bg-ar-surface shadow-[0_12px_32px_rgba(15,23,42,0.18)]"
        >
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <h2 className="text-lg font-bold text-ar-ink">{t('shell.notifications.title')}</h2>
            <button
              type="button"
              onClick={markAll}
              disabled={unread === 0}
              className="h-8 rounded-lg px-2 text-sm font-semibold text-ar-primary-ink hover:bg-ar-primary-soft disabled:cursor-default disabled:text-ar-faint disabled:hover:bg-transparent"
            >
              {t('shell.notifications.markAllRead')}
            </button>
          </div>
          <div role="tablist" className="flex gap-1 border-b border-ar-line px-4">
            {(['all', 'unread'] as Tab[]).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px h-10 border-b-2 px-2 text-[15px] ${
                  tab === key ? 'border-ar-primary font-semibold text-ar-primary-ink' : 'border-transparent text-ar-muted'
                }`}
              >
                {key === 'all' ? t('shell.notifications.all') : t('shell.notifications.unread')}
                {key === 'unread' && unread > 0 ? ` · ${badgeText(unread)}` : ''}
              </button>
            ))}
          </div>

          <div className="max-h-[480px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ar-muted">…</p>
            ) : failed ? (
              <p className="px-5 py-8 text-center text-sm text-ar-muted">{t('shell.notifications.loadError')}</p>
            ) : items.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ar-muted">
                {tab === 'unread' ? t('shell.notifications.emptyUnread') : t('shell.notifications.empty')}
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.dateKey}>
                  <h3 className="bg-ar-surface-muted px-5 py-1.5 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">
                    {group.label.kind === 'today'
                      ? t('shell.notifications.today')
                      : group.label.kind === 'yesterday'
                        ? t('shell.notifications.yesterday')
                        : group.label.text}
                  </h3>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => markOne(item)}
                          className={`flex w-full items-start gap-3 border-t border-ar-subtle px-5 py-3 text-left hover:bg-ar-subtle ${
                            item.isRead ? '' : 'bg-ar-unread'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`mt-2 h-2 w-2 flex-none rounded-full ${item.isRead ? 'bg-transparent' : 'bg-ar-primary'}`}
                          />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className={`text-[15px] text-ar-ink ${item.isRead ? 'font-medium' : 'font-bold'}`}>{item.title}</span>
                            {(item.body || item.message) && (
                              <span className="text-sm text-ar-muted">{item.body || item.message}</span>
                            )}
                          </span>
                          <span className="flex-none text-xs tabular-nums text-ar-muted">
                            {timeFormatter.format(new Date(item.createdAt))}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
