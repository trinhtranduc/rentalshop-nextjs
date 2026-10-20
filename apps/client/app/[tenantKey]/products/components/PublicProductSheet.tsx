'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Product } from '@rentalshop/types';
import { formatShopMoney, productPriceLines, telLink, zaloLink } from '../lib/public-shop';
import { canBook, type BookingRequestDraft } from '../lib/booking';
import { BookingPicker, type BookingOutlet } from './BookingPicker';

interface PublicProductSheetProps {
  product: Product;
  categoryName?: string;
  currency?: string | null;
  phone?: string | null;
  onClose: () => void;
  /** #1124: online booking of the shop; absent or off → Gọi / Zalo only, as before */
  booking?: {
    tenantKey: string;
    enabled: boolean;
    outlets: BookingOutlet[];
    todayKey: string;
    draft: BookingRequestDraft;
    onAdd: (where: { outletId: number; pickupDate: string; returnDate: string }, quantity: number) => void;
  };
}

/** #665 — product detail: photos, price rows, Gọi shop / Hỏi thuê qua Zalo; #1124 "Đặt thuê" when the shop takes requests */
export function PublicProductSheet({ product, categoryName, currency, phone, onClose, booking }: PublicProductSheetProps) {
  const t = useTranslations('products.public');
  const tb = useTranslations('products.public.booking');
  const [picking, setPicking] = useState(false);
  const money = (amount: number) => formatShopMoney(amount, currency);
  const prices = productPriceLines(product);
  const images = (product.images || []).filter(Boolean);
  const [photo, setPhoto] = useState(0);
  const tel = telLink(phone);
  const zalo = zaloLink(phone);

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

  const bookable = Boolean(booking && canBook({ onlineBooking: booking.enabled, outlets: booking.outlets, hasRentPrice: prices.main != null }));
  const rows: { label: string; value: string; accent?: boolean }[] = [];
  if (prices.main?.unit === 'rent') rows.push({ label: t('rentFixed'), value: money(prices.main.amount), accent: true });
  const daily = prices.main?.unit === 'day' ? prices.main.amount : prices.daily;
  if (daily != null)
    rows.push({ label: t('rentDaily'), value: `${money(daily)} ${t('perDay')}`, accent: prices.main?.unit === 'day' });
  if (prices.deposit != null) rows.push({ label: t('deposit'), value: money(prices.deposit) });
  if (prices.sale != null) rows.push({ label: t('buy'), value: money(prices.sale) });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white sm:max-h-[90vh] sm:max-w-3xl sm:flex-row sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full flex-none bg-slate-100 sm:w-[46%]">
          <div
            className="flex aspect-[3/4] max-h-[60dvh] w-full snap-x snap-mandatory overflow-x-auto sm:max-h-none"
            onScroll={(e) => {
              const el = e.currentTarget;
              setPhoto(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
            }}
          >
            {images.length > 0 ? (
              images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={product.name} className="h-full w-full flex-none snap-center object-cover" />
              ))
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">{t('noPhoto')}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="absolute left-3.5 top-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow"
          >
            <ChevronLeft className="h-5 w-5 text-slate-900" />
          </button>
          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <span key={i} className={`h-[7px] w-[7px] rounded-full ${i === photo ? 'bg-white' : 'bg-white/60'}`} />
              ))}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-3 overflow-y-auto p-4 sm:p-6">
            {categoryName && <div className="text-[13px] text-slate-600">{categoryName}</div>}
            <h2 className="text-[21px] font-extrabold leading-tight text-slate-900">{product.name}</h2>
            {rows.length > 0 && (
              <div className="overflow-hidden rounded-[14px] border border-slate-200">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-3 border-b border-slate-200 px-3.5 py-3 text-[15px] last:border-b-0"
                  >
                    <span className="text-slate-700">{row.label}</span>
                    <b className={`font-extrabold ${row.accent ? 'text-blue-700' : 'text-slate-900'}`}>{row.value}</b>
                  </div>
                ))}
              </div>
            )}
            {picking && booking ? (
              <BookingPicker
                tenantKey={booking.tenantKey}
                product={product}
                outlets={booking.outlets}
                currency={currency}
                todayKey={booking.todayKey}
                draft={booking.draft}
                onAdd={(where, quantity) => {
                  booking.onAdd(where, quantity);
                  onClose();
                }}
              />
            ) : (
              <>
                {product.description && <p className="whitespace-pre-line text-sm text-slate-700">{product.description}</p>}
                {!bookable && <p className="text-[13px] text-slate-600">{t('askNote')}</p>}
              </>
            )}
          </div>
          {bookable && !picking && (
            <div className="border-t border-slate-200 px-4 pt-3 sm:px-6">
              <button
                type="button"
                onClick={() => setPicking(true)}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-700 text-[15px] font-bold text-white"
                data-testid="booking-start"
              >
                {tb('book')}
              </button>
            </div>
          )}
          {(tel || zalo) && (
            <div className={`mt-auto flex gap-2.5 px-4 pb-5 pt-3 sm:px-6 ${bookable ? '' : 'border-t border-slate-200'}`}>
              {tel && (
                <a
                  href={tel}
                  className="flex h-12 flex-1 items-center justify-center rounded-xl border-[1.5px] border-slate-200 text-[15px] font-bold text-slate-900"
                >
                  {t('callShop')}
                </a>
              )}
              {zalo && (
                <a
                  href={zalo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    bookable
                      ? 'flex h-12 flex-1 items-center justify-center rounded-xl border-[1.5px] border-slate-200 text-[15px] font-bold text-slate-900'
                      : 'flex h-12 flex-[2] items-center justify-center rounded-xl bg-blue-700 text-[15px] font-bold text-white'
                  }
                >
                  {t('askZalo')}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
