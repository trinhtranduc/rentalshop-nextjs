'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { publicBookingApi, type PublicBookingRequest } from '@rentalshop/utils';
import { telLink, zaloLink } from '../../products/lib/public-shop';
import { bookingErrorKey, formatDayKey, formatShopTime, nightsBetween, trackingView } from '../../products/lib/booking';

const STEP_KEY: Record<string, string> = {
  sent: 'stepSent',
  waiting: 'stepWaiting',
  confirmed: 'stepConfirmed',
  rejected: 'stepRejected',
  expired: 'stepExpired',
  cancelled: 'stepCancelled',
};

/** #1124 mockup screen 4 — code, steps, days, branch, items, estimate, Gọi / Zalo */
export function BookingTracking({ tenantKey, code }: { tenantKey: string; code: string }) {
  const t = useTranslations('products.public.booking');
  const tp = useTranslations('products.public');
  const locale = useLocale();
  const shopTime = (iso: string) => formatShopTime(iso, locale);
  const [request, setRequest] = useState<PublicBookingRequest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await publicBookingApi.getRequest(tenantKey, code);
    setLoading(false);
    if (res.success && res.data) {
      setRequest(res.data);
      setError(null);
    } else setError(bookingErrorKey(res.code));
  }, [tenantKey, code]);

  useEffect(() => {
    load();
  }, [load]);

  const view = request ? trackingView(request) : null;
  const phone = request?.outlet?.phone || request?.shop.phone || null;
  const tel = telLink(phone);
  const zalo = zaloLink(phone);
  const days = request ? nightsBetween(request.pickupDate, request.returnDate) : 0;
  const tone = { ok: 'bg-emerald-50 text-emerald-800', bad: 'bg-red-50 text-red-800', wait: 'bg-amber-50 text-amber-900', muted: 'bg-slate-100 text-slate-700' };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6" data-testid="booking-tracking">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-slate-900">{request?.shop.name || t('trackTitle')}</h1>
          <button type="button" onClick={load} aria-label={t('refresh')} className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && !request && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-800">
            {t(error)}
          </p>
        )}

        {request && view && (
          <>
            <section className="rounded-2xl bg-white p-4 text-center shadow-sm">
              <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${view.tone === 'ok' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                <Check className="h-6 w-6" />
              </div>
              <div className="text-[13px] text-slate-500">{t('code')}</div>
              <div className="text-2xl font-extrabold tracking-[0.12em] text-slate-900" data-testid="booking-code">
                {request.code}
              </div>
              <div className={`mt-3 rounded-xl px-3 py-2 text-[15px] font-bold ${tone[view.tone as keyof typeof tone]}`} data-testid="booking-status">
                {t(STEP_KEY[view.current])}
                {view.orderNumber && <span className="block text-sm font-semibold">{t('confirmedOrder', { number: view.orderNumber })}</span>}
                {view.reasonKey && <span className="block text-sm font-normal">{t(view.reasonKey)}</span>}
                {request.rejectNote && <span className="block text-sm font-normal">{request.rejectNote}</span>}
              </div>
              {view.current === 'waiting' && <p className="mt-2 text-[13px] text-slate-600">{t('waitingUntil', { time: shopTime(request.expiresAt) })}</p>}
              {view.current === 'expired' && <p className="mt-2 text-[13px] text-slate-600">{t('expiredNote')}</p>}
            </section>

            <ol className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-[14px] shadow-sm">
              {view.steps.map((step) => {
                const index = view.steps.indexOf(step);
                const reached = index <= view.steps.indexOf(view.current);
                return (
                  <li key={step} className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 flex-none rounded-full border-2 ${reached ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`} />
                    <span className={reached ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                      {t(STEP_KEY[step])}
                      {step === 'sent' && ` · ${shopTime(request.createdAt)}`}
                    </span>
                  </li>
                );
              })}
            </ol>

            <section className="flex flex-col gap-2 rounded-2xl bg-white p-4 text-[14px] shadow-sm">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">{t('dates')}</span>
                <span className="text-right">
                  {formatDayKey(request.pickupDate, locale)} → {formatDayKey(request.returnDate, locale)} · {t('days', { count: days })}
                </span>
              </div>
              {request.outlet && (
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">{t('outlet')}</span>
                  <span className="text-right">{request.outlet.name}</span>
                </div>
              )}
              <div className="mt-1 divide-y divide-slate-100 border-t border-slate-100">
                {request.items.map((i) => (
                  <div key={i.productId} className="py-2">
                    {i.productName} × {i.quantity}
                  </div>
                ))}
              </div>
            </section>

            {(tel || zalo) && (
              <div className="flex gap-2.5">
                {tel && (
                  <a href={tel} className="flex h-12 flex-1 items-center justify-center rounded-xl border-[1.5px] border-slate-200 bg-white text-[15px] font-bold text-slate-900">
                    {tp('callShop')}
                  </a>
                )}
                {zalo && (
                  <a href={zalo} target="_blank" rel="noopener noreferrer" className="flex h-12 flex-1 items-center justify-center rounded-xl border-[1.5px] border-slate-200 bg-white text-[15px] font-bold text-slate-900">
                    {tp('zalo')}
                  </a>
                )}
              </div>
            )}
            <p className="text-center text-[12.5px] text-slate-500">{t('saveLink')}</p>
          </>
        )}

        <Link href={`/${tenantKey}/products`} className="text-center text-sm font-semibold text-blue-700">
          {t('backToShop')}
        </Link>
      </main>
    </div>
  );
}
