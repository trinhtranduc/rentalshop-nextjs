'use client';

/**
 * Tổng quan › "Sắp đến hạn" (#1199): the deposit stages due tomorrow, from `installmentsDueTomorrow` of outlet-operations.
 * #1231: the stages that are late or due today are rows of "Đơn cần làm hôm nay" (the To do list) instead.
 * Only a reminder for staff: nothing is sent to the customer. Rendered only when something is waiting.
 */
import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { OutletOperations } from '@rentalshop/utils';
import { cardClass, type Money } from '../orders/list/parts';
import { dueSoonCount, dueSoonRows, shortDay, type ReminderRow } from './installments-model';

type TD = (key: string, values?: Record<string, string | number>) => string;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || '·';

function Chip({ row, td }: { row: ReminderRow; td: TD }) {
  const base = 'whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold';
  if (row.chip.kind === 'late') return <span className={`${base} bg-ar-late-bg text-ar-late`}>{td('lateDays', { days: row.chip.days })}</span>;
  if (row.chip.kind === 'today') return <span className={`${base} bg-ar-primary-soft text-ar-primary-ink`}>{td('todayChip')}</span>;
  return <span className={`${base} bg-ar-subtle text-ar-ink-2`}>{row.chip.day}</span>;
}

function Card({ title, rows, money, td, dataKey }: { title: string; rows: ReminderRow[]; money: Money; td: TD; dataKey: string }) {
  return (
    <section className={`${cardClass} flex min-w-0 flex-[1_1_320px] flex-col gap-1 px-[22px] py-5`} data-installment-card={dataKey}>
      <h2 className="m-0 mb-1.5 text-lg font-bold text-ar-ink">{title}</h2>
      {rows.length === 0 ? (
        <p className="m-0 py-3 text-sm text-ar-muted">{td('reminderEmpty')}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {rows.map((row) => (
            <li key={`${row.orderId}-${row.stage}-${row.dueDateKey}`} className="border-t border-ar-subtle first:border-t-0">
              <Link href={`/orders/${row.orderNumber}`} className="flex items-center gap-3 py-2.5 text-inherit no-underline hover:opacity-90">
                <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ar-subtle text-xs font-bold text-ar-ink-2">
                  {initials(row.name)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold text-ar-ink">{row.name || td('walkIn')}</span>
                  <span className="truncate text-xs text-ar-muted">
                    #{row.orderNumber}
                    {row.stage ? ` · ${td('stageShort', { n: row.stage })}` : ''} · {td('dueOn', { day: shortDay(row.dueDateKey) })}
                  </span>
                </span>
                <Chip row={row} td={td} />
                <span className="min-w-[84px] text-right font-bold tabular-nums text-ar-ink">{money(row.amount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function InstallmentReminders({ data, money }: { data: OutletOperations | null; money: Money }) {
  const t = useTranslations('orders.web');
  const td: TD = (key, values) => t(`installments.${key}`, values as Record<string, string | number>);
  // #1231: the stages that are late or due today are rows of "Đơn cần làm hôm nay" on the same page; only tomorrow's stay here
  if (!data || dueSoonCount(data) === 0) return null;
  return (
    <div className="flex flex-wrap gap-4" data-installment-reminders>
      <Card title={td('dueSoonTitle')} rows={dueSoonRows(data)} money={money} td={td} dataKey="soon" />
    </div>
  );
}
