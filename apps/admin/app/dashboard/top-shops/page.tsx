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
import type { TopOutlet } from '@rentalshop/types';
import { ArrowLeft, Store } from 'lucide-react';
import {
  RankingEmptyState,
  RankingPeriodButtons,
  TopShopRow
} from '../components/RankingLists';
import {
  getAdminDashboardDateRange,
  parseAdminPeriod,
  unwrapRankingPage
} from '../ranking-period';

export default function TopShopsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tDashboard = useDashboardTranslations();
  const period = parseAdminPeriod(searchParams.get('period'));
  const page = parseInt(searchParams.get('page') || '1', 10) || 1;
  const limit = parseInt(searchParams.get('limit') || '25', 10) || 25;

  const [shops, setShops] = useState<TopOutlet[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const updateParams = useCallback(
    (patch: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([key, value]) => {
        params.set(key, String(value));
      });
      router.push(`/dashboard/top-shops?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const range = getAdminDashboardDateRange(period);
        const response = await analyticsApi.getTopOutlets({
          startDate: range.startDate,
          endDate: range.endDate,
          page,
          limit
        });
        if (cancelled) return;
        if (response.success) {
          const ranking = unwrapRankingPage<TopOutlet>(response.data);
          setShops(ranking.items);
          setTotal(ranking.total);
          setTotalPages(ranking.totalPages);
        } else {
          setShops([]);
          setTotal(0);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('Error fetching top shops:', error);
        if (!cancelled) {
          setShops([]);
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
  }, [period, page, limit]);

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard?period=${period}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {tDashboard('title')}
          </Button>
        </div>
        <PageTitle>{tDashboard('charts.topShops')}</PageTitle>
      </PageHeader>
      <PageContent>
        <PageLoadingIndicator loading={loading} />
        <div className="mb-6">
          <RankingPeriodButtons period={period} onChange={(next) => updateParams({ period: next, page: 1 })} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-700" />
              {tDashboard('charts.sortByRevenue')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shops.length > 0 ? (
              shops.map((shop, index) => (
                <TopShopRow
                  key={shop.id}
                  shop={shop}
                  rank={(page - 1) * limit + index + 1}
                  onClick={() => router.push(`/merchants/${shop.merchantId}/outlets/${shop.id}`)}
                />
              ))
            ) : (
              <RankingEmptyState kind="shops" />
            )}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              total={total}
              limit={limit}
              itemName={tDashboard('charts.topShops')}
              onPageChange={(nextPage) => updateParams({ page: nextPage })}
              onLimitChange={(nextLimit) => updateParams({ limit: nextLimit, page: 1 })}
            />
          </CardContent>
        </Card>
      </PageContent>
    </PageWrapper>
  );
}
