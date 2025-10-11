'use client';

import React, { useCallback, useMemo, useTransition, useRef } from 'react';
import { 
  OrdersLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  Orders,
  useToast 
} from '@rentalshop/ui';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useOrdersData, useCanExportData } from '@rentalshop/hooks';
import { ordersApi } from '@rentalshop/utils';
import type { OrderFilters } from '@rentalshop/types';

/**
 * ✅ MODERN NEXT.JS 13+ ORDERS PAGE - URL STATE PATTERN
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useOrdersData hook
 * ✅ No duplicate state management
 * ✅ Smooth transitions with useTransition
 * ✅ Shareable URLs (bookmarkable filters)
 * ✅ Browser back/forward support
 * ✅ Auto-refresh on URL change (no manual refresh needed)
 * 
 * Data Flow:
 * 1. User interacts (search, filter, pagination)
 * 2. updateURL() → URL params change
 * 3. Next.js detects URL change → searchParams update
 * 4. filters object recalculates (memoized)
 * 5. useOrdersData detects filter change → fetch data
 * 6. UI updates with new data
 * 
 * Benefits:
 * - Single API call per action
 * - Minimal re-renders
 * - No manual refresh needed
 * - Clean and maintainable
 */
export default function OrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const canExport = useCanExportData();
  const [isPending, startTransition] = useTransition();

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const orderType = searchParams.get('type') || '';
  const outletId = searchParams.get('outlet') ? parseInt(searchParams.get('outlet')!) : undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  // ============================================================================
  // DATA FETCHING - Clean & Simple
  // ============================================================================
  
  // ✅ FIX: Memoize với ref để tránh re-create khi dependencies không thực sự thay đổi
  const filtersRef = useRef<OrderFilters | null>(null);
  const filters: OrderFilters = useMemo(() => {
    const newFilters = {
      search: search || undefined,
      status: (status as any) || undefined,
      orderType: (orderType as any) || undefined,
      outletId,
      page,
      limit,
      sortBy,
      sortOrder
    };
    
    // Only update if actually changed
    const filterString = JSON.stringify(newFilters);
    const prevFilterString = JSON.stringify(filtersRef.current);
    
    if (filterString === prevFilterString && filtersRef.current) {
      console.log('🔍 Page: Filters unchanged, returning cached');
      return filtersRef.current;
    }
    
    console.log('🔍 Page: Filters changed, creating new:', newFilters);
    filtersRef.current = newFilters;
    return newFilters;
  }, [search, status, orderType, outletId, page, limit, sortBy, sortOrder]);

  const { data, loading, error } = useOrdersData({ 
    filters,
    debounceSearch: true,
    debounceMs: 500
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
    console.log('🔄 updateURL: Pushing new URL:', newURL);
    
    // Use transition for smooth UI updates
    startTransition(() => {
      router.push(newURL, { scroll: false });
    });
  }, [pathname, router, searchParams, startTransition]);

  // ============================================================================
  // FILTER HANDLERS - Simple URL Updates
  // ============================================================================
  
  const handleSearchChange = useCallback((searchValue: string) => {
    console.log('🔍 Page: Search changed to:', searchValue);
    updateURL({ q: searchValue, page: 1 }); // Reset to page 1
  }, [updateURL]);

  const handleFiltersChange = useCallback((newFilters: Partial<OrderFilters>) => {
    console.log('🔧 Page: Filters changed:', newFilters);
    
    const updates: Record<string, string | number | undefined> = { page: 1 }; // Reset page
    
    if ('status' in newFilters) {
      updates.status = newFilters.status as any;
    }
    if ('orderType' in newFilters) {
      updates.type = newFilters.orderType as any;
    }
    if ('outletId' in newFilters) {
      updates.outlet = newFilters.outletId as any;
    }
    if ('sortBy' in newFilters) {
      updates.sortBy = newFilters.sortBy;
    }
    if ('sortOrder' in newFilters) {
      updates.sortOrder = newFilters.sortOrder;
    }
    
    updateURL(updates);
  }, [updateURL]);

  const handleClearFilters = useCallback(() => {
    console.log('🔧 Page: Clear all filters');
    // Clear all params except page
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    console.log('📄 Page: Page changed to:', newPage);
    updateURL({ page: newPage });
  }, [updateURL]);

  const handleSort = useCallback((column: string) => {
    console.log('🔀 Page: Sort changed:', column);
    const newSortBy = column;
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  // ============================================================================
  // ORDER ACTION HANDLERS
  // ============================================================================
  
  const handleOrderAction = useCallback(async (action: string, orderNumber: string) => {
    const numericOrderNumber = orderNumber.replace(/^ORD-/, '');
    
    switch (action) {
      case 'view':
        router.push(`/orders/${numericOrderNumber}`);
        break;
        
      case 'pickup':
        const orderForPickup = data?.orders.find(o => o.orderNumber === orderNumber);
        if (orderForPickup) {
          try {
            const response = await ordersApi.pickupOrder(orderForPickup.id);
            if (response.success) {
              toastSuccess('Order Confirmed', 'Order has been confirmed successfully!');
              // ✅ Force re-fetch by updating URL (trigger data refresh)
              router.refresh();
            } else {
              throw new Error(response.error || 'Failed to pickup order');
            }
          } catch (error) {
            toastError('Update Failed', (error as Error).message);
          }
        }
        break;
        
      case 'return':
        const orderForReturn = data?.orders.find(o => o.orderNumber === orderNumber);
        if (orderForReturn) {
          try {
            const response = await ordersApi.returnOrder(orderForReturn.id);
            if (response.success) {
              toastSuccess('Order Returned', 'Order has been returned successfully!');
              // ✅ Force re-fetch by updating URL (trigger data refresh)
              router.refresh();
            } else {
              throw new Error(response.error || 'Failed to return order');
            }
          } catch (error) {
            toastError('Update Failed', (error as Error).message);
          }
        }
        break;
        
      case 'cancel':
        const orderForCancel = data?.orders.find(o => o.orderNumber === orderNumber);
        if (orderForCancel) {
          if (!confirm('Are you sure you want to cancel this order?')) return;
          try {
            const response = await ordersApi.cancelOrder(orderForCancel.id);
            if (response.success) {
              toastSuccess('Order Cancelled', 'Order has been cancelled successfully!');
              // ✅ Force re-fetch by updating URL (trigger data refresh)
              router.refresh();
            } else {
              throw new Error(response.error || 'Failed to cancel order');
            }
          } catch (error) {
            toastError('Cancellation Failed', (error as Error).message);
          }
        }
        break;
        
      case 'edit':
        router.push(`/orders/${numericOrderNumber}/edit`);
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  }, [data?.orders, router, toastSuccess, toastError]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const orderData = useMemo(() => {
    if (!data) {
      return {
        orders: [],
        total: 0,
        currentPage: 1,
        totalPages: 1,
        limit: 25,
        hasMore: false,
        stats: {
          totalOrders: 0,
          pendingOrders: 0,
          activeOrders: 0,
          completedOrders: 0,
          cancelledOrders: 0,
          totalRevenue: 0,
          totalDeposits: 0,
          averageOrderValue: 0,
          ordersThisMonth: 0,
          revenueThisMonth: 0,
          activeRentals: 0,
          overdueRentals: 0
        }
      };
    }

    return {
      orders: data.orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        status: order.status,
        customerId: order.customer?.id || '',
        customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Unknown',
        customerPhone: order.customer?.phone || '',
        outletId: order.outlet?.id || '',
        outletName: order.outlet?.name || '',
        merchantName: order.outlet?.merchant?.name || 'Unknown',
        totalAmount: order.totalAmount,
        depositAmount: order.depositAmount,
        pickupPlanAt: order.pickupPlanAt ? (order.pickupPlanAt instanceof Date ? order.pickupPlanAt.toISOString() : order.pickupPlanAt) : undefined,
        returnPlanAt: order.returnPlanAt ? (order.returnPlanAt instanceof Date ? order.returnPlanAt.toISOString() : order.returnPlanAt) : undefined,
        pickedUpAt: order.pickedUpAt ? (order.pickedUpAt instanceof Date ? order.pickedUpAt.toISOString() : order.pickedUpAt) : undefined,
        returnedAt: order.returnedAt ? (order.returnedAt instanceof Date ? order.returnedAt.toISOString() : order.returnedAt) : undefined,
        createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
        updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
        orderItems: [],
        payments: []
      })),
      total: data.total,
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      limit: data.limit,
      hasMore: data.hasMore,
      stats: {
        totalOrders: 0,
        pendingOrders: 0,
        activeOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        totalDeposits: 0,
        averageOrderValue: 0,
        ordersThisMonth: 0,
        revenueThisMonth: 0,
        activeRentals: 0,
        overdueRentals: 0
      }
    };
  }, [data]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading && !data) {
    return (
      <PageWrapper spacing="none">
        <PageHeader>
          <PageTitle>Order Management</PageTitle>
          <p className="text-sm text-gray-600">Manage orders and rental/sale transactions</p>
        </PageHeader>
        <OrdersLoading />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Order Management</PageTitle>
            <p className="text-sm text-gray-600">Manage orders and rental/sale transactions</p>
          </div>
          <div className="flex gap-3">
            {canExport && (
              <button 
                onClick={() => {
                  toastSuccess('Export Feature', 'Export functionality coming soon!');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-md flex items-center text-sm transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export
              </button>
            )}
            <button 
              onClick={() => router.push('/orders/create')}
              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4 rounded-md flex items-center text-sm transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Order
            </button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0">
        <Orders
          data={orderData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onOrderAction={handleOrderAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
          showStats={false}
        />
      </div>
    </PageWrapper>
  );
}
