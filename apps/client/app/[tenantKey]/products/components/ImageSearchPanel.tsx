'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { AiSearchTile } from './AiSearchIcon';
import { useTranslations } from 'next-intl';
import { publicImageSearchApi, type PublicImageSearchProduct } from '@rentalshop/utils';
import { formatShopMoney, productPriceLines, telLink, zaloLink } from '../lib/public-shop';
import { checkPickedImage, downscaleForSearch, imageSearchView, similarityPercent, type ImageSearchView } from '../lib/image-search';

interface ImageSearchPanelProps {
  tenantKey: string;
  currency?: string | null;
  phone?: string | null;
  /** Opens the product sheet (with "Đặt thuê" when the shop takes online requests) */
  onOpen: (product: PublicImageSearchProduct) => void;
  /** The camera button in the search bar asks the panel to pick a photo */
  pickSignal: number;
}

/**
 * #1128 (mockup "AI tìm bằng ảnh: giới thiệu", B) — "Có ảnh mẫu? Tìm đồ giống bằng AI" above the grid: pick or drop a
 * photo (phone: camera or library), it is downscaled to 1024 px in the browser, and the shop's 10 most similar
 * products show right here with % similarity and today's stock. The photo is not stored.
 */
export function ImageSearchPanel({ tenantKey, currency, phone, onOpen, pickSignal }: ImageSearchPanelProps) {
  const t = useTranslations('products.public.imageSearch');
  const tp = useTranslations('products.public');
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [view, setView] = useState<ImageSearchView>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const money = (amount: number) => formatShopMoney(amount, currency);

  useEffect(() => {
    if (pickSignal > 0) input.current?.click();
  }, [pickSignal]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const search = async (file: File) => {
    const problem = checkPickedImage(file);
    if (problem) {
      setView({ kind: 'error', messageKey: problem });
      return;
    }
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    setView({ kind: 'idle' });
    const image = await downscaleForSearch(file);
    const result = await publicImageSearchApi.search(tenantKey, image, image === file ? file.name || 'photo.jpg' : 'photo.jpg');
    setView(imageSearchView(result));
    setBusy(false);
  };

  const close = () => {
    setPreview(null);
    setView({ kind: 'idle' });
  };

  const tel = telLink(phone);
  const zalo = zaloLink(phone);

  return (
    <section aria-label={t('title')} className="mb-4" data-testid="image-search">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void search(file);
        }}
        className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 sm:gap-4 sm:px-4 ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50'
        }`}
      >
        <AiSearchTile />
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-slate-900 sm:text-base">{t('title')}</div>
          <p className="text-[13px] text-slate-600">
            <span className="hidden sm:inline">{t('hintDesktop')}</span>
            <span className="sm:hidden">{t('hintMobile')}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex h-10 flex-none items-center gap-1.5 rounded-xl bg-blue-700 px-3 text-sm font-bold text-white disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          {t('choose')}
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          data-testid="image-search-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void search(file);
          }}
        />
      </div>

      {(preview || view.kind !== 'idle') && (
        <div className="mt-3 rounded-2xl border-2 border-emerald-500 bg-white p-3 sm:p-4" data-testid="image-search-results">
          <div className="flex items-start gap-3">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={t('yourPhoto')} className="h-20 w-20 flex-none rounded-xl object-cover sm:h-24 sm:w-24" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-bold text-slate-900">
                {busy ? t('searching') : view.kind === 'results' ? t('resultsTitle', { count: view.products.length }) : t('yourPhoto')}
              </div>
              {busy && <Loader2 className="mt-2 h-5 w-5 animate-spin text-blue-700" aria-hidden />}
              {!busy && view.kind === 'error' && <p className="mt-1 text-sm text-red-700">{t(view.messageKey)}</p>}
              {!busy && view.kind === 'empty' && <p className="mt-1 text-sm text-slate-600">{t('empty')}</p>}
              {!busy && (view.kind === 'empty' || view.kind === 'error') && (tel || zalo) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {zalo && (
                    <a href={zalo} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">
                      {t('sendZalo')}
                    </a>
                  )}
                  {tel && (
                    <a href={tel} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900">
                      {tp('callShop')}
                    </a>
                  )}
                </div>
              )}
            </div>
            <button type="button" onClick={close} aria-label={tp('close')} className="flex-none rounded-lg p-1 text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!busy && view.kind === 'results' && (
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {view.products.map((product) => {
                const main = productPriceLines(product as any).main;
                const inStock = (product.available ?? 0) > 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => onOpen(product)}
                    className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left hover:shadow-md"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
                      {product.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.images[0]} alt={product.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                      )}
                      <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
                        {t('similar', { percent: similarityPercent(product.similarity) })}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 px-2 pb-2 pt-1.5">
                      <div className="text-[13px] font-bold leading-snug text-slate-900">{product.name}</div>
                      {main && (
                        <div className="text-[13px] font-extrabold text-blue-700">
                          {money(main.amount)} <span className="font-semibold text-slate-600">{main.unit === 'day' ? tp('perDay') : tp('perRent')}</span>
                        </div>
                      )}
                      <div className={`text-[12px] font-semibold ${inStock ? 'text-emerald-700' : 'text-red-700'}`}>
                        ● {inStock ? t('inStockToday') : t('outToday')}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
