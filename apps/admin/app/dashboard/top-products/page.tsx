'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageContent,
  PageHeader,
  PageTitle,
  PageWrapper,
  Pagination,
  PageLoadingIndicator
} from '@rentalshop/ui';
import { useDashboardTranslations } from '@rentalshop/hooks';
import { analyticsApi } from '@rentalshop/utils';
import type { TopProduct } from '@rentalshop/types';
import { ArrowLeft, Package } from 'lucide-react';
import {
  RankingEmptyState,
  RankingPeriodButtons,
  RankingSortButtons,
  TopProductRow
} from '../components/RankingLists';
import {
  getAdminDashboardDateRange,
  parseAdminPeriod,
  parseRankingSortBy,
  unwrapRankingPage
} from '../ranking-period';

export default function TopProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tDashboard = useDashboardTranslations();
  const period = parseAdminPeriod(searchParams.get('period'));
  const sortBy = parseRankingSortBy(searchParams.get('sortBy'));
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;
  const limit = parseInt(searchParams.get('limit') || '25', 10) || 25;

  const [products, setProducts] = useState<TopProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const updateParams = useCallback(
    (patch: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        params.set(key, String(value));
      });
      router.push(`/dashboard/top-products?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const range = getAdminDashboardDateRange(period);
        const response = await analyticsApi.getTopProducts({
          startDate: range.startDate,
          endDate: range.endDate,
          sortBy,
          page,
          limit
        });
        if (cancelled) return;
        if (response.success) {
          const ranking = unwrapRankingPage<TopProduct>(response.data);
          setProducts(ranking.items);
          setTotal(ranking.total);
          setTotalPages(ranking.totalPages);
        } else {
          setProducts([]);
          setTotal(0);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Error fetching top products:', error);
        if (!cancelled) {
          setProducts([]);
          setTotal(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [period, sortBy, page, limit]);

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard?period=${period}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tDashboard('title')}
          </Button>
        </div>
        <PageTitle>{tDashboard('charts.topProducts')}</PageTitle>
      </PageHeader>
      <PageContent>
        <PageLoadingIndicator loading={loading} />
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <RankingPeriodButtons period={period} onChange={(next) => updateParams({ period: next, page: 1 })} />
          <RankingSortButtons sortBy={sortBy} onChange={(next) => updateParams({ sortBy: next, page: 1 })} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-700" />
              {sortBy === 'quantity' ? tDashboard('charts.sortByQuantity') : tDashboard('charts.sortByRevenue')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {products.length > 0 ? (
              products.map((product, index) => (
                <TopProductRow
                  key={`${product.id}-${product.outletId ?? index}`}
                  product={product}
                  rank={(page - 1) * limit + index + 1}
                  sortBy={sortBy}
                  onClick={() => {
                    if (product.merchantId && product.id) {
                      router.push(`/merchants/${product.merchantId}/products/${product.id}`);
                    }
                  }}
                />
              ))
            ) : (
              <RankingEmptyState kind="products" />
            )}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              itemName={tDashboard('charts.topProducts')}
              onPageChange={(nextPage) => updateParams({ page: nextPage })}
              onLimitChange={(nextLimit) => updateParams({ limit: nextLimit, page: 1 })}
            />
          </CardContent>
        </Card>
      </PageContent>
    </PageWrapper>
  );
}
