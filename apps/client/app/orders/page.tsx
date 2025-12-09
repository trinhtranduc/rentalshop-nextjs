'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  Orders,
  useToast,
  Button,
  LoadingIndicator,
  ExportDialog,
  ConfirmationDialog,
  type QuickFilterOption
} from '@rentalshop/ui';
import { Plus, Download } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useOrdersData, useCanExportData, useOrderTranslations, useCommonTranslations } from '@rentalshop/hooks';
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
  const { toastSuccess, toastError, toastWarning } = useToast();
  const t = useOrderTranslations();
  const tc = useCommonTranslations();
  const canExport = useCanExportData();

  // ============================================================================
  // QUICK FILTER STATE - Modern time-based filtering
  // ============================================================================
  
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | undefined>(
    searchParams.get('quickFilter') || 'month' // ⭐ Default to Last 30 Days
  );
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<{ id: number; orderNumber: string } | null>(null);

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
  // DATE FILTERS - Default to Last 30 Days (optimal performance)
  // ============================================================================
  
  // Get date params directly from URL - use strings, no Date objects
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  
  // Debug: Log URL params
  console.log('🔗 URL Params:', {
    search,
    status,
    orderType,
    outletId,
    page,
    limit,
    sortBy,
    sortOrder
  });

  // ============================================================================
  // DATA FETCHING - Clean & Simple
  // ============================================================================
  
  // Get merchant ID from user (for merchant/outlet users, set as default)
  const userMerchantId = user?.merchant?.id || user?.merchantId;
  const merchantIdParam = searchParams.get('merchant') ? parseInt(searchParams.get('merchant')!) : undefined;
  
  // ✅ SIMPLE: Memoize filters - use strings directly, no Date objects
  // For merchant/outlet users, automatically set merchantId (hidden from UI)
  // For admin users, merchantId comes from URL params (visible in UI)
  const filters: OrderFilters = useMemo(() => {
    const baseFilters: OrderFilters = {
      search: search || undefined,
      status: (status as any) || undefined,
      orderType: (orderType as any) || undefined,
      outletId,
      startDate: startDateParam || undefined, // ⭐ String from URL params
      endDate: endDateParam || undefined,     // ⭐ String from URL params
      page,
      limit,
      sortBy,
      sortOrder
    };
    
    // Only add merchantId to filters if:
    // 1. User is ADMIN and merchantId is in URL params, OR
    // 2. User is MERCHANT/OUTLET and we need to set their merchantId (but don't show in UI)
    if (user?.role === 'ADMIN') {
      // Admin can select merchant from dropdown
      if (merchantIdParam) {
        baseFilters.merchantId = merchantIdParam;
      }
    } else if (userMerchantId) {
      // Merchant/Outlet users: automatically filter by their merchant (hidden from UI)
      baseFilters.merchantId = Number(userMerchantId);
    }
    
    return baseFilters;
  }, [search, status, orderType, outletId, startDateParam, endDateParam, page, limit, sortBy, sortOrder, merchantIdParam, user?.role, userMerchantId]);

  const { data, loading, error, refetch } = useOrdersData({ filters });
  
  // Debug: Log when filters or data changes
  console.log('📊 Orders Page - Current state:', {
    page,
    filters,
    hasData: !!data,
    ordersCount: data?.orders?.length || 0,
    currentPage: data?.currentPage,
    loading
  });

  // ============================================================================
  // URL UPDATE HELPER - Update URL = Update Everything
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
    // Only update merchantId in URL if user is ADMIN (merchant/outlet users don't see this field)
    if ('merchantId' in newFilters && user?.role === 'ADMIN') {
      updates.merchant = newFilters.merchantId as any;
    }
    if ('sortBy' in newFilters) {
      updates.sortBy = newFilters.sortBy;
    }
    if ('sortOrder' in newFilters) {
      updates.sortOrder = newFilters.sortOrder;
    }
    
    updateURL(updates);
  }, [updateURL, user?.role]);

  const handleClearFilters = useCallback(() => {
    console.log('🔧 Page: Clear all filters');
    // Clear all params except page
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const handlePageChange = useCallback((newPage: number) => {
    console.log('📄 handlePageChange called: current page=', page, ', new page=', newPage);
    console.log('📄 Current filters:', filters);
    updateURL({ page: newPage });
  }, [updateURL, page, filters]);

  const handleSort = useCallback((column: string) => {
    console.log('🔀 Page: Sort changed:', column);
    const newSortBy = column;
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateURL({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
  }, [sortBy, sortOrder, updateURL]);

  // ============================================================================
  // QUICK FILTER HANDLER - Modern time-based filtering
  // ============================================================================
  
  // ============================================================================
  // DATE RANGE HANDLER - Modern dropdown filter
  // ============================================================================
  
  const handleDateRangeChange = useCallback((rangeId: string, start: Date, end: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Format dates as yyyy-mm-dd (clean URL format)
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Set date range with simple format
    params.set('startDate', formatDate(start));
    params.set('endDate', formatDate(end));
    params.set('quickFilter', rangeId);
    params.set('page', '1'); // Reset to page 1
    
    setActiveQuickFilter(rangeId);
    
    console.log('⚡ Date range applied:', rangeId, {
      start: formatDate(start),
      end: formatDate(end)
    });
    
    // Show warning if "All time" selected with large dataset
    if (rangeId === 'all' && data?.total && data.total > 10000) {
      toastWarning(
        'Viewing All Orders',
        `You are viewing all ${data.total.toLocaleString()} orders. This may be slow. Consider using a shorter date range for better performance.`
      );
    }
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, pathname, router, data?.total, toastWarning]);

  // ============================================================================
  // ORDER ACTION HANDLERS
  // ============================================================================
  
  const handleOrderAction = useCallback(async (action: string, orderNumber: string) => {
    const numericOrderNumber = orderNumber;
    
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
              toastSuccess(tc('messages.updateSuccess'), t('messages.updateSuccess'));
              // ✅ Force re-fetch by updating URL (trigger data refresh)
              refetch();
            } else {
              throw new Error(response.error || t('messages.updateFailed'));
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
              toastSuccess(tc('messages.updateSuccess'), t('messages.updateSuccess'));
              // ✅ Force re-fetch by updating URL (trigger data refresh)
              refetch();
            } else {
              throw new Error(response.error || t('messages.updateFailed'));
            }
          } catch (error) {
            toastError('Update Failed', (error as Error).message);
          }
        }
        break;
        
      case 'cancel':
        const orderForCancel = data?.orders.find(o => o.orderNumber === orderNumber);
        if (orderForCancel) {
          // Show confirmation dialog instead of browser confirm()
          setOrderToCancel({ id: orderForCancel.id, orderNumber: orderForCancel.orderNumber });
          setShowCancelConfirmDialog(true);
        }
        break;
        
      case 'edit':
        router.push(`/orders/${numericOrderNumber}/edit`);
        break;
        
      default:
        console.log('Unknown action:', action);
    }
  }, [data?.orders, router, toastSuccess, toastError, refetch]);

  // ============================================================================
  // TRANSFORM DATA FOR UI
  // ============================================================================
  
  const orderData = useMemo(() => {
    if (!data || !data.orders) {
      return {
        items: [],
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

    const mappedOrders = data.orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      customerId: order.customer?.id || (order as any).customerId || '',
      customerName: (order as any).customerName || 
                   (order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Unknown'),
      customerPhone: (order as any).customerPhone || order.customer?.phone || '',
      outletId: order.outlet?.id || (order as any).outletId || '',
      outletName: (order as any).outletName || order.outlet?.name || 'Unknown',
      merchantName: (order as any).merchantName || order.outlet?.merchant?.name || 'Unknown',
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      pickupPlanAt: order.pickupPlanAt ? (order.pickupPlanAt instanceof Date ? order.pickupPlanAt.toISOString() : order.pickupPlanAt) : null,
      returnPlanAt: order.returnPlanAt ? (order.returnPlanAt instanceof Date ? order.returnPlanAt.toISOString() : order.returnPlanAt) : null,
      pickedUpAt: order.pickedUpAt ? (order.pickedUpAt instanceof Date ? order.pickedUpAt.toISOString() : order.pickedUpAt) : null,
      returnedAt: order.returnedAt ? (order.returnedAt instanceof Date ? order.returnedAt.toISOString() : order.returnedAt) : null,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
      orderItems: [],
      payments: [],
      // Additional fields required by OrderSearchResult
      isReadyToDeliver: false,
      customer: order.customer ? {
        id: order.customer.id,
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        email: order.customer.email || null,
        phone: order.customer.phone
      } : null,
      outlet: order.outlet || null
    }));

    return {
      items: mappedOrders, // Required by BaseSearchResult
      orders: mappedOrders, // Alias for backward compatibility
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
  // RENDER - Page renders immediately, show loading indicator
  // ============================================================================

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>{t('title')}</PageTitle>
            <p className="text-sm text-gray-600">{t('title')}</p>
          </div>
          <div className="flex gap-3">
            {canExport && (
              <Button
                onClick={() => setShowExportDialog(true)}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {tc('buttons.export')}
              </Button>
            )}
            <Button 
              onClick={() => router.push('/orders/create')}
              variant="default"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('createOrder')}
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 relative">
        {/* Center Loading Indicator - Shows when waiting for API */}
        {loading && !data ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <LoadingIndicator 
              variant="circular" 
              size="lg"
              message={tc('labels.loading') || 'Loading orders...'}
            />
          </div>
        ) : (
          /* Orders Content - Only render when data is loaded */
          <Orders
            data={orderData}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
            onOrderAction={handleOrderAction}
            onPageChange={handlePageChange}
            onSort={handleSort}
            onDateRangeChange={handleDateRangeChange}     // 🆕 Modern dropdown filter
            activeQuickFilter={activeQuickFilter}          // 🆕 Active filter state
            showQuickFilters={true}                         // 🆕 Show date range filter
            filterStyle="dropdown"                          // 🆕 Dropdown style (Shopify/Stripe)
            showStats={false}
            userRole={user?.role as 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF'}
          />
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        resourceName="Orders"
        isLoading={isExporting}
        onExport={async (params) => {
          try {
            setIsExporting(true);
            const blob = await ordersApi.exportOrders({
              ...params,
              status: status || undefined,
              orderType: orderType || undefined,
              dateField: 'createdAt' // Default to createdAt, can be customized
            });
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `orders-export-${new Date().toISOString().split('T')[0]}.${params.format === 'csv' ? 'csv' : 'xlsx'}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            toastSuccess(tc('labels.success'), 'Export completed successfully');
            setShowExportDialog(false);
          } catch (error) {
            toastError(tc('labels.error'), (error as Error).message || 'Failed to export orders');
          } finally {
            setIsExporting(false);
          }
        }}
      />

      {/* Cancel Order Confirmation Dialog */}
      <ConfirmationDialog
        open={showCancelConfirmDialog}
        onOpenChange={setShowCancelConfirmDialog}
        type="danger"
        title={t('detail.cancelOrderTitle') || 'Cancel Order'}
        description={t('detail.cancelOrderMessage') || t('messages.confirmCancel') || 'Are you sure you want to cancel this order? This action cannot be undone.'}
        confirmText={t('actions.cancelOrder') || 'Cancel Order'}
        cancelText={t('detail.keepOrder') || 'Keep Order'}
        onConfirm={async () => {
          if (!orderToCancel) return;
          try {
            const response = await ordersApi.cancelOrder(orderToCancel.id);
            if (response.success) {
              toastSuccess(tc('messages.updateSuccess'), t('messages.updateSuccess'));
              setShowCancelConfirmDialog(false);
              setOrderToCancel(null);
              // ✅ Force re-fetch by updating URL (trigger data refresh)
              refetch();
            } else {
              throw new Error(response.error || t('messages.updateFailed'));
            }
          } catch (error) {
            toastError(t('messages.updateFailed'), (error as Error).message);
          }
        }}
        onCancel={() => {
          setShowCancelConfirmDialog(false);
          setOrderToCancel(null);
        }}
      />
    </PageWrapper>
  );
}
