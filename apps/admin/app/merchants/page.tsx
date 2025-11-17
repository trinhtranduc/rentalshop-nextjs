'use client';

import React, { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Merchants,
  PageWrapper,
  PageHeader,
  PageTitle,
  useToast } from '@rentalshop/ui';
import { useMerchantsData } from '@rentalshop/hooks';
import type { Merchant } from '@rentalshop/types';

/**
 * ✅ MODERN MERCHANTS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useMerchantsData hook
 * ✅ No duplicate state management
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Auto-refresh on URL change
 * ✅ Request deduplication with useDedupedApi
 */
export default function MerchantsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toastError } = useToast();

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || 'all';
  const plan = searchParams.get('plan') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const sortBy = searchParams.get('sortBy') || 'name';
  const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

  // ============================================================================
  // DATA FETCHING - Clean & Simple with Deduplication
  // ============================================================================
  
  // Memoize filters - useMerchantsData handles deduplication automatically
  const filters = useMemo(() => ({
    search: search || undefined,
    status: status !== 'all' ? status : undefined,
    plan: plan !== 'all' ? plan : undefined,
    page,
    limit,
    sortBy,
    sortOrder
  }), [search, status, plan, page, limit, sortBy, sortOrder]);

  const { data, loading, error } = useMerchantsData({ filters });
  
  console.log('📊 Merchants Page - Data state:', {
    hasData: !!data,
    merchantsCount: data?.merchants?.length || 0,
    total: data?.total,
    currentPage: data?.currentPage,
    totalPages: data?.totalPages,
    loading,
    error: error?.message
  });

  // ============================================================================
  // URL UPDATE HELPER - Update URL = Update Everything
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== '' && value !== 'all') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    const newURL = `${pathname}?${params.toString()}`;
    router.push(newURL, { scroll: false });
  }, [pathname, router, searchParams]);

  // ============================================================================
  // FILTER HANDLERS - Simple URL Updates
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    console.log('🔍 Page: Search changed to:', searchValue);
    updateURL({ q: searchValue, page: 1 }); // Reset to page 1
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: { search: string; status: string; plan: string }) => {
    const updates: Record<string, string | number | undefined> = { page: 1 }; // Reset page
    
    if (newFilters.search !== undefined) {
      updates.q = newFilters.search;
    }
    if (newFilters.status !== undefined) {
      updates.status = newFilters.status;
    }
    if (newFilters.plan !== undefined) {
      updates.plan = newFilters.plan;
    }
    
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    console.log('🔧 Page: Clear all filters');
    // Clear all params
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    // Toggle sort order if clicking same column, otherwise default to asc
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: column, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  // ============================================================================
  // MERCHANT ACTION HANDLERS
  // ============================================================================
  
  const handleMerchantAction = useCallback((action: string, merchantId: number) => {
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}`);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/edit`);
        break;
      case 'change-plan':
        console.log('Change plan for merchant:', merchantId);
        break;
      default:
        console.log('Merchant action:', action, merchantId);
    }
  }, [router]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const merchantsData = useMemo(() => {
    if (!data) {
      return {
        merchants: [],
        total: 0,
        currentPage: 1,
        totalPages: 1,
        limit: 10,
        hasMore: false,
        stats: {
          totalMerchants: 0,
          activeMerchants: 0,
          trialAccounts: 0,
          totalRevenue: 0
        }
      };
    }

    // Calculate stats from current data
    const merchants = data.merchants || [];
    const stats = {
      totalMerchants: data.total || 0,
      activeMerchants: merchants.filter((m: any) => m.isActive).length,
      trialAccounts: merchants.filter((m: any) => m.subscriptionStatus === 'trial').length,
      totalRevenue: merchants.reduce((sum: number, m: any) => sum + (m.totalRevenue || 0), 0)
    };

    const result = {
      merchants: data.merchants,
      total: data.total,
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      limit: data.limit,
      hasMore: data.hasMore,
      stats
    };
    
    console.log('🏢 Merchants Page - Transformed data:', result);
    
    return result;
  }, [data]);

  const filtersData = useMemo(() => ({
    search,
    status,
    plan,
    sortBy,
    sortOrder
  }), [search, status, plan, sortBy, sortOrder]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <PageTitle subtitle="Manage all merchants across the platform">
          Merchant Management
        </PageTitle>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
        <Merchants
          data={merchantsData}
          filters={filtersData}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onMerchantAction={handleMerchantAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </div>
    </PageWrapper>
  );
}
