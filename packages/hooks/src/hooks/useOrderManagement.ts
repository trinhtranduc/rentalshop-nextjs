"use client"

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePagination } from './usePagination';
import { useThrottledSearch } from './useThrottledSearch';
import { ordersApi } from '@rentalshop/utils';
import { PAGINATION } from '@rentalshop/constants';
import type { Order, OrderWithDetails, OrderFilters, OrderCreateInput, OrderUpdateInput, OrderType, OrderStatus } from '@rentalshop/types';

export interface UseOrderManagementOptions {
  initialLimit?: number;
  useSearchOrders?: boolean; // true for admin (searchOrders), false for client (getOrdersPaginated)
  enableStats?: boolean; // true for admin, false for client
  merchantId?: number; // For merchant-specific order management
  outletId?: number; // For outlet-specific order management
}

export interface UseOrderManagementReturn {
  // State
  orders: OrderWithDetails[];
  loading: boolean;
  searchTerm: string;
  statusFilter: string;
  orderTypeFilter: string;
  outletFilter: string;
  dateRangeFilter: { start: string; end: string };
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  selectedOrder: Order | OrderWithDetails | null;
  showOrderDetail: boolean;
  showCreateForm: boolean;
  showEditDialog: boolean;
  pagination: any;
  stats: any;
  
  // Actions
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
  setOrderTypeFilter: (orderType: string) => void;
  setOutletFilter: (outlet: string) => void;
  setDateRangeFilter: (dateRange: { start: string; end: string }) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
  setSelectedOrder: (order: Order | null) => void;
  setShowOrderDetail: (show: boolean) => void;
  setShowCreateForm: (show: boolean) => void;
  setShowEditDialog: (show: boolean) => void;
  
