'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  OrdersLoading,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  useToasts,
  ToastContainer
} from '@rentalshop/ui';
import { Orders } from '../../components/Orders';
import { useRouter } from 'next/navigation';
import { useAuth } from '@rentalshop/hooks';
import type { OrderSearchResult, OrderInput, OrderType, OrderStatus, OrderFilters as OrderFiltersType, OrderWithDetails } from '@rentalshop/types';
import { ordersApi } from '@rentalshop/utils';

export default function OrdersPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { toasts, showSuccess, showError, removeToast } = useToasts();
  
  // State for orders and UI
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Initialize filters
  const [filters, setFilters] = useState<OrderFiltersType>({
    search: '',
    status: undefined,
    orderType: undefined,
    outletId: undefined,
    dateRange: {
      start: '',
      end: ''
    },
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Separate search state to prevent unnecessary re-renders
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const hasInitializedRef = useRef(false);

  const fetchOrders = useCallback(async () => {
    try {
      // Show appropriate loading state
      if (searchQuery !== undefined && hasInitializedRef.current) {
        setIsSearching(true); // Table-only loading for search operations
      } else if (!isInitialLoad) {
        setLoading(true); // Full page loading for other operations
      }
      
      console.log('🔍 fetchOrders called with params:', {
        search: searchQuery,
        status: filters.status,
        orderType: filters.orderType,
        outletId: filters.outletId,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: 10,
        offset: (currentPage - 1) * 10
      });

      const result = await ordersApi.searchOrders({
        search: searchQuery,
        status: filters.status,
        orderType: filters.orderType,
        outletId: filters.outletId,
        dateRange: filters.dateRange,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: 10,
        offset: (currentPage - 1) * 10
      });

      if (result.success && result.data) {
        const data = result.data;
        console.log('🔍 Orders API response:', data);
        
        // Handle the API response - data is already the orders array
        const orders = Array.isArray(data) ? data as OrderWithDetails[] : [];
        const total = orders.length;
        const totalPages = Math.ceil(total / 10);

        setOrders(orders);
        setTotalPages(totalPages);
        
        // If current page is beyond total pages after search, reset to page 1
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(1);
        }
      } else {
        console.error('API Error:', result.error);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setIsSearching(false);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
  }, [currentPage, searchQuery, filters.orderType, filters.status, filters.outletId, filters.sortBy, filters.sortOrder, isInitialLoad]); // Remove setCurrentPage, setOrders, setTotalPages, setLoading, setIsSearching, hasInitializedRef dependencies

  const fetchStats = useCallback(async () => {
    try {
      const result = await ordersApi.getOrderStats();
      
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Effect for initial load - only runs once
  useEffect(() => {
    fetchOrders();
    fetchStats();
    // Mark as initialized after first load
    hasInitializedRef.current = true;
  }, []); // Remove fetchOrders and fetchStats dependencies

  // Effect for all data changes - intelligently handles search vs. other operations
  useEffect(() => {
    if (hasInitializedRef.current) {
      fetchOrders();
    }
  }, [searchQuery, currentPage, filters.orderType, filters.status, filters.outletId, filters.sortBy, filters.sortOrder]); // Remove fetchOrders dependency

  // Effect for stats updates
  useEffect(() => {
    if (hasInitializedRef.current) {
      fetchStats();
    }
  }, []); // Remove fetchStats dependency

  // Separate handler for search changes - only updates search state
  const handleSearchChange = useCallback((searchValue: string) => {
    console.log('🔍 handleSearchChange called with:', searchValue);
    setSearchQuery(searchValue);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  // Handler for other filter changes - only reloads table data
  const handleFiltersChange = useCallback((newFilters: OrderFiltersType) => {
    // Check if the filters actually changed to prevent unnecessary updates
    const hasChanged = Object.keys(newFilters).some(key => 
      newFilters[key as keyof OrderFiltersType] !== filters[key as keyof OrderFiltersType]
    );
    
    if (hasChanged) {
      setFilters(newFilters);
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [filters]);

  // Handler for clearing all filters - only reloads table data
  const handleClearFilters = useCallback(() => {
    setFilters({
      search: '',
      status: undefined,
      orderType: undefined,
      outlet: '',
      dateRange: {
        start: '',
        end: ''
      },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setSearchQuery(''); // This will trigger the search effect to reload table
    setCurrentPage(1);
    // Don't call fetchOrders directly - let the search effect handle it
  }, []);

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
        if (order) await handlePickup(order.publicId);
        break;
      case 'return':
        const orderForReturn = orders.find(o => o.orderNumber === orderNumber);
        if (orderForReturn) await handleReturn(orderForReturn.publicId);
        break;
      case 'cancel':
        const orderForCancel = orders.find(o => o.orderNumber === orderNumber);
        if (orderForCancel) await handleCancel(orderForCancel.publicId);
        break;
      case 'edit':
        router.push(`/orders/${numericOrderNumber}/edit`);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }, [orders, router]);

  const handlePickup = useCallback(async (orderId: number) => {
    try {
      const result = await ordersApi.pickupOrder(orderId);

      if (result.success) {
        fetchOrders();
        fetchStats();
        showSuccess('Order Confirmed', 'Order has been confirmed successfully!');
      } else {
        throw new Error(result.error || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      showError('Update Failed', 'An error occurred while updating the order');
    }
  }, [fetchOrders, fetchStats]);

  const handleReturn = useCallback(async (orderId: number) => {
    try {
      const result = await ordersApi.returnOrder(orderId);

      if (result.success) {
        fetchOrders();
        fetchStats();
        showSuccess('Order Returned', 'Order has been returned successfully!');
      } else {
        throw new Error(result.error || 'Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      showError('Update Failed', 'An error occurred while updating the order');
    }
  }, [fetchOrders, fetchStats]);

  const handleCancel = useCallback(async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      const result = await ordersApi.cancelOrder(orderId);

      if (result.success) {
        fetchOrders();
        fetchStats();
        showSuccess('Order Cancelled', 'Order has been cancelled successfully!');
      } else {
        throw new Error(result.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      showError('Cancellation Failed', 'An error occurred while cancelling the order');
    }
  }, [fetchOrders, fetchStats]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSort = useCallback((column: string) => {
    // Map column names to sort values
    const columnMapping: Record<string, 'orderNumber' | 'createdAt' | 'pickupPlanAt' | 'returnPlanAt' | 'status' | 'totalAmount' | 'customerName' | 'orderType'> = {
      'orderNumber': 'orderNumber',
      'customerName': 'customerName',
      'orderType': 'orderType',
      'status': 'status',
      'totalAmount': 'totalAmount',
      'pickupPlanAt': 'pickupPlanAt',
      'returnPlanAt': 'returnPlanAt',
      'createdAt': 'createdAt'
    };
    
    const newSortBy = columnMapping[column] || 'createdAt';
    const newSortOrder = filters.sortBy === newSortBy && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    
    setFilters(prev => ({
      ...prev,
      sortBy: newSortBy,
      sortOrder: newSortOrder
    }));
    setCurrentPage(1); // Reset to first page when sorting changes
  }, [filters.sortBy, filters.sortOrder, setFilters, setCurrentPage]);

  // Transform the data to match the refactored Orders component interface - memoized to prevent unnecessary re-renders
  // MUST be defined before any conditional returns to follow React Rules of Hooks
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
    total: orders.length,
    currentPage,
    totalPages,
    limit: 10,
    stats: {
      totalOrders: stats?.totalOrders || 0,
      pendingOrders: stats?.pendingOrders || 0,
      activeOrders: stats?.activeOrders || 0,
      completedOrders: stats?.completedOrders || 0,
      cancelledOrders: stats?.cancelledOrders || 0,
      totalRevenue: stats?.totalRevenue || 0,
      totalDeposits: stats?.totalDeposits || 0,
      averageOrderValue: stats?.averageOrderValue || 0,
      ordersThisMonth: stats?.ordersThisMonth || 0,
      revenueThisMonth: stats?.revenueThisMonth || 0
    }
  }), [orders, currentPage, totalPages, stats]);

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
    <ToastContainer toasts={toasts} onClose={removeToast} />
  </>
  );
} 