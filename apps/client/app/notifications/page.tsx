'use client';

/**
 * Thông báo (#528): the full list behind "Xem tất cả thông báo" in the bell panel. Same rows and
 * Vietnam-day groups as the panel, plus paging ("Xem thêm"), read / unread per row and
 * "Xoá thông báo đã đọc". Reads GET /api/notifications; tab kept in the URL (?tab=unread).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCommonTranslations } from '@rentalshop/hooks';
import { getLocalDateKey, notificationsApi, type Notification } from '@rentalshop/utils';
import { groupByShopDay } from '../components/shell/notification-groups';
import { NOTIFICATIONS_CHANGED_EVENT, NotificationGroups, announceNotificationsChanged } from '../components/shell/NotificationList';
import { cardClass, outlineBtn, Skeleton } from '../orders/list/parts';

const PAGE_SIZE = 30;

type Tab = 'all' | 'unread';

export default function NotificationsPage() {
  const t = useCommonTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab = searchParams.get('tab') === 'unread' ? 'unread' : 'all';

  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      setFailed(false);
      try {
        const res = await notificationsApi.getNotificationsPaginated(nextPage, PAGE_SIZE, tab === 'unread' ? { isRead: false } : {});
        if (res.success && res.data) {
          const rows = res.data.notifications || [];
          setItems((prev) => (nextPage === 1 ? rows : [...prev, ...rows.filter((r) => !prev.some((p) => p.id === r.id))]));
          setPage(nextPage);
          setTotalPages(Math.max(1, res.data.totalPages || 1));
          if (typeof res.data.unreadCount === 'number') setUnread(res.data.unreadCount);
        } else setFailed(true);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  // The bell may mark rows read while this page is open.
  useEffect(() => {
    const reload = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== 'page') load(1);
    };
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, reload);
  }, [load]);

  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'unread') params.set('tab', 'unread');
    else params.delete('tab');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const setRead = async (item: Notification, read: boolean) => {
    setItems((list) =>
      tab === 'unread' && read ? list.filter((n) => n.id !== item.id) : list.map((n) => (n.id === item.id ? { ...n, isRead: read } : n)),
    );
    setUnread((c) => Math.max(0, c + (read ? -1 : 1)));
    try {
      if (read) await notificationsApi.markAsRead(item.id);
      else await notificationsApi.markAsUnread(item.id);
    } catch {
      load(1);
    }
    announceNotificationsChanged('page');
  };

  const markAll = async () => {
    setItems((list) => (tab === 'unread' ? [] : list.map((n) => ({ ...n, isRead: true }))));
    setUnread(0);
    try {
      await notificationsApi.markAllAsRead();
    } catch {
      load(1);
    }
    announceNotificationsChanged('page');
  };

  const deleteRead = async () => {
    try {
      await notificationsApi.deleteAllRead();
    } catch {
      // The reload shows what is left.
    }
    load(1);
    announceNotificationsChanged('page');
  };

  const weekdays = useMemo(() => t('shell.notifications.weekdays').split(','), [t]);
  const groups = useMemo(() => groupByShopDay(items, new Date(), getLocalDateKey), [items]);
  const pill = (on: boolean) =>
    `h-9 rounded-full px-3 text-sm ${on ? 'bg-ar-ink font-semibold text-ar-page' : 'border border-ar-line bg-ar-surface text-ar-ink hover:bg-ar-subtle'}`;

  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 text-ar-ink sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold">
          {t('shell.notifications.title')}
          {unread > 0 && <span className="text-base font-normal text-ar-muted"> · {t('shell.notifications.unreadCount', { count: unread })}</span>}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={deleteRead} className={outlineBtn}>
            {t('shell.notifications.deleteRead')}
          </button>
          <button type="button" onClick={markAll} disabled={unread === 0} className={outlineBtn}>
            {t('shell.notifications.markAllRead')}
          </button>
        </div>
      </div>

      <section className={`${cardClass} max-w-[880px] overflow-hidden`}>
        <div role="tablist" className="flex gap-2 border-b border-ar-subtle px-5 py-3">
          {(['all', 'unread'] as Tab[]).map((key) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)} className={pill(tab === key)}>
              {key === 'all' ? t('shell.notifications.all') : t('shell.notifications.unread')}
              {key === 'unread' && unread > 0 ? ` · ${unread > 99 ? '99+' : unread}` : ''}
            </button>
          ))}
        </div>

        {failed && items.length === 0 ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 px-5 py-6 text-[15px] text-ar-muted">
            <span>{t('shell.notifications.loadError')}</span>
            <button type="button" onClick={() => load(1)} className="h-9 rounded-[10px] border border-ar-line px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle">
              {t('shell.notifications.retry')}
            </button>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="flex flex-col gap-3 px-5 py-4" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="m-0 px-5 py-10 text-center text-[15px] text-ar-muted">
            {tab === 'unread' ? t('shell.notifications.emptyUnread') : t('shell.notifications.empty')}
          </p>
        ) : (
          <>
            <NotificationGroups
              groups={groups}
              labels={{
                today: t('shell.notifications.today'),
                yesterday: t('shell.notifications.yesterday'),
                weekdays,
                markRead: t('shell.notifications.markRead'),
                markUnread: t('shell.notifications.markUnread'),
              }}
              onOpen={(item) => {
                if (!item.isRead) setRead(item, true);
              }}
              onToggleRead={(item) => setRead(item, !item.isRead)}
            />
            {(page < totalPages || failed) && (
              <div className="flex justify-center px-5 py-4">
                <button type="button" onClick={() => load(page + (failed ? 0 : 1))} disabled={loading} className={outlineBtn}>
                  {failed ? t('shell.notifications.retry') : loading ? '…' : t('shell.notifications.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
