'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ICONS, ShellIcon } from '../../components/shell/Icon';
import {
  clockDay,
  clockOf,
  dayKeyOf,
  formatDayLabel,
  type HistoryEvent,
  type NextStep,
  type PaySummary,
  type ProgressStep,
  type ToDayKey,
} from '../orders-model';
import { Skeleton, cardClass, outlineBtn, type Money, type T } from '../list/parts';

const h2Class = 'm-0 text-lg font-bold text-ar-ink';

// ----------------------------------------------------------------------------
// Header menu
// ----------------------------------------------------------------------------

export function ActionMenu({ label, items }: { label: string; items: Array<{ label: string; onSelect: () => void; danger?: boolean }> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  if (items.length === 0) return null;
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={`${outlineBtn} w-10 px-0`}>
        <ShellIcon d={ICONS.more} size={20} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 min-w-[180px] rounded-xl border border-ar-line-soft bg-ar-surface p-1 shadow-ar">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex h-10 w-full items-center rounded-lg px-3 text-left text-[15px] hover:bg-ar-subtle ${item.danger ? 'text-ar-danger' : 'text-ar-ink'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Left column
// ----------------------------------------------------------------------------

export function ProgressCard({ steps, weekdays, t }: { steps: ProgressStep[]; weekdays: string[]; t: T }) {
  if (steps.length === 0) return null;
  return (
    <section aria-label={t('detail.progress.label')} className={`${cardClass} grid grid-cols-3 gap-3 px-5 py-[18px]`}>
      {steps.map((s) => {
        const w = s.when;
        let text = '';
        let tone = 'text-ar-muted';
        if (w.kind === 'done') text = w.key ? `${w.clock} ${w.key.slice(8, 10)}/${w.key.slice(5, 7)}` : '';
        else if (w.kind === 'plan') {
          const day = formatDayLabel(w.key, weekdays);
          if (w.today) {
            text = t('detail.progress.today', { day });
            tone = 'font-semibold text-ar-primary-ink';
          } else if (w.late) {
            text = t('detail.progress.late', { day });
            tone = 'font-semibold text-ar-danger';
          } else text = day;
        }
        return (
          <div key={s.step} className="flex min-w-0 flex-col gap-2">
            <span className={`h-1 rounded-full ${s.reached ? 'bg-ar-primary' : 'bg-ar-line'}`} />
            <span className={`text-[15px] font-semibold ${s.reached ? 'text-ar-ink' : 'text-ar-muted'}`}>{t(`detail.progress.${s.step}`)}</span>
            <span className={`text-sm tabular-nums ${tone}`}>{text}</span>
          </div>
        );
      })}
    </section>
  );
}

export interface ItemView {
  id: number | string;
  name: string;
  image: string | null;
  sub: string;
  total: number;
}

export function ItemsCard({
  title,
  items,
  ready,
  onReady,
  readySaving,
  t,
  money,
}: {
  title: string;
  items: ItemView[];
  ready: boolean | null;
  onReady: (value: boolean) => void;
  readySaving: boolean;
  t: T;
  money: Money;
}) {
  return (
    <section className={`${cardClass} overflow-hidden`}>
      <div className="flex items-center justify-between gap-3 px-5 pb-2.5 pt-4">
        <h2 className={h2Class}>{title}</h2>
        {ready !== null && (
          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-[15px] text-ar-ink">
            <input
              type="checkbox"
              checked={ready}
              disabled={readySaving}
              onChange={(e) => onReady(e.target.checked)}
              className="h-[18px] w-[18px] cursor-pointer accent-ar-primary"
            />
            {t('detail.items.ready')}
          </label>
        )}
      </div>
      {items.length === 0 ? (
        <p className="m-0 border-t border-ar-subtle px-5 py-4 text-[15px] text-ar-muted">{t('detail.items.empty')}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3.5 border-t border-ar-subtle px-5 py-3">
              <span className="flex h-14 w-14 flex-none items-center justify-center overflow-hidden rounded-xl border border-ar-line bg-ar-surface-muted text-ar-faint">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={t('detail.items.image', { name: item.name })} className="h-full w-full object-cover" />
                ) : (
                  <ShellIcon d={ICONS.box} size={22} />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[17px] font-semibold text-ar-ink">{item.name}</span>
                {item.sub && <span className="text-sm tabular-nums text-ar-muted">{item.sub}</span>}
              </span>
              <span className="whitespace-nowrap text-[17px] font-bold tabular-nums text-ar-ink">{money(item.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export interface NoteView {
  key: string;
  label: string;
  text: string;
  images: string[];
  danger?: boolean;
}

export function NotesCard({ notes, onEdit, t }: { notes: NoteView[]; onEdit: (() => void) | null; t: T }) {
  let photo = 0;
  return (
    <section className={`${cardClass} flex flex-col gap-3 px-5 py-4`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={h2Class}>{t('detail.notes.title')}</h2>
        {onEdit && (
          <button type="button" onClick={onEdit} className="h-9 rounded-[10px] border border-ar-line bg-ar-surface px-3 text-sm font-semibold text-ar-ink hover:bg-ar-subtle">
            {t('detail.notes.edit')}
          </button>
        )}
      </div>
      {notes.length === 0 ? (
        <p className="m-0 text-[15px] text-ar-muted">{t('detail.notes.empty')}</p>
      ) : (
        notes.map((n) => (
          <div key={n.key} className="flex flex-col gap-2">
            {notes.length > 1 || n.key !== 'notes' ? <span className="text-xs font-bold uppercase tracking-[0.06em] text-ar-muted">{n.label}</span> : null}
            {n.text && <p className={`m-0 whitespace-pre-wrap text-[15px] leading-[23px] ${n.danger ? 'text-ar-danger' : 'text-ar-ink'}`}>{n.text}</p>}
            {n.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {n.images.map((url) => {
                  photo += 1;
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t('detail.notes.photo', { n: photo })}
                      className="block h-[72px] w-[72px] overflow-hidden rounded-[10px] border border-ar-line bg-ar-subtle hover:opacity-90"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ))
      )}
    </section>
  );
}

export function HistoryCard({ events, toDayKey, t, money }: { events: HistoryEvent[]; toDayKey: ToDayKey; t: T; money: Money }) {
  if (events.length === 0) return null;
  const text = (e: HistoryEvent) => {
    switch (e.kind) {
      case 'created':
        return e.by ? t('detail.history.created', { by: e.by }) : t('detail.history.createdNoBy');
      case 'payment':
        return t(e.refund ? 'detail.history.refund' : 'detail.history.payment', { amount: money(e.amount) });
      default:
        return t(`detail.history.${e.kind}`);
    }
  };
  return (
    <section className={`${cardClass} flex flex-col gap-2.5 px-5 py-4`}>
      <h2 className={`${h2Class} mb-1`}>{t('detail.history.title')}</h2>
      {events.map((e, i) => (
        <div key={`${e.kind}-${e.at}-${i}`} className="flex gap-3 text-[15px]">
          <span className="w-24 flex-none tabular-nums text-ar-muted">{clockDay(e.at, toDayKey)}</span>
          <span className="text-ar-ink">{text(e)}</span>
        </div>
      ))}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Right column
// ----------------------------------------------------------------------------

export function NextStepCard({ next, onAct, busy, weekdays, t, money }: { next: NextStep; onAct: () => void; busy: boolean; weekdays: string[]; t: T; money: Money }) {
  const day = next.day ? formatDayLabel(next.day, weekdays) : '';
  const late = next.lateDays > 0;
  const title =
    next.kind === 'pickup'
      ? late
        ? t('detail.next.pickupLate', { days: next.lateDays })
        : next.today || !day
          ? t('detail.next.pickupToday')
          : t('detail.next.pickupOn', { day })
      : late
        ? t('detail.next.returnLate', { days: next.lateDays })
        : next.today || !day
          ? t('detail.next.returnToday')
          : t('detail.next.returnOn', { day });
  const button =
    next.kind === 'pickup'
      ? next.amount > 0
        ? t('detail.next.pickupBtn', { amount: money(next.amount) })
        : t('detail.next.pickupBtnFree')
      : next.refund > 0
        ? t('detail.next.returnBtnRefund', { amount: money(next.refund) })
        : next.amount > 0
          ? t('detail.next.returnBtn', { amount: money(next.amount) })
          : t('detail.next.returnBtnFree');
  return (
    <section className={`${cardClass} flex flex-col gap-3 px-5 py-4`}>
      <span className="text-sm text-ar-muted">{t('detail.next.label')}</span>
      <span className={`text-lg font-bold ${late ? 'text-ar-danger' : 'text-ar-ink'}`}>{title}</span>
      <button
        type="button"
        onClick={onAct}
        disabled={busy}
        className="h-[52px] rounded-[14px] bg-ar-primary px-4 text-base font-semibold text-ar-on-primary hover:opacity-95 disabled:opacity-60"
      >
        {button}
      </button>
      <span className="text-sm text-ar-muted">
        {t(next.kind === 'pickup' ? 'detail.next.pickupHelp' : 'detail.next.returnHelp')}
        {late ? ` ${t('detail.next.lateHelp')}` : ''}
      </span>
    </section>
  );
}

/** Thanh toán: iOS order detail rows (orders-model `buildPaySummary`), no signs: the label says what it is. */
export function PaymentCard({ summary, t, money }: { summary: PaySummary; t: T; money: Money }) {
  const total = summary.total;
  const totalTone =
    total?.key === 'collectAtPickup' || total?.key === 'returnCollect' || total?.key === 'saleDue'
      ? 'text-ar-unprepared'
      : total?.key === 'returnRefund'
        ? 'text-ar-renting'
        : total?.key === 'saleCollected'
          ? 'text-ar-done'
          : 'text-ar-muted';
  const amountTone = summary.struck ? 'text-ar-muted line-through' : 'text-ar-ink';
  return (
    <section className={`${cardClass} flex flex-col gap-2.5 px-5 py-4`}>
      <h2 className={`${h2Class} mb-0.5`}>{t('detail.pay.title')}</h2>
      {summary.rows.map((r) => (
        <div key={r.key} className="flex justify-between gap-3 text-[15px]">
          <span className="text-ar-ink">{t(`detail.pay.${r.key}`, { amount: money(summary.discount) })}</span>
          <span className={`tabular-nums ${!summary.struck && (r.key === 'lateFee' || r.key === 'damageFee') ? 'text-ar-danger' : amountTone}`}>{money(r.amount)}</span>
        </div>
      ))}
      {total && (
        <div className="flex justify-between gap-3 border-t border-ar-line pt-2.5 text-[17px] font-bold">
          <span className="text-ar-ink">{t(`detail.pay.${total.key}`)}</span>
          {total.amount !== null && <span className={`tabular-nums ${totalTone}`}>{money(total.amount)}</span>}
        </div>
      )}
    </section>
  );
}

export function CustomerCard({
  id,
  name,
  phone,
  email,
  t,
}: {
  id: number | null;
  name: string;
  phone: string;
  email: string;
  t: T;
}) {
  return (
    <section className={`${cardClass} flex flex-col gap-2.5 px-5 py-4`}>
      <div className="flex items-center justify-between">
        <h2 className={h2Class}>{t('detail.customer.title')}</h2>
        {id && (
          <Link href={`/customers/${id}`} className="text-sm font-semibold text-ar-primary-ink no-underline hover:underline">
            {t('detail.customer.view')}
          </Link>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[17px] font-semibold text-ar-ink">{name || t('row.walkIn')}</span>
          {phone && <span className="text-sm tabular-nums text-ar-muted">{phone}</span>}
        </span>
        {phone && (
          <a
            href={`tel:${phone.replace(/[^\d+]/g, '')}`}
            aria-label={t('detail.customer.call', { name: name || phone })}
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-ar-line text-ar-ink hover:bg-ar-subtle"
          >
            <ShellIcon d={ICONS.phone} size={18} />
          </a>
        )}
      </div>
      {email && <span className="truncate text-sm text-ar-muted">{email}</span>}
    </section>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto box-border flex w-full max-w-[1280px] flex-col gap-4 px-4 pb-12 pt-6 sm:px-8" aria-busy="true">
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-9 w-72" />
      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    </div>
  );
}

/** "14:32 T2 05/10" for the header line. */
export function createdLabel(value: string | Date | null | undefined, toDayKey: ToDayKey, weekdays: string[]): string {
  const key = dayKeyOf(value ?? null, toDayKey);
  return key ? `${clockOf(value ?? null)} ${formatDayLabel(key, weekdays)}` : '';
}
