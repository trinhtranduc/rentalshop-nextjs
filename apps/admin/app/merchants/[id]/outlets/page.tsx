'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

// Disable prerendering to avoid module resolution issues

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { merchantsApi } from '@rentalshop/utils';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  Outlets,
  Breadcrumb,
  type BreadcrumbItem
} from '@rentalshop/ui';
import { Store } from 'lucide-react';
import type { Outlet, OutletFilters } from '@rentalshop/types';

/**
 * ✅ MODERN MERCHANT OUTLETS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 */
export default function MerchantOutletsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const merchantId = params.id as string;
  
  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  // ============================================================================
  // LOCAL STATE (API không support filters yet, fetch và filter client-side)
  // ============================================================================
  
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [merchantId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch merchant info
      const merchantData = await merchantsApi.getMerchantById(parseInt(merchantId));
      
      if (merchantData.success && merchantData.data) {
        setMerchantName(merchantData.data.name);
      }

      // Fetch outlets
      const outletsRes = await merchantsApi.outlets.list(parseInt(merchantId), '');
      const outletsData = await outletsRes.json();
      console.log('🏪 Outlets API response:', outletsData);

      if (outletsData.success) {
        // API returns data as direct array OR data.outlets
        const outletsList = Array.isArray(outletsData.data) 
          ? outletsData.data 
          : outletsData.data?.outlets || [];
        setOutlets(outletsList);
        console.log('🏪 Outlets set, count:', outletsList.length);
      } else {
        setError(outletsData.message || 'Failed to fetch outlets');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CLIENT-SIDE FILTERING & PAGINATION
  // ============================================================================
  
  const filteredOutlets = useMemo(() => {
    let filtered = outlets;
    
    if (search) {
      filtered = filtered.filter(o => 
        o.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (status && status !== 'all') {
      filtered = filtered.filter(o => 
        status === 'active' ? o.isActive : !o.isActive
      );
    }
    
    return filtered;
  }, [outlets, search, status]);

  const outletData = useMemo(() => {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedOutlets = filteredOutlets.slice(startIndex, endIndex);
    const total = filteredOutlets.length;
    const totalPages = Math.ceil(total / limit);
    
    return {
      outlets: paginatedOutlets,
      total,
      currentPage: page,
      totalPages,
      limit,
      hasMore: endIndex < total
    };
  }, [filteredOutlets, page, limit]);

  // ============================================================================
  // URL UPDATE HELPER
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
  // HANDLERS
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    updateURL({ q: searchValue, page: 1 });
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: any) => {
    const updates: Record<string, string | number | undefined> = { page: 1 };
    if ('status' in newFilters) updates.status = newFilters.status;
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleOutletAction = useCallback((action: string, outletId: number) => {
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}/outlets/${outletId}`);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/outlets/${outletId}/edit`);
        break;
      default:
        console.log('Outlet action:', action, outletId);
    }
  }, [router, merchantId]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => [
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName || `Merchant ${merchantId}`, href: `/merchants/${merchantId}` },
    { label: 'Outlets', icon: <Store className="w-4 h-4" /> }
  ], [merchantId, merchantName]);

  if (error) {
    return (
      <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
        <PageHeader className="flex-shrink-0">
          <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
        </PageHeader>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Outlets</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const filters = { search, status };

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
        <Outlets
          data={outletData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onOutletAction={handleOutletAction}
          onPageChange={handlePageChange}
          merchantId={merchantId}
        />
      </div>
    </PageWrapper>
  );
}
