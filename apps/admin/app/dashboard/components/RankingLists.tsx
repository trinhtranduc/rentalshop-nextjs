'use client';

import React from 'react';
import { Button, useFormatCurrency } from '@rentalshop/ui';
import { useDashboardTranslations } from '@rentalshop/hooks';
import type { TopOutlet, TopProduct } from '@rentalshop/types';
import { Package, Store } from 'lucide-react';
import type { RankingSortBy } from '../ranking-period';

export function RankingPeriodButtons({
  period,
  onChange
}: {
  period: 'today' | 'month' | 'year';
  onChange: (period: 'today' | 'month' | 'year') => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={period === 'today' ? 'default' : 'outline'} onClick={() => onChange('today')} className="px-3 sm:px-4 py-2 text-sm">
        Today
      </Button>
      <Button variant={period === 'month' ? 'default' : 'outline'} onClick={() => onChange('month')} className="px-3 sm:px-4 py-2 text-sm">
        This Month
      </Button>
      <Button variant={period === 'year' ? 'default' : 'outline'} onClick={() => onChange('year')} className="px-3 sm:px-4 py-2 text-sm">
        This Year
      </Button>
    </div>
  );
}

export function RankingSortButtons({
  sortBy,
  onChange
}: {
  sortBy: RankingSortBy;
  onChange: (sortBy: RankingSortBy) => void;
}) {
  const tDashboard = useDashboardTranslations();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant={sortBy === 'revenue' ? 'default' : 'outline'} onClick={() => onChange('revenue')} className="px-3 py-2 text-sm">
        {tDashboard('charts.sortByRevenue')}
      </Button>
      <Button variant={sortBy === 'quantity' ? 'default' : 'outline'} onClick={() => onChange('quantity')} className="px-3 py-2 text-sm">
        {tDashboard('charts.sortByQuantity')}
      </Button>
    </div>
  );
}

export function TopShopRow({
  shop,
  rank,
  onClick
}: {
  shop: TopOutlet;
  rank: number;
  onClick: () => void;
}) {
  const tDashboard = useDashboardTranslations();
  const formatMoney = useFormatCurrency();

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-lg bg-gray-50 p-2 text-left transition-colors hover:bg-gray-100 sm:p-3"
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-700 text-sm font-bold text-white">
          {rank}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{shop.name}</div>
          <div className="truncate text-xs text-gray-500">
            {[shop.merchantName, shop.city].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="text-sm font-medium text-gray-900">{formatMoney(shop.totalRevenue || 0)}</div>
        <div className="text-xs text-gray-500">
          {shop.orderCount.toLocaleString()} {tDashboard('charts.ordersCount')}
        </div>
      </div>
    </button>
  );
}

export function TopProductRow({
  product,
  rank,
  sortBy,
  onClick
}: {
  product: TopProduct;
  rank: number;
  sortBy: RankingSortBy;
  onClick: () => void;
}) {
  const tDashboard = useDashboardTranslations();
  const formatMoney = useFormatCurrency();
  const quantity = product.quantity ?? product.rentalCount ?? 0;
  const shopLabel = [product.outletName, product.merchantName].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg bg-gray-50 p-2 text-left transition-colors hover:bg-gray-100 sm:gap-3 sm:p-3"
    >
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-700 text-sm font-bold text-white">
        {rank}
      </div>
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.image}
          alt={product.name}
          className="h-10 w-10 flex-shrink-0 rounded-lg border border-gray-100 bg-gray-50 object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
          <Package className="h-5 w-5 text-blue-700" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{product.name}</div>
        <div className="truncate text-xs text-gray-500">
          {shopLabel || product.category}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        {sortBy === 'quantity' ? (
          <>
            <div className="text-sm font-medium text-gray-900">
              {quantity.toLocaleString()} {tDashboard('charts.quantityCount')}
            </div>
            <div className="text-xs text-gray-500">{formatMoney(product.totalRevenue || 0)}</div>
          </>
        ) : (
          <>
            <div className="text-sm font-medium text-gray-900">{formatMoney(product.totalRevenue || 0)}</div>
            <div className="text-xs text-gray-500">
              {quantity.toLocaleString()} {tDashboard('charts.quantityCount')}
            </div>
          </>
        )}
      </div>
    </button>
  );
}

export function RankingEmptyState({ kind }: { kind: 'shops' | 'products' }) {
  const tDashboard = useDashboardTranslations();
  const Icon = kind === 'shops' ? Store : Package;
  return (
    <div className="py-8 text-center text-gray-500">
      <Icon className="mx-auto mb-2 h-12 w-12 text-gray-300" />
      <p>{tDashboard('charts.noData')}</p>
    </div>
  );
}