  // Handlers
  fetchOrders: (page?: number, searchQuery?: string, status?: string, orderType?: string, outlet?: string, dateRange?: { start: string; end: string }, sortBy?: string, sortOrder?: 'asc' | 'desc') => Promise<void>;
  handleViewOrder: (order: Order) => void;
  handleEditOrder: (order: Order) => void;
  handlePickupOrder: (orderId: number) => Promise<{ success: boolean; error?: string }>;
  handleReturnOrder: (orderId: number) => Promise<{ success: boolean; error?: string }>;
  handleCancelOrder: (orderId: number) => Promise<{ success: boolean; error?: string }>;
  handlePageChange: (page: number) => void;
  handleSearchChange: (searchValue: string) => void;
  handleFiltersChange: (filters: Partial<OrderFilters>) => void;
  handleClearFilters: () => void;
  handleSort: (column: string) => void;
  refreshOrders: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

export function useOrderManagement(options: UseOrderManagementOptions = {}): UseOrderManagementReturn {
  const {
    initialLimit = PAGINATION.DEFAULT_PAGE_SIZE,
    useSearchOrders = true,
    enableStats = false,
    merchantId,
    outletId
  } = options;

  // State
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState('all');
  const [outletFilter, setOutletFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedOrder, setSelectedOrder] = useState<Order | OrderWithDetails | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Pagination hook
  const { pagination, handlePageChange: paginationPageChange, updatePaginationFromResponse } = usePagination({
    initialLimit,
    initialOffset: 0
  });

  // Throttled search hook
  const { handleSearchChange: throttledSearchChange } = useThrottledSearch({
    minLength: 0,
    delay: 300,
    onSearch: (query: string) => {
      // Trigger search when throttled search completes
      fetchOrders(1, query, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
    }
  });

  // Fetch orders function - stable reference to prevent multiple calls
  const fetchOrders = useCallback(async (page: number = 1, searchQuery: string = '', status: string = 'all', orderType: string = 'all', outlet: string = 'all', dateRange: { start: string; end: string } = { start: '', end: '' }, sortByParam: string = 'createdAt', sortOrderParam: 'asc' | 'desc' = 'desc') => {
    try {
      setLoading(true);
      
      let response;
      
      if (useSearchOrders) {
        // Admin page uses searchOrders with filters
        const filters: OrderFilters = {
          search: searchQuery || undefined,
          status: status !== 'all' ? (status as OrderStatus) : undefined,
          orderType: orderType !== 'all' ? (orderType as OrderType) : undefined,
          outletId: outlet !== 'all' ? parseInt(outlet) : undefined,
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
          // Add pagination parameters
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          page: page
        };
        
        response = await ordersApi.searchOrders(filters);
      } else {
        // Client page uses getOrdersPaginated
        response = await ordersApi.getOrdersPaginated(page, pagination.limit);
      }
      
      if (response.success && response.data) {
        // Handle different response structures
        let ordersData: OrderWithDetails[];
        let total: number;
        let totalPagesCount: number;
        
        if (Array.isArray(response.data)) {
          // Direct array response
          ordersData = response.data as OrderWithDetails[];
          total = response.data.length;
          totalPagesCount = 1;
        } else if (response.data.orders) {
          // Nested response structure
          ordersData = response.data.orders as OrderWithDetails[];
          total = response.data.total || 0;
          totalPagesCount = response.data.totalPages || 1;
        } else {
          ordersData = [];
          total = 0;
          totalPagesCount = 1;
        }
        
        setOrders(ordersData);
        
        // Update pagination from response
        updatePaginationFromResponse({
          total,
          limit: pagination.limit,
          offset: (page - 1) * pagination.limit,
          hasMore: page < totalPagesCount
        });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, useSearchOrders, updatePaginationFromResponse]);

  // Fetch stats function
  const fetchStats = useCallback(async () => {
    if (!enableStats) return;
    
    try {
      console.log('Fetching order stats...');
      const response = await ordersApi.getOrderStats();
      console.log('Order stats response:', response);
      
      if (response.success && response.data) {
        console.log('Setting stats:', response.data);
        setStats(response.data);
      } else {
        console.error('Stats API failed:', response);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [enableStats]);

  // Effect for initial load and filter changes
  useEffect(() => {
    fetchOrders(1, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
  }, [searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder]);

  // Effect for stats
  useEffect(() => {
    if (enableStats) {
      fetchStats();
    }
  }, [enableStats, fetchStats]);

  // Handlers
  const handleViewOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetail(true);
  }, []);

  const handleEditOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowEditDialog(true);
  }, []);

  const handlePickupOrder = useCallback(async (orderId: number) => {
    try {
      const response = await ordersApi.pickupOrder(orderId);
      
      if (response.success) {
        await fetchOrders(pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
        if (enableStats) {
          await fetchStats();
        }
        return { success: true };
      } else {
        throw new Error(response.error || 'Failed to pickup order');
      }
    } catch (error) {
      console.error('Error picking up order:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [fetchOrders, fetchStats, pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder, enableStats]);

  const handleReturnOrder = useCallback(async (orderId: number) => {
    try {
      const response = await ordersApi.returnOrder(orderId);
      
      if (response.success) {
        await fetchOrders(pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
        if (enableStats) {
          await fetchStats();
        }
        return { success: true };
      } else {
        throw new Error(response.error || 'Failed to return order');
      }
    } catch (error) {
      console.error('Error returning order:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [fetchOrders, fetchStats, pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder, enableStats]);

  const handleCancelOrder = useCallback(async (orderId: number) => {
    try {
      const response = await ordersApi.cancelOrder(orderId);
      
      if (response.success) {
        await fetchOrders(pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
        if (enableStats) {
          await fetchStats();
        }
        return { success: true };
      } else {
        throw new Error(response.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [fetchOrders, fetchStats, pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder, enableStats]);

  const handlePageChange = useCallback((page: number) => {
    paginationPageChange(page);
    fetchOrders(page, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
  }, [paginationPageChange, fetchOrders, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder]);

  const handleSearchChange = useCallback((searchValue: string) => {
    setSearchTerm(searchValue);
    throttledSearchChange(searchValue);
  }, [throttledSearchChange]);

  const handleFiltersChange = useCallback((newFilters: Partial<OrderFilters>) => {
    if (newFilters.status !== undefined) {
      // Handle 'all' case for UI filter state (not part of OrderStatus type)
      const statusValue = newFilters.status as any;
      setStatusFilter(statusValue === 'all' ? 'all' : (Array.isArray(newFilters.status) ? newFilters.status[0] : newFilters.status) as string);
    }
    if (newFilters.orderType !== undefined) {
      // Handle 'all' case for UI filter state (not part of OrderType type)
      const orderTypeValue = newFilters.orderType as any;
      setOrderTypeFilter(orderTypeValue === 'all' ? 'all' : newFilters.orderType as string);
    }
    if (newFilters.outletId !== undefined) {
      // Handle 'all' case for UI filter state (outletId is number, not string)
      const outletIdValue = newFilters.outletId as any;
      setOutletFilter(outletIdValue === 'all' ? 'all' : newFilters.outletId.toString());
    }
    if (newFilters.startDate !== undefined || newFilters.endDate !== undefined) {
      setDateRangeFilter({
        start: newFilters.startDate?.toString() || '',
        end: newFilters.endDate?.toString() || ''
      });
    }
    if (newFilters.sortBy !== undefined) {
      setSortBy(newFilters.sortBy);
    }
    if (newFilters.sortOrder !== undefined) {
      setSortOrder(newFilters.sortOrder);
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setOrderTypeFilter('all');
    setOutletFilter('all');
    setDateRangeFilter({ start: '', end: '' });
    setSortBy('createdAt');
    setSortOrder('desc');
    throttledSearchChange('');
    paginationPageChange(1);
  }, [throttledSearchChange, paginationPageChange]);

  const handleSort = useCallback((column: string) => {
    const columnMapping: Record<string, string> = {
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
    const newSortOrder = sortBy === newSortBy && sortOrder === 'asc' ? 'desc' : 'asc';
    
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    paginationPageChange(1);
  }, [sortBy, sortOrder, paginationPageChange]);

  const refreshOrders = useCallback(async () => {
    await fetchOrders(pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder);
  }, [fetchOrders, pagination.currentPage, searchTerm, statusFilter, orderTypeFilter, outletFilter, dateRangeFilter, sortBy, sortOrder]);

  const refreshStats = useCallback(async () => {
    if (enableStats) {
      await fetchStats();
    }
  }, [fetchStats, enableStats]);

  return {
    // State
    orders,
    loading,
    searchTerm,
    statusFilter,
    orderTypeFilter,
    outletFilter,
    dateRangeFilter,
    sortBy,
    sortOrder,
    selectedOrder,
    showOrderDetail,
    showCreateForm,
    showEditDialog,
    pagination,
    stats,
    
    // Actions
    setSearchTerm: throttledSearchChange,
    setStatusFilter,
    setOrderTypeFilter,
    setOutletFilter,
    setDateRangeFilter,
    setSortBy,
    setSortOrder,
    setSelectedOrder,
    setShowOrderDetail,
    setShowCreateForm,
    setShowEditDialog,
    
    // Handlers
    fetchOrders,
    handleViewOrder,
    handleEditOrder,
    handlePickupOrder,
    handleReturnOrder,
    handleCancelOrder,
    handlePageChange,
    handleSearchChange,
    handleFiltersChange,
    handleClearFilters,
    handleSort,
    refreshOrders,
    refreshStats
  };
}
