'use client';

import React, { useCallback, useMemo } from 'react';
import { 
  OrdersLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { Orders } from '../../components/Orders';
import { useRouter } from 'next/navigation';
import { useAuth, useOrderManagement, useToastHandler } from '@rentalshop/hooks';
import { PAGINATION } from '@rentalshop/constants';

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess, showError } = useToastHandler();
  
  // Use the order management hook
  const {
    orders,
    loading,
    searchTerm,
    statusFilter,
    orderTypeFilter,
    outletFilter,
    dateRangeFilter,
    sortBy,
    sortOrder,
    pagination,
    stats,
    handleSearchChange,
    handleFiltersChange,
    handleClearFilters,
    handlePageChange,
    handleSort,
    handlePickupOrder,
    handleReturnOrder,
    handleCancelOrder,
    refreshOrders,
    refreshStats
  } = useOrderManagement({
    initialLimit: PAGINATION.DEFAULT_PAGE_SIZE,
    useSearchOrders: true,
    enableStats: true
  });

  // Enhanced order action handlers with toast notifications
  const handleOrderAction = useCallback(async (action: string, orderNumber: string) => {
    // Extract numeric part for URL (e.g., "2110" from "ORD-2110")
    const numericOrderNumber = orderNumber.replace(/^ORD-/, '');
    
    switch (action) {
      case 'view':
        router.push(`/orders/${numericOrderNumber}`);
        break;
      case 'pickup':
        // Find the order by orderNumber to get the ID for API calls
        const order = orders.find(o => o.orderNumber === orderNumber);
        if (order) {
          const result = await handlePickupOrder(order.publicId);
          if (result.success) {
            showSuccess('Order Confirmed', 'Order has been confirmed successfully!');
          } else {
            showError('Update Failed', result.error || 'An error occurred while updating the order');
          }
        }
        break;
      case 'return':
        const orderForReturn = orders.find(o => o.orderNumber === orderNumber);
        if (orderForReturn) {
          const result = await handleReturnOrder(orderForReturn.publicId);
          if (result.success) {
            showSuccess('Order Returned', 'Order has been returned successfully!');
          } else {
            showError('Update Failed', result.error || 'An error occurred while updating the order');
          }
        }
        break;
      case 'cancel':
        const orderForCancel = orders.find(o => o.orderNumber === orderNumber);
        if (orderForCancel) {
          if (!confirm('Are you sure you want to cancel this order?')) return;
          const result = await handleCancelOrder(orderForCancel.publicId);
          if (result.success) {
            showSuccess('Order Cancelled', 'Order has been cancelled successfully!');
          } else {
            showError('Cancellation Failed', result.error || 'An error occurred while cancelling the order');
          }
        }
        break;
      case 'edit':
        router.push(`/orders/${numericOrderNumber}/edit`);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [orders, router, handlePickupOrder, handleReturnOrder, handleCancelOrder, showSuccess, showError]);


  // Debug stats
  console.log('Client orders page - stats received:', stats);
  console.log('Client orders page - orders count:', orders.length);

  // Transform the data to match the refactored Orders component interface - memoized to prevent unnecessary re-renders
  const orderData = useMemo(() => ({
    orders: orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      customerId: order.customer?.id || '',
      customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Unknown',
      customerPhone: order.customer?.phone || '',
      outletId: order.outlet?.id || '',
      outletName: order.outlet?.name || '',
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      pickupPlanAt: order.pickupPlanAt ? (order.pickupPlanAt instanceof Date ? order.pickupPlanAt.toISOString() : order.pickupPlanAt) : undefined,
      returnPlanAt: order.returnPlanAt ? (order.returnPlanAt instanceof Date ? order.returnPlanAt.toISOString() : order.returnPlanAt) : undefined,
      pickedUpAt: order.pickedUpAt ? (order.pickedUpAt instanceof Date ? order.pickedUpAt.toISOString() : order.pickedUpAt) : undefined,
      returnedAt: order.returnedAt ? (order.returnedAt instanceof Date ? order.returnedAt.toISOString() : order.returnedAt) : undefined,
      createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
      updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
      orderItems: [], // Not available in OrderSearchResult
      payments: [] // Not available in OrderSearchResult
    })),
    total: pagination.total,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    limit: pagination.limit,
    stats: {
      totalOrders: stats?.stats?.totalOrders || 0,
      pendingOrders: stats?.stats?.pendingOrders || 0,
      activeOrders: stats?.stats?.activeRentals || 0, // Map activeRentals to activeOrders
      completedOrders: stats?.stats?.completedOrders || 0,
      cancelledOrders: stats?.stats?.cancelledOrders || 0,
      totalRevenue: stats?.stats?.totalRevenue || 0,
      totalDeposits: stats?.stats?.totalDeposits || 0,
      averageOrderValue: stats?.stats?.averageOrderValue || 0,
      ordersThisMonth: stats?.stats?.ordersThisMonth || 0,
      revenueThisMonth: stats?.stats?.revenueThisMonth || 0
    }
  }), [orders, pagination.total, pagination.currentPage, pagination.totalPages, pagination.limit, stats]);

  // Create filters object for the Orders component
  const filters = useMemo(() => ({
    search: searchTerm,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    orderType: orderTypeFilter !== 'all' ? orderTypeFilter : undefined,
    outletId: outletFilter !== 'all' ? parseInt(outletFilter) : undefined,
    dateRange: dateRangeFilter,
    sortBy,
    sortOrder
  }), [searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder]);

  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Order Management</PageTitle>
          <p className="text-sm text-gray-600">Manage orders and rental/sale transactions</p>
        </PageHeader>
        <PageContent>
          <OrdersLoading />
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <>
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Order Management</PageTitle>
            <p className="text-sm text-gray-600">Manage orders and rental/sale transactions</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                // TODO: Implement export functionality
                showSuccess('Export Feature', 'Export functionality coming soon!');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-md flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export
            </button>
            <button 
              onClick={() => router.push('/orders/create')}
              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4 rounded-md flex items-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Order
            </button>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <Orders
          data={orderData}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          onOrderAction={handleOrderAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </PageContent>
    </PageWrapper>
  </>
  );
} 