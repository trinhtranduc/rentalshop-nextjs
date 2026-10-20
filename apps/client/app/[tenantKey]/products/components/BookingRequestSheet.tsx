'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { publicBookingApi } from '@rentalshop/utils';
import { formatShopMoney } from '../lib/public-shop';
import {
  bookingErrorKey,
  formatDayKey,
  nightsBetween,
  validateBookingForm,
  type BookingRequestDraft,
  type FormErrorKey,
} from '../lib/booking';
import type { BookingOutlet } from './BookingPicker';

interface BookingRequestSheetProps {
  tenantKey: string;
  draft: BookingRequestDraft;
  outlets: BookingOutlet[];
  currency?: string | null;
  onRemove: (productId: number) => void;
  onSent: () => void;
  onClose: () => void;
}

/** #1124 mockup screen 3 — the items of the request, name, phone, note, hidden honeypot, "Gửi yêu cầu" */
export function BookingRequestSheet({ tenantKey, draft, outlets, currency, onRemove, onSent, onClose }: BookingRequestSheetProps) {
  const t = useTranslations('products.public.booking');
  const locale = useLocale();
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'name' | 'phone' | 'note', FormErrorKey>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const outlet = outlets.find((o) => o.id === draft.outletId);
  const days = draft.pickupDate && draft.returnDate ? nightsBetween(draft.pickupDate, draft.returnDate) : 0;
  const lineTotal = (i: BookingRequestDraft['items'][number]) =>
    i.unitPrice == null ? null : i.quantity * i.unitPrice * (i.perDay ? days : 1);
  const totals = draft.items.map(lineTotal);
  const total = totals.every((v) => v != null) ? (totals as number[]).reduce((a, b) => a + b, 0) : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFailure(null);
    const checked = validateBookingForm({ name, phone, note });
    if (!checked.ok) {
      setErrors(checked.errors);
      return;
    }
    setErrors({});
    if (!draft.outletId || !draft.pickupDate || !draft.returnDate || draft.items.length === 0) return;
    setSending(true);
    const res = await publicBookingApi.createRequest(tenantKey, {
      outletId: draft.outletId,
      pickupDate: draft.pickupDate,
      returnDate: draft.returnDate,
      items: draft.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      name: checked.value.name,
      phone: checked.value.phone,
      note: checked.value.note || undefined,
      website,
    });
    setSending(false);
    if (res.success && res.data && 'code' in res.data) {
      onSent();
      router.push(`/${tenantKey}/booking/${res.data.code}`);
      return;
    }
    const key = bookingErrorKey(res.code);
    if (key === 'errorFull' && res.data && 'date' in res.data) {
      const full = res.data;
      const item = draft.items.find((i) => i.productId === full.productId);
      setFailure(item ? t('errorFull', { name: item.name, date: formatDayKey(full.date, locale) }) : t('errorFullNoName', { date: formatDayKey(full.date, locale) }));
    } else if (key === 'phoneInvalid') setErrors({ phone: 'phoneInvalid' });
    else setFailure(t(key));
  };

  const field = 'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] outline-none focus:border-blue-700';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-6" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={t('requestTitle')}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
        data-testid="booking-request-sheet"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5">
          <button type="button" onClick={onClose} aria-label="‹" className="flex h-10 w-10 items-center justify-center rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <b className="text-[17px]">{t('requestTitle')}</b>
        </div>
        <div className="flex flex-col gap-3 overflow-y-auto p-4">
          <div className="text-[13px] text-slate-600">
            {outlet?.name}
            {draft.pickupDate && draft.returnDate && (
              <>
                {' · '}
                {formatDayKey(draft.pickupDate, locale)} → {formatDayKey(draft.returnDate, locale)} · {t('days', { count: days })}
              </>
            )}
          </div>
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {draft.items.map((i, idx) => (
              <div key={i.productId} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium text-slate-900">{i.name}</div>
                  <div className="text-[13px] text-slate-500">× {i.quantity}</div>
                </div>
                {totals[idx] != null && <b className="text-[15px]">{formatShopMoney(totals[idx]!, currency, locale)}</b>}
                <button type="button" onClick={() => onRemove(i.productId)} className="text-[13px] font-semibold text-red-700">
                  {t('remove')}
                </button>
              </div>
            ))}
          </div>
          {total != null && (
            <div className="flex justify-between text-[15px]">
              <span className="text-slate-600">{t('total')}</span>
              <b>{formatShopMoney(total, currency, locale)}</b>
            </div>
          )}

          <label className="flex flex-col gap-1 text-[13px] font-semibold text-slate-600">
            {t('name')}
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" name="name" />
            {errors.name && <span className="font-normal text-red-700">{t(errors.name)}</span>}
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-slate-600">
            {t('phone')} *
            <input
              className={field}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              name="phone"
            />
            {errors.phone && <span className="font-normal text-red-700">{t(errors.phone)}</span>}
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-semibold text-slate-600">
            {t('note')}
            <textarea
              className={field}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('notePlaceholder')}
              name="note"
            />
            {errors.note && <span className="font-normal text-red-700">{t(errors.note)}</span>}
          </label>
          {/* Honeypot: people never see it; a bot that fills every field is ignored by the API */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="absolute -left-[10000px] h-px w-px opacity-0"
          />
          {failure && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[13.5px] text-red-800">
              {failure}
            </p>
          )}
          <p className="text-[12.5px] text-slate-500">{t('notOrderYet')}</p>
        </div>
        <div className="border-t border-slate-200 px-4 pb-5 pt-3">
          <button
            type="submit"
            disabled={sending || draft.items.length === 0}
            className="h-12 w-full rounded-xl bg-blue-700 text-[15px] font-bold text-white disabled:opacity-40"
          >
            {sending ? t('sending') : t('send')}
          </button>
        </div>
      </form>
    </div>
  );
}
