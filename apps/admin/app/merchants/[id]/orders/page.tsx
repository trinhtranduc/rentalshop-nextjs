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
import type { OrderListItem, OrderFilters, OrdersData } from '@rentalshop/types';

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
  
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [merchantName, setMerchantName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // ============================================================================
  // MEMOIZED QUERY PARAMS - For API calls
  // ============================================================================
  
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (page) params.set('page', page.toString());
    if (limit) params.set('limit', limit.toString());
    if (search) params.set('q', search);
    if (status && status !== 'all') params.set('status', status);
    if (orderType && orderType !== 'all') params.set('orderType', orderType);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    return params.toString();
  }, [merchantId, search, status, orderType, page, limit, sortBy, sortOrder]);

  // ============================================================================
  // DATA FETCHING - Server-side pagination and search
  // ============================================================================
  
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantId, queryParams]);

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

      // Fetch orders with server-side pagination and search using merchant-specific endpoint
      const ordersResponse = await merchantsApi.orders.list(parseInt(merchantId), queryParams);
      const ordersData = await ordersResponse.json();
      console.log('📦 Merchant Orders API response:', ordersData);

      if (ordersData.success && ordersData.data) {
        const ordersResponseData = ordersData.data;
        const ordersArray = ordersResponseData.orders || [];
        
        console.log('📦 Orders Data:', {
          ordersCount: ordersArray.length,
          total: ordersResponseData.total,
          totalPages: ordersResponseData.totalPages,
          page: ordersResponseData.page,
          limit: ordersResponseData.limit,
          hasMore: ordersResponseData.hasMore
        });
        
        const transformedOrders: OrderListItem[] = ordersArray.map((order: any) => ({
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
          customerId: order.customer?.id || order.customerId,
          customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName || ''}`.trim() : 'Unknown Customer',
          customerPhone: order.customer?.phone || '',
          outletId: order.outlet?.id || order.outletId || 0,
          outletName: order.outlet?.name || 'Unknown Outlet',
          merchantName: merchantName || `Merchant ${merchantId}`,
          createdById: order.createdById || 0,
          createdByName: order.createdByName,
          orderItems: order.orderItems || [],
          itemCount: order.itemCount || 0,
          paymentCount: order.paymentCount || 0,
          totalPaid: order.totalPaid || 0
        }));
        
        const totalValue = ordersResponseData.total || 0;
        const totalPagesValue = ordersResponseData.totalPages || Math.ceil(totalValue / (ordersResponseData.limit || limit));
        
        console.log('📦 Setting state:', {
          orders: transformedOrders.length,
          total: totalValue,
          totalPages: totalPagesValue,
          currentPage: ordersResponseData.page || page
        });
        
        setOrders(transformedOrders);
        setTotal(totalValue);
        setTotalPages(totalPagesValue);
      } else {
        setError(ordersData.message || 'Failed to fetch orders');
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
  
  const orderData: OrdersData = useMemo(() => ({
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
    if ('status' in newFilters && newFilters.status) {
      updates.status = Array.isArray(newFilters.status) 
        ? newFilters.status.join(',') 
        : String(newFilters.status);
    }
    if ('orderType' in newFilters && newFilters.orderType) {
      updates.type = String(newFilters.orderType);
    }
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

  const uiFilters: OrderFilters = { 
    search: search || undefined, 
    status: (status as any) || undefined, 
    orderType: (orderType as any) || undefined, 
    sortBy, 
    sortOrder 
  };

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
