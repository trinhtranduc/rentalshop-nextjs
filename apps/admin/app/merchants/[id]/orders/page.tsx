'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { merchantsApi, ordersApi } from '@rentalshop/utils';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { PageWrapper,
  PageHeader,
  PageTitle,
  Orders,
  Button,
  Breadcrumb,
  type BreadcrumbItem,
  useToast } from '@rentalshop/ui';
import { ShoppingCart, Plus } from 'lucide-react';
import type { Order, OrderFilters } from '@rentalshop/types';

/**
 * ✅ MODERN MERCHANT ORDERS PAGE (URL State Pattern)
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 * ✅ Server-side pagination and search
 */
export default function MerchantOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toastInfo } = useToast();
  const merchantId = params.id as string;
  
  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const orderType = searchParams.get('type') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ============================================================================
  // MEMOIZED FILTERS - For API calls
  // ============================================================================
  
  const apiFilters: OrderFilters = useMemo(() => ({
    search: search || undefined,
    status: (status as any) || undefined,
    orderType: (orderType as any) || undefined,
    merchantId: parseInt(merchantId),
    page,
    limit,
    sortBy,
    sortOrder
  }), [merchantId, search, status, orderType, page, limit, sortBy, sortOrder]);

  // ============================================================================
  // DATA FETCHING - Server-side pagination and search
  // ============================================================================
  
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId, search, status, orderType, page, limit, sortBy, sortOrder]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch merchant info (only once)
      if (!merchantName) {
        const merchantData = await merchantsApi.getMerchantById(parseInt(merchantId));
        if (merchantData.success && merchantData.data) {
          setMerchantName(merchantData.data.name);
        }
      }

      // Fetch orders with server-side pagination and search
      const ordersResponse = await ordersApi.searchOrders(apiFilters);
      console.log('📦 Orders API response:', ordersResponse);

      if (ordersResponse.success && ordersResponse.data) {
        const ordersData = ordersResponse.data;
        const ordersArray = ordersData.orders || [];
        
        const transformedOrders = ordersArray.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          totalAmount: order.totalAmount,
          depositAmount: order.depositAmount,
          pickupPlanAt: order.pickupPlanAt,
          returnPlanAt: order.returnPlanAt,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          customerId: order.customerId,
          customerName: order.customerName || 'Unknown Customer',
          customerPhone: order.customerPhone || '',
          outletId: order.outletId,
          outletName: order.outletName || 'Unknown Outlet',
          merchantName: order.merchantName || merchantName || `Merchant ${merchantId}`,
          createdById: order.createdById,
          createdByName: order.createdByName,
          orderItems: order.orderItems || [],
          itemCount: order.itemCount || 0,
          paymentCount: order.paymentCount || 0,
          totalPaid: order.totalPaid || 0
        }));
        
        setOrders(transformedOrders);
        setTotal(ordersData.total || 0);
        setTotalPages(ordersData.totalPages || Math.ceil((ordersData.total || 0) / limit));
      } else {
        setError(ordersResponse.message || 'Failed to fetch orders');
        setOrders([]);
        setTotal(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data');
      setOrders([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // ORDER DATA - Server-side paginated data
  // ============================================================================
  
  const orderData = useMemo(() => ({
    orders,
    total,
    currentPage: page,
    totalPages,
    limit,
    hasMore: page < totalPages
  }), [orders, total, page, totalPages, limit]);

  // ============================================================================
  // URL UPDATE HELPER
  // ============================================================================
  
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      // Special handling for page: always set it, even if it's 1
      if (key === 'page') {
        const pageNum = typeof value === 'number' ? value : parseInt(String(value || '0'));
        if (pageNum > 0) {
          params.set(key, pageNum.toString());
        } else {
          params.delete(key);
        }
      } else if (value && value !== '' && value !== 'all') {
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

  const handleFiltersChange = useCallback((newFilters: OrderFilters) => {
    const updates: Record<string, string | number | undefined> = { page: 1 };
    if ('status' in newFilters) updates.status = newFilters.status;
    if ('orderType' in newFilters) updates.type = newFilters.orderType;
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: column, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  const handleOrderAction = useCallback((action: string, orderNumber: string) => {
    // Extract the numeric part from order number (e.g., "001-757513" -> ["001", "757513"])
    // Use the full order number as the route parameter since the API expects the full format
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}/orders/${orderNumber}`);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/orders/${orderNumber}/edit`);
        break;
      default:
        console.log('Order action:', action, orderNumber);
    }
  }, [router, merchantId]);

  // ============================================================================
  // RENDER
  // ============================================================================

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => [
    { label: 'Merchants', href: '/merchants' },
    { label: merchantName || `Merchant ${merchantId}`, href: `/merchants/${merchantId}` },
    { label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> }
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
            <h3 className="text-lg font-medium mb-2">Error Loading Orders</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const uiFilters = { search, status, orderType, sortBy, sortOrder };

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Breadcrumb items={breadcrumbItems} homeHref="/dashboard" />
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => router.push(`/merchants/${merchantId}/orders/create`)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-4"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading orders...</p>
            </div>
          </div>
        ) : (
          <Orders
            data={orderData}
            filters={uiFilters}
            onFiltersChange={handleFiltersChange}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
            onOrderAction={handleOrderAction}
            onPageChange={handlePageChange}
            onSort={handleSort}
            showStats={false}
          />
        )}
      </div>
    </PageWrapper>
  );
}
