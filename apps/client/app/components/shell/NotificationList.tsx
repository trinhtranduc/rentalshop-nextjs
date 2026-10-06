'use client';

/**
 * Notification rows grouped by Vietnam day (#528, board Thong-bao). Used by the bell panel and
 * by the /notifications page so both look the same.
 */
import React from 'react';
import Link from 'next/link';
import { SHOP_TIMEZONE, type Notification } from '@rentalshop/utils';
import { ShellIcon } from './Icon';
import { notificationHref, notificationKind, shortDayLabel, type DayGroup, type NotificationKind } from './notification-groups';

const KIND_ICON: Record<NotificationKind, { d: string; className: string }> = {
  order: { d: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6', className: 'bg-ar-reserved-bg text-ar-reserved' },
  handover: {
    d: 'M3 7h13l5 5v5h-3M3 7v10h3M8 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM16 17a2 2 0 1 0 4 0',
    className: 'bg-ar-reserved-bg text-ar-reserved',
  },
  back: { d: 'M9 14l-4-4 4-4M5 10h9a5 5 0 0 1 0 10h-2', className: 'bg-ar-renting-bg text-ar-renting' },
  done: { d: 'M20 6L9 17l-5-5', className: 'bg-ar-done-bg text-ar-done' },
  cancelled: { d: 'M6 6l12 12M18 6L6 18', className: 'bg-ar-cancelled-bg text-ar-cancelled' },
  other: {
    d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
    className: 'bg-ar-subtle text-ar-ink-2',
  },
};

const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: SHOP_TIMEZONE,
});

export function formatNotificationTime(createdAt: string): string {
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? '' : timeFormatter.format(d);
}

export interface NotificationListLabels {
  today: string;
  yesterday: string;
  weekdays: string[];
  markRead?: string;
  markUnread?: string;
}

export function groupHeading(group: DayGroup<unknown>, labels: NotificationListLabels): string {
  const day = shortDayLabel(group.dateKey, labels.weekdays);
  if (group.label.kind === 'today') return `${labels.today} · ${day}`;
  if (group.label.kind === 'yesterday') return `${labels.yesterday} · ${day}`;
  return day;
}

function RowBody({ item }: { item: Notification }) {
  const icon = KIND_ICON[notificationKind(item)];
  const body = item.body || item.message;
  return (
    <>
      <span aria-hidden="true" className={`flex h-9 w-9 flex-none items-center justify-center rounded-[10px] ${icon.className}`}>
        <ShellIcon d={icon.d} size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={`text-[15px] leading-[21px] [overflow-wrap:anywhere] ${
              item.isRead ? 'font-medium text-ar-ink-2' : 'font-bold text-ar-ink'
            }`}
          >
            {item.title}
          </span>
          <span className="flex-none text-sm tabular-nums text-ar-muted">{formatNotificationTime(item.createdAt)}</span>
        </span>
        {body && <span className="text-sm leading-5 text-ar-muted [overflow-wrap:anywhere]">{body}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`mt-[7px] h-[9px] w-[9px] flex-none rounded-full ${item.isRead ? 'bg-transparent' : 'bg-ar-primary'}`}
      />
    </>
  );
}

export function NotificationGroups({
  groups,
  labels,
  onOpen,
  onToggleRead,
}: {
  groups: DayGroup<Notification>[];
  labels: NotificationListLabels;
  /** Called before following the row (marks it read). */
  onOpen: (item: Notification) => void;
  /** Full page only: a small read / unread switch per row. */
  onToggleRead?: (item: Notification) => void;
}) {
  const rowClass = (item: Notification) =>
    `flex min-w-0 flex-1 items-start gap-3 px-5 py-3 text-left text-inherit no-underline hover:bg-ar-surface-muted ${
      item.isRead ? 'bg-ar-surface' : 'bg-ar-unread'
    }`;
  return (
    <>
      {groups.map((group) => (
        <section key={group.dateKey}>
          <h3 className="m-0 border-b border-ar-subtle bg-ar-surface-muted px-5 pb-1.5 pt-2 text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">
            {groupHeading(group, labels)}
          </h3>
          <ul className="m-0 list-none p-0">
            {group.items.map((item) => {
              const href = notificationHref(item);
              return (
                <li key={item.id} className="flex items-stretch border-b border-ar-subtle">
                  {href ? (
                    <Link href={href} onClick={() => onOpen(item)} className={rowClass(item)}>
                      <RowBody item={item} />
                    </Link>
                  ) : (
                    <button type="button" onClick={() => onOpen(item)} className={rowClass(item)}>
                      <RowBody item={item} />
                    </button>
                  )}
                  {onToggleRead && (
                    <button
                      type="button"
                      onClick={() => onToggleRead(item)}
                      className={`flex-none whitespace-nowrap border-l border-ar-subtle px-3 text-sm font-semibold text-ar-primary-ink hover:bg-ar-subtle ${
                        item.isRead ? 'bg-ar-surface' : 'bg-ar-unread'
                      }`}
                    >
                      {item.isRead ? labels.markUnread : labels.markRead}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}

/** Lets the bell refresh its badge after the /notifications page changes read state. */
export const NOTIFICATIONS_CHANGED_EVENT = 'ar:notifications-changed';

export function announceNotificationsChanged(source: 'bell' | 'page' = 'bell') {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, { detail: source }));
}
