'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { publicBookingApi } from '@rentalshop/utils';
import type { Product } from '@rentalshop/types';
import { catalogShowsPrices, formatShopMoney, productPriceLines } from '../lib/public-shop';
import {
  calendarMonth,
  formatShortDay,
  monthLabel,
  monthOf,
  monthRange,
  nightsBetween,
  pickRange,
  rangeStockNotes,
  shiftMonth,
  stockByDate,
  stockLevel,
  weekdayLabels,
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
  showPublicPrice?: boolean;
  /** #1646: the shop shows units left (or Hết) under each day */
  showStock?: boolean;
}

/** #1124 mockup screen 2 — branch, month calendar, quantity, estimate, "Thêm vào yêu cầu". #1174 no Còn/Hết. */
export function BookingPicker({ tenantKey, product, outlets, currency, todayKey, draft, onAdd, showPublicPrice, showStock = false }: BookingPickerProps) {
  const t = useTranslations('products.public.booking');
  const tp = useTranslations('products.public');
  const locale = useLocale();
  const accepting = outlets.filter((o) => o.acceptsOnlineBooking);
  const [outletId, setOutletId] = useState<number>(
    accepting.some((o) => o.id === draft.outletId) ? (draft.outletId as number) : accepting[0]?.id
  );
  const [month, setMonth] = useState(monthOf(draft.pickupDate && draft.pickupDate >= todayKey ? draft.pickupDate : todayKey));
  const [range, setRange] = useState<DateRange>(
    draft.pickupDate && draft.returnDate && draft.pickupDate >= todayKey ? { pickup: draft.pickupDate, return: draft.returnDate } : { pickup: null, return: null }
  );
  const [quantity, setQuantity] = useState(1);
  // #1646: units left per day, by "outlet:month". A failed call leaves the month without numbers (the calendar still works).
  const [stock, setStock] = useState<Record<string, Map<string, number>>>({});
  const stockKey = `${outletId}:${month}`;

  useEffect(() => {
    if (!showStock || !outletId || stock[stockKey]) return;
    let cancelled = false;
    const { from, to } = monthRange(month);
    void publicBookingApi.availability(tenantKey, { productId: product.id, outletId, from, to }).then((res) => {
      if (cancelled || !res.success || !res.data) return;
      setStock((prev) => ({ ...prev, [stockKey]: stockByDate(res.data!.days ?? []) }));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showStock, outletId, month, tenantKey, product.id]);

  // every month already loaded for this outlet, so a range over two months is checked on both
  const counts = useMemo(() => {
    const merged = new Map<string, number>();
    for (const [key, byDay] of Object.entries(stock)) {
      if (key.startsWith(`${outletId}:`)) byDay.forEach((value, date) => merged.set(date, value));
    }
    return merged;
  }, [stock, outletId]);
  const stockLoaded = showStock && counts.size > 0;

  const grid = useMemo(() => calendarMonth(month, [], todayKey), [month, todayKey]);
  const prices = productPriceLines(product);
  const showPrices = catalogShowsPrices(showPublicPrice);
  const complete = Boolean(range.pickup && range.return);
  const dayCount = complete ? nightsBetween(range.pickup!, range.return!) : 0;
  const estimate = complete && showPrices && prices.main ? quantity * (prices.main.unit === 'day' ? prices.main.amount * dayCount : prices.main.amount) : null;
  const sameAsDraft = draft.items.length > 0;

  const tap = (key: string, state: string) => {
    if (state === 'past') return;
    setRange((r) => pickRange(r, key));
  };

  const notes = stockLoaded && range.pickup && range.return ? rangeStockNotes(counts, range.pickup, range.return, quantity) : null;

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
              {monthLabel(month, locale)}
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
          {weekdayLabels(locale).map((w) => (
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
            const disabled = d.state === 'past';
            const left = stockLoaded && !disabled ? counts.get(d.date) : undefined;
            const level = left === undefined ? null : stockLevel(left);
            return (
              <button
                key={d.date}
                type="button"
                data-date={d.date}
                data-state={d.state}
                disabled={disabled}
                onClick={() => tap(d.date, d.state)}
                data-stock={level ?? undefined}
                className={`${showStock ? 'flex h-11 flex-col items-center justify-center leading-tight' : 'h-9'} rounded-lg ${
                  edge
                    ? 'bg-blue-700 font-bold text-white'
                    : selected
                      ? 'bg-blue-100 text-blue-800'
                      : level === 'low'
                        ? 'bg-amber-100 text-slate-900'
                        : level === 'full'
                          ? 'bg-slate-100 text-slate-400'
                          : d.state === 'free'
                            ? 'text-slate-900 hover:bg-slate-100'
                            : 'text-slate-300'
                } ${d.today && !edge ? 'ring-1 ring-slate-300' : ''}`}
              >
                <span className={level === 'full' && !edge ? 'line-through' : undefined}>{d.day}</span>
                {level && (
                  <span
                    className={`text-[10.5px] font-bold ${
                      edge ? 'text-white' : level === 'full' ? 'font-semibold text-slate-400' : level === 'low' ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {level === 'full' ? t('stockFull') : left}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-3 text-[11.5px] text-slate-500">
          <span>
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-700 align-middle" />
            {t('legendSelected')}
          </span>
          {stockLoaded && (
            <>
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-emerald-600 bg-emerald-50 align-middle" />
                {t('stockLegend')}
              </span>
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-amber-500 bg-amber-100 align-middle" />
                {t('stockLow')}
              </span>
              <span>
                <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm border border-slate-300 bg-slate-100 align-middle" />
                {t('stockFull')}
              </span>
            </>
          )}
        </div>
        {notes && notes.fullDays.length > 0 && (
          <p role="status" data-testid="booking-stock-full" className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-[12.5px] text-orange-800">
            {t('stockFullWarn', { days: notes.fullDays.map((k) => formatShortDay(k, locale)).join(', ') })}
          </p>
        )}
        {notes && notes.short && (
          <p role="status" data-testid="booking-stock-short" className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-[12.5px] text-orange-800">
            {t('stockShortWarn', { date: formatShortDay(notes.short.date, locale), count: notes.short.available, quantity })}
          </p>
        )}
        {!complete && <p className="mt-1 text-[13px] text-slate-500">{t('pickHint')}</p>}
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
              {t('estimate')} <b className="text-slate-900">{formatShopMoney(estimate, currency, locale)}</b>
            </>
          )}
          {!showPrices && (
            <>
              {' · '}
              <b className="text-slate-900">{tp('priceHidden')}</b>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!complete || !outletId}
        onClick={() => onAdd({ outletId, pickupDate: range.pickup!, returnDate: range.return! }, quantity)}
        className="h-12 rounded-xl bg-blue-700 text-[15px] font-bold text-white disabled:opacity-40"
      >
        {t('addToRequest')}
      </button>
    </div>
  );
}
