'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { 
  OrdersLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  Orders,
  useToast,
  Button,
  ExportDialog,
  ConfirmationDialog,
  type QuickFilterOption
} from '@rentalshop/ui';
import { Plus, Download } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth, useOrdersData, useCanExportData } from '@rentalshop/hooks';
import { ordersApi } from '@rentalshop/utils';
import { useFormatCurrency } from '@rentalshop/ui';
import type { OrderFilters } from '@rentalshop/types';

/**
 * ✅ MODERN ADMIN ORDERS PAGE - URL STATE PATTERN
 * 
 * Architecture:
 * ✅ URL params as single source of truth
 * ✅ Clean data fetching with useOrdersData hook
 * ✅ No duplicate state management
 * ✅ Load ALL orders from ALL merchants (admin view)
 */
export default function AdminOrdersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, toastError, toastWarning } = useToast();
  const canExport = useCanExportData();
  const formatMoney = useFormatCurrency();

  // ============================================================================
  // QUICK FILTER STATE - Modern time-based filtering
  // ============================================================================
  
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | undefined>(
    searchParams.get('quickFilter') || 'month' // ⭐ Default to Last 30 Days
  );
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<{ id: number; orderNumber: string; totalAmount: number } | null>(null);
  const [showBatchDeleteConfirmDialog, setShowBatchDeleteConfirmDialog] = useState(false);
  const [ordersToDeleteBatch, setOrdersToDeleteBatch] = useState<number[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================
  
  const search = searchParams.get('q') || '';
  const status = searchParams.get('status') || '';
  const orderType = searchParams.get('type') || '';
  const merchantId = searchParams.get('merchant') ? parseInt(searchParams.get('merchant')!) : undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  // ============================================================================
  // DATE FILTERS - Default to Last 30 Days (optimal performance)
  // ============================================================================
  
  // Memoize date range to prevent infinite loops
  // Get date params directly from URL - use strings, no Date objects
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');

  // ============================================================================
  // DATA FETCHING - Clean & Simple
  // ============================================================================
  
  // ✅ SIMPLE: Memoize filters - use strings directly, no Date objects
  const filters: OrderFilters = useMemo(() => ({
    search: search || undefined,
    status: (status as any) || undefined,
    orderType: (orderType as any) || undefined,
    merchantId: merchantId, // ⭐ Admin can filter by merchant
    startDate: startDateParam || undefined, // ⭐ String from URL params
    endDate: endDateParam || undefined,     // ⭐ String from URL params
    page,
    limit,
    sortBy,
    sortOrder
  }), [search, status, orderType, merchantId, startDateParam, endDateParam, page, limit, sortBy, sortOrder]);

  const { data, loading, error, refetch } = useOrdersData({ filters });
  
  console.log('📊 Admin Orders Page - Current state:', {
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
    if ('merchantId' in newFilters) {
      updates.merchant = newFilters.merchantId?.toString();
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
  
  const handleOrderAction = useCallback(async (action: string, orderNumberOrCustomerId: string | number) => {
    switch (action) {
      case 'view':
        router.push(`/orders/${orderNumberOrCustomerId}`);
        break;
        
      case 'edit':
        // For admin, navigate to detail page
        router.push(`/orders/${orderNumberOrCustomerId}/edit`);
        break;
        
      case 'viewCustomer':
        // Navigate to client customer page
        // Get client URL from environment or construct from current origin
        const customerId = orderNumberOrCustomerId;
        let clientUrl = '';
        
        if (typeof window !== 'undefined') {
          // Try environment variable first
          if (process.env.NEXT_PUBLIC_CLIENT_URL) {
            clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL;
          } else {
            // Fallback: construct client URL from current origin
            // If admin is on port 3001, client might be on 3000, or vice versa
            const origin = window.location.origin;
            // Remove /admin path if exists
            const baseUrl = origin.replace(/\/admin$/, '').replace(/\/admin\//, '/');
            // In development, try to switch port (3001 -> 3000)
            if (origin.includes(':3001')) {
              clientUrl = origin.replace(':3001', ':3000');
            } else if (origin.includes(':3000')) {
              clientUrl = origin; // Already on client port
            } else {
              clientUrl = baseUrl; // Production: same domain
            }
          }
          
          // Open customer page in new tab
          window.open(`${clientUrl}/customers/${customerId}`, '_blank');
        }
        break;
        
      case 'delete':
        // Find order by number to get ID
        const order = data?.orders.find(o => o.orderNumber === orderNumberOrCustomerId);
        if (order) {
          // Set order to delete and show confirmation dialog
          setOrderToDelete({ 
            id: order.id, 
            orderNumber: order.orderNumber,
            totalAmount: order.totalAmount || 0
          });
          setShowDeleteConfirmDialog(true);
        }
        break;
        
      default:
        console.log('Order action:', action, orderNumberOrCustomerId);
    }
  }, [router, data?.orders]);

  // Handle batch delete
  const handleBatchDelete = useCallback(async (orderIds: number[]) => {
    // ADMIN can delete any orders, others can only delete CANCELLED orders
    const isAdmin = user?.role === 'ADMIN';
    
    if (!isAdmin) {
      // Validate all selected orders are CANCELLED for non-admin users
    const selectedOrders = data?.orders.filter(o => orderIds.includes(o.id)) || [];
    const allCancelled = selectedOrders.every(o => o.status === 'CANCELLED');
    
    if (!allCancelled) {
      toastError(
        'Error',
        'Only CANCELLED orders can be deleted'
      );
      return;
      }
    }

    // Set orders to delete and show confirmation dialog
    setOrdersToDeleteBatch(orderIds);
    setShowBatchDeleteConfirmDialog(true);
  }, [data?.orders, user?.role, toastError]);

  // Confirm batch delete
  const confirmBatchDelete = useCallback(async () => {
    if (ordersToDeleteBatch.length === 0) return;

    try {
      const response = await ordersApi.batchDeleteOrders(ordersToDeleteBatch);
      
      if (response.success) {
        toastSuccess(
          'Success',
          `${response.data?.deleted || ordersToDeleteBatch.length} orders deleted successfully`
        );
        
        // Clear selection
        setSelectedOrderIds([]);
        setOrdersToDeleteBatch([]);
        setShowBatchDeleteConfirmDialog(false);
        
        // Refetch data
        refetch();
      } else {
        toastError(
          'Error',
          response.message || 'Failed to delete orders'
        );
      }
    } catch (error: any) {
      console.error('Error deleting orders:', error);
      toastError(
        'Error',
        error.message || 'Failed to delete orders'
      );
    }
  }, [ordersToDeleteBatch, toastSuccess, toastError, refetch]);

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
      };
    }

    const mappedOrders = data.orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      customerId: order.customer?.id,
      customerName: (order as any).customerName || 
                   (order.customer ? [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ').trim() || 'Unknown' : 'Unknown'),
      customerPhone: (order as any).customerPhone || order.customer?.phone || '',
      outletId: order.outlet?.id || (order as any).outletId || 0,
      outletName: (order as any).outletName || order.outlet?.name || 'Unknown',
      merchantName: (order as any).merchantName || order.outlet?.merchant?.name || 'Unknown',
      createdById: (order as any).createdById || (order as any).createdBy?.id || 0,
      createdByName: (order as any).createdByName || (order as any).createdBy?.name || 'Unknown',
      orderItems: order.orderItems || [],
      itemCount: order.orderItems?.length || 0,
      paymentCount: order.payments?.length || (order as any).paymentCount || 0,
      totalPaid: (order as any).totalPaid || order.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      pickupPlanAt: order.pickupPlanAt ? (order.pickupPlanAt instanceof Date ? order.pickupPlanAt.toISOString() : order.pickupPlanAt) : undefined,
      returnPlanAt: order.returnPlanAt ? (order.returnPlanAt instanceof Date ? order.returnPlanAt.toISOString() : order.returnPlanAt) : undefined,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
    }));

    return {
      items: mappedOrders, // Required by BaseSearchResult
      orders: mappedOrders, // Alias for backward compatibility
      total: data.total,
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      limit: data.limit,
      hasMore: data.hasMore,
    };
  }, [data]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>All Orders</PageTitle>
            <p className="text-sm text-gray-600">View and manage all orders from all merchants</p>
          </div>
          <div className="flex gap-3">
            {canExport && (
              <Button
                onClick={() => setShowExportDialog(true)}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            )}
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0">
        {loading && !data ? (
          <OrdersLoading />
        ) : (
        <Orders
          data={orderData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onOrderAction={handleOrderAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
          onDateRangeChange={handleDateRangeChange}
          onSelectionChange={setSelectedOrderIds}
          onBatchDelete={handleBatchDelete}
          activeQuickFilter={activeQuickFilter}
          showQuickFilters={true}
          filterStyle="dropdown"
          showStats={false}
          showMerchant={true}
          userRole="ADMIN"
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
            
            toastSuccess('Success', 'Export completed successfully');
            setShowExportDialog(false);
          } catch (error) {
            toastError('Error', (error as Error).message || 'Failed to export orders');
          } finally {
            setIsExporting(false);
          }
        }}
      />

      {/* Delete Order Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteConfirmDialog}
        onOpenChange={setShowDeleteConfirmDialog}
        type="danger"
        title="Delete Order"
        description={
          orderToDelete 
            ? `Are you sure you want to delete this order?\n\n📋 Order Number: ${orderToDelete.orderNumber}\n💰 Total Amount: ${formatMoney(orderToDelete.totalAmount)}\n\nThis action cannot be undone.`
            : 'Are you sure you want to delete this order?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          if (!orderToDelete) return;
          try {
            const response = await ordersApi.deleteOrder(orderToDelete.id);
            if (response.success) {
              toastSuccess('Order deleted successfully', 'Order deleted successfully');
              setShowDeleteConfirmDialog(false);
              setOrderToDelete(null);
              // Force re-fetch
              refetch();
            }
            // Error automatically handled by useGlobalErrorHandler
          } catch (error) {
            // Error automatically handled by useGlobalErrorHandler
          }
        }}
        onCancel={() => {
          setShowDeleteConfirmDialog(false);
          setOrderToDelete(null);
        }}
      />

      {/* Batch Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showBatchDeleteConfirmDialog}
        onOpenChange={setShowBatchDeleteConfirmDialog}
        type="danger"
        title="Delete Selected Orders"
        description={
          user?.role === 'ADMIN'
            ? `Are you sure you want to delete the selected orders?\n\n📋 ${ordersToDeleteBatch.length} orders selected\n\nThis action cannot be undone.`
            : `Are you sure you want to delete the selected orders?\n\n📋 ${ordersToDeleteBatch.length} orders selected\n\nThis action cannot be undone. Only CANCELLED orders can be deleted.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmBatchDelete}
        onCancel={() => {
          setShowBatchDeleteConfirmDialog(false);
          setOrdersToDeleteBatch([]);
        }}
      />
    </PageWrapper>
  );
}

