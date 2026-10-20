'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { publicBookingApi, type PublicBookingDay } from '@rentalshop/utils';
import type { Product } from '@rentalshop/types';
import { formatShopMoney, productPriceLines } from '../lib/public-shop';
import {
  calendarMonth,
  monthOf,
  monthRange,
  nightsBetween,
  pickRange,
  rangeIsFree,
  shiftMonth,
  type BookingRequestDraft,
  type DateRange,
} from '../lib/booking';

export interface BookingOutlet {
  id: number;
  name: string;
  acceptsOnlineBooking?: boolean;
}

interface BookingPickerProps {
  tenantKey: string;
  product: Product;
  outlets: BookingOutlet[];
  currency?: string | null;
  todayKey: string;
  /** The request already in the browser: its outlet and days are suggested (one range for the whole request) */
  draft: BookingRequestDraft;
  onAdd: (where: { outletId: number; pickupDate: string; returnDate: string }, quantity: number) => void;
}

const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** #1124 mockup screen 2 — branch, a free/full month calendar, quantity, estimate, "Thêm vào yêu cầu" */
export function BookingPicker({ tenantKey, product, outlets, currency, todayKey, draft, onAdd }: BookingPickerProps) {
  const t = useTranslations('products.public.booking');
  const english = useLocale() !== 'vi';
  const accepting = outlets.filter((o) => o.acceptsOnlineBooking);
  const [outletId, setOutletId] = useState<number>(
    accepting.some((o) => o.id === draft.outletId) ? (draft.outletId as number) : accepting[0]?.id
  );
  const [month, setMonth] = useState(monthOf(draft.pickupDate && draft.pickupDate >= todayKey ? draft.pickupDate : todayKey));
  const [range, setRange] = useState<DateRange>(
    draft.pickupDate && draft.returnDate && draft.pickupDate >= todayKey ? { pickup: draft.pickupDate, return: draft.returnDate } : { pickup: null, return: null }
  );
  const [days, setDays] = useState<PublicBookingDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!outletId) return;
    let active = true;
    const { from, to } = monthRange(month);
    setLoading(true);
    setFailed(false);
    publicBookingApi.availability(tenantKey, { productId: product.id, outletId, from, to }).then((res) => {
      if (!active) return;
      setLoading(false);
      if (res.success && res.data) {
        const incoming = res.data.days;
        // Keep the other months already seen so a range across two months can be checked
        setDays((prev) => [...prev.filter((d) => !incoming.some((n) => n.date === d.date)), ...incoming]);
      } else setFailed(true);
    });
    return () => {
      active = false;
    };
  }, [tenantKey, product.id, outletId, month]);

  // A new branch: the days seen belong to the old one
  useEffect(() => setDays([]), [outletId]);

  const grid = useMemo(() => calendarMonth(month, days, todayKey), [month, days, todayKey]);
  const prices = productPriceLines(product);
  const complete = range.pickup && range.return;
  const free = complete ? rangeIsFree(days, range.pickup!, range.return!) : false;
  const dayCount = complete ? nightsBetween(range.pickup!, range.return!) : 0;
  const estimate = complete && prices.main ? quantity * (prices.main.unit === 'day' ? prices.main.amount * dayCount : prices.main.amount) : null;
  const sameAsDraft = draft.items.length > 0;

  const tap = (key: string, state: string) => {
    if (state === 'past' || state === 'full' || state === 'unknown') return;
    setRange((r) => pickRange(r, key));
  };

  const inRange = (key: string) => range.pickup && (range.return ? key >= range.pickup && key <= range.return : key === range.pickup);

  return (
    <div className="flex flex-col gap-3" data-testid="booking-picker">
      {accepting.length > 1 && (
        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-slate-600">{t('outlet')}</div>
          <div className="flex flex-wrap gap-2">
            {accepting.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setOutletId(o.id);
                  setRange({ pickup: null, return: null });
                }}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  o.id === outletId ? 'border-blue-700 bg-blue-50 font-bold text-blue-700' : 'border-slate-300 text-slate-900'
                }`}
              >
                {o.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-slate-600">{t('dates')}</span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              aria-label={t('prevMonth')}
              disabled={month <= monthOf(todayKey)}
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[72px] text-center text-sm font-semibold text-slate-900">
              {month.slice(5)}/{month.slice(0, 4)}
            </span>
            <button
              type="button"
              aria-label={t('nextMonth')}
              disabled={month >= shiftMonth(monthOf(todayKey), 11)}
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[13px]">
          {(english ? WEEKDAYS_EN : WEEKDAYS_VI).map((w) => (
            <span key={w} className="text-[11px] text-slate-400">
              {w}
            </span>
          ))}
          {Array.from({ length: grid.leadingBlanks }).map((_, i) => (
            <span key={`b${i}`} />
          ))}
          {grid.days.map((d) => {
            const selected = inRange(d.date);
            const edge = d.date === range.pickup || d.date === range.return;
            const disabled = d.state !== 'free';
            return (
              <button
                key={d.date}
                type="button"
                data-date={d.date}
                data-state={d.state}
                disabled={disabled}
                onClick={() => tap(d.date, d.state)}
                className={`h-9 rounded-lg ${
                  edge
                    ? 'bg-blue-700 font-bold text-white'
                    : selected
                      ? 'bg-blue-100 text-blue-800'
                      : d.state === 'full'
                        ? 'text-slate-300 line-through'
                        : d.state === 'free'
                          ? 'text-slate-900 hover:bg-slate-100'
                          : 'text-slate-300'
                } ${d.today && !edge ? 'ring-1 ring-slate-300' : ''}`}
              >
                {d.day}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-3 text-[11.5px] text-slate-500">
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-700 align-middle" />
            {t('legendSelected')}
          </span>
          <span>
            <span className="mr-1 text-slate-300 line-through">8</span>
            {t('legendFull')}
          </span>
          {loading && <span>{t('loadingDays')}</span>}
        </div>
        {failed && <p className="mt-1 text-[13px] text-red-700">{t('daysError')}</p>}
        {!complete && <p className="mt-1 text-[13px] text-slate-500">{t('pickHint')}</p>}
        {complete && !free && <p className="mt-1 text-[13px] text-red-700">{t('rangeFull')}</p>}
        {sameAsDraft && <p className="mt-1 text-[12.5px] text-slate-500">{t('sameRange')}</p>}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-600">{t('quantity')}</span>
        <span className="inline-flex h-10 items-center rounded-full border border-slate-300">
          <button
            type="button"
            aria-label="−"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center text-blue-700"
          >
            <Minus className="h-4 w-4" />
          </button>
          <b className="min-w-[24px] text-center font-medium" data-testid="booking-qty">
            {quantity}
          </b>
          <button
            type="button"
            aria-label="+"
            onClick={() => setQuantity((q) => Math.min(50, q + 1))}
            className="flex h-10 w-10 items-center justify-center text-blue-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </span>
      </div>

      {complete && (
        <div className="text-sm text-slate-700">
          {t('days', { count: dayCount })}
          {estimate != null && (
            <>
              {' · '}
              {t('estimate')} <b className="text-slate-900">{formatShopMoney(estimate, currency)}</b>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!complete || !free || !outletId}
        onClick={() => onAdd({ outletId, pickupDate: range.pickup!, returnDate: range.return! }, quantity)}
        className="h-12 rounded-xl bg-blue-700 text-[15px] font-bold text-white disabled:opacity-40"
      >
        {t('addToRequest')}
      </button>
    </div>
  );
}
