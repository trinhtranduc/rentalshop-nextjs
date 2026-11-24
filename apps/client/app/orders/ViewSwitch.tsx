'use client';

/** Bảng | Lịch switch of the Orders page. The view lives in the URL (`?view=calendar`); table is the default. */
import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShellIcon } from '../components/shell/Icon';
import { switchViewQuery, type OrdersView } from './orders-view-model';

// Same line style as the sidebar icons: a table (rows and a column) and the calendar of "Lịch giao trả".
const TABLE_ICON = 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14';
const CALENDAR_ICON = 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM3 10h18M8 3v4M16 3v4';

export function ViewSwitch({ view }: { view: OrdersView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('orders.web.view') as unknown as (key: string) => string;

  const go = (next: OrdersView) => {
    if (next === view) return;
    const query = switchViewQuery(next, searchParams);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const item = (key: OrdersView, label: string, icon: string) => (
    <button
      type="button"
      aria-pressed={view === key}
      onClick={() => go(key)}
      className={`inline-flex h-9 items-center gap-1.5 px-3.5 text-sm font-semibold ${view === key ? 'bg-ar-primary text-white' : 'bg-ar-surface text-ar-ink-2 hover:bg-ar-subtle'}`}
    >
      <ShellIcon d={icon} size={16} />
      {label}
    </button>
  );

  return (
    <div role="group" aria-label={t('label')} data-orders-view-switch className="inline-flex overflow-hidden rounded-[10px] border border-ar-line">
      {item('table', t('table'), TABLE_ICON)}
      {item('calendar', t('calendar'), CALENDAR_ICON)}
    </div>
  );
}
