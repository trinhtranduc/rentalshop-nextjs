'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { Pagination } from '@rentalshop/ui';
import type { Product, Category } from '@rentalshop/types';
import { useTranslations } from 'next-intl';
import { formatShopMoney, productPriceLines } from '../lib/public-shop';
import { PublicProductSheet } from './PublicProductSheet';

interface PublicProductGridProps {
  products: Product[];
  categories: Category[];
  currency?: string | null;
  phone?: string | null;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/** #665 — search, category chips, product cards and the detail sheet */
export function PublicProductGrid({ products, categories, currency, phone, pagination }: PublicProductGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations('products');
  const tp = useTranslations('products.public');
  const money = (amount: number) => formatShopMoney(amount, currency);

  const currentCategoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!, 10) : null;
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const [query, setQuery] = useState(currentSearch);
  const [opened, setOpened] = useState<Product | null>(null);

  const updateFilters = useCallback(
    (updates: { categoryId?: number | null; search?: string; page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.categoryId !== undefined) {
        if (updates.categoryId) params.set('categoryId', String(updates.categoryId));
        else params.delete('categoryId');
      }
      if (updates.search !== undefined) {
        if (updates.search) params.set('search', updates.search);
        else params.delete('search');
      }
      if (updates.page !== undefined) {
        if (updates.page > 1) params.set('page', String(updates.page));
        else params.delete('page');
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Search once typing stops
  useEffect(() => {
    if (query.trim() === currentSearch) return;
    const timer = setTimeout(() => updateFilters({ search: query.trim(), page: 1 }), 400);
    return () => clearTimeout(timer);
  }, [query, currentSearch, updateFilters]);

  const categoryName = (product: Product) => {
    const id = product.categoryId || product.category?.id;
    return categories.find((c) => c.id === id)?.name || product.category?.name;
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;
  const filtered = Boolean(currentSearch || currentCategoryId);
  const chip = (active: boolean) =>
    `inline-flex h-9 flex-none items-center whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold ${
      active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 sm:px-5">
      <div className="sticky top-0 z-10 bg-slate-50 pb-2.5 pt-4">
        <label className="flex h-[46px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5">
          <Search className="h-[18px] w-[18px] flex-none text-slate-500" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tp('searchPlaceholder')}
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-500"
          />
        </label>
        {categories.length > 0 && (
          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <button type="button" className={chip(!currentCategoryId)} onClick={() => updateFilters({ categoryId: null, page: 1 })}>
              {tp('all')}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={chip(currentCategoryId === c.id)}
                onClick={() => updateFilters({ categoryId: c.id, page: 1 })}
              >
                {c.name || t('uncategorized')}
              </button>
            ))}
          </div>
        )}
      </div>

      {pagination && pagination.total > 0 && (
        <div className="mb-3 mt-1.5 text-[13px] text-slate-600">{tp('count', { count: pagination.total })}</div>
      )}

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 pb-10 sm:gap-[18px] md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const prices = productPriceLines(product);
              const image = product.images?.[0];
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => setOpened(product)}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-100">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={product.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">{tp('noPhoto')}</div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 px-2.5 pb-3 pt-2.5 sm:px-3.5 sm:pb-3.5 sm:pt-3">
                    <div className="text-sm font-bold leading-snug text-slate-900 sm:text-[15px]">{product.name}</div>
                    {prices.main && (
                      <div className="text-[15px] font-extrabold text-blue-700 sm:text-[17px]">
                        {money(prices.main.amount)}{' '}
                        <span className="text-[13px] font-semibold text-slate-600">
                          {prices.main.unit === 'day' ? tp('perDay') : tp('perRent')}
                        </span>
                      </div>
                    )}
                    {prices.daily != null && (
                      <div className="text-[13px] font-semibold text-slate-900">{tp('orDaily', { price: money(prices.daily) })}</div>
                    )}
                    {prices.sale != null && (
                      <div className="text-[13px] text-slate-600">{tp('sale', { price: money(prices.sale) })}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {pagination && totalPages > 1 && (
            <div className="pb-10">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={(page: number) => {
                  updateFilters({ page });
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                itemName={t('productsPlural')}
              />
            </div>
          )}
        </>
      ) : (
        <div className="py-16 text-center">
          <h3 className="mb-2 text-lg font-semibold text-slate-900">{filtered ? t('noProductsFound') : t('noProducts')}</h3>
          <p className="text-slate-500">{filtered ? t('tryDifferentSearch') : t('checkBackLater')}</p>
          {filtered && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                updateFilters({ categoryId: null, search: '', page: 1 });
              }}
              className="mt-4 h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900"
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
      )}

      {opened && (
        <PublicProductSheet
          product={opened}
          categoryName={categoryName(opened)}
          currency={currency}
          phone={phone}
          onClose={() => setOpened(null)}
        />
      )}
    </main>
  );
}
