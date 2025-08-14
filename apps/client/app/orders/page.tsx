'use client';

import React, { useState, useEffect } from 'react';
import { 
  Orders,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import type { OrderSearchResult, OrderInput, OrderType, OrderStatus } from '@rentalshop/database';
import { authenticatedFetch } from '@rentalshop/auth/browser';
import type { OrderData, OrderFilters as OrderFiltersType } from '../../../../packages/ui/src/components/features/Orders/types';

export default function OrdersPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<OrderSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState<OrderFiltersType>({
    search: '',
    status: '',
    orderType: '',
    outlet: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    console.log('🔄 Orders useEffect - currentPage changed to:', currentPage);
    fetchOrders();
  }, [currentPage]);

  // Separate effect for filters
  useEffect(() => {
    setCurrentPage(1);
    fetchOrders();
    fetchStats();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      console.log('🔍 fetchOrders called with currentPage:', currentPage);
      
      const params = new URLSearchParams({
        offset: ((currentPage - 1) * 10).toString(),
        limit: '10',
        ...(filters.search && { q: filters.search }),
        ...(filters.orderType && filters.orderType !== 'all' && { orderType: filters.orderType }),
        ...(filters.status && filters.status !== 'all' && { status: filters.status }),
        ...(filters.outlet && filters.outlet !== 'all' && { outletId: filters.outlet }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder })
      });

      console.log('🔍 API URL params:', params.toString());
      const response = await authenticatedFetch(`/api/orders?${params.toString()}`);

      console.log('🔍 API Response status:', response.status);

      if (response.status === 304) {
        console.log('🔍 304 Not modified - keeping existing orders');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 API Response data:', data);
        console.log('🔍 Orders count:', data.data.orders?.length);
        console.log('🔍 Total pages:', data.data.totalPages);
        
        setOrders(data.data.orders);
        setTotalPages(data.data.totalPages || 1);
      } else {
        console.error('🔍 API Error:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await authenticatedFetch('/api/orders/stats');

      if (response.ok) {
        const data = await response.json();
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleOrderAction = async (action: string, orderNumber: string) => {
    switch (action) {
      case 'view':
        router.push(`/orders/${orderNumber}`);
        break;
      case 'pickup':
        // Find the order by orderNumber to get the ID for API calls
        const order = orders.find(o => o.orderNumber === orderNumber);
        if (order) await handlePickup(order.id);
        break;
      case 'return':
        const orderForReturn = orders.find(o => o.orderNumber === orderNumber);
        if (orderForReturn) await handleReturn(orderForReturn.id);
        break;
      case 'cancel':
        const orderForCancel = orders.find(o => o.orderNumber === orderNumber);
        if (orderForCancel) await handleCancel(orderForCancel.id);
        break;
      case 'edit':
        router.push(`/orders/${orderNumber}/edit`);
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const handlePickup = async (orderId: string) => {
    try {
      const response = await authenticatedFetch(`/api/orders?orderId=${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'ACTIVE',
          pickedUpAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        fetchOrders();
        fetchStats();
        alert('Đã xác nhận nhận hàng!');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Có lỗi xảy ra khi cập nhật đơn hàng');
    }
  };

  const handleReturn = async (orderId: string) => {
    try {
      const response = await authenticatedFetch(`/api/orders?orderId=${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'COMPLETED',
          returnedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        fetchOrders();
        fetchStats();
        alert('Đã xác nhận trả hàng!');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Có lỗi xảy ra khi cập nhật đơn hàng');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) return;

    try {
      const response = await authenticatedFetch(`/api/orders?orderId=${orderId}`, {
        method: 'DELETE',
        body: JSON.stringify({
          reason: 'Hủy bởi nhân viên',
        }),
      });

      if (response.ok) {
        fetchOrders();
        fetchStats();
        alert('Đã hủy đơn hàng!');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Có lỗi xảy ra khi hủy đơn hàng');
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (column: string) => {
    // Map column names to sort values
    const columnMapping: Record<string, 'orderNumber' | 'createdAt' | 'pickupPlanAt' | 'returnPlanAt' | 'status' | 'totalAmount' | 'customerName'> = {
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Transform the data to match the refactored Orders component interface
  const orderData: OrderData = {
    orders: orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: (() => {
        switch (order.status) {
          case 'OVERDUE':
            return 'ACTIVE';
          case 'DAMAGED':
            return 'CANCELLED';
          default:
            return order.status;
        }
      })(),
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
  };

  return (
    <PageWrapper>
      <PageHeader>
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>Quản lý đơn hàng</PageTitle>
            <p className="text-sm text-gray-600">Quản lý đơn hàng và giao dịch thuê/bán</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                // TODO: Implement export functionality
                alert('Export functionality coming soon!');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-4 rounded-md flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Trích xuất
            </button>
            <button 
              onClick={() => router.push('/orders/create')}
              className="bg-green-600 hover:bg-green-700 text-white h-9 px-4 rounded-md flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Tạo đơn hàng
            </button>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        <Orders
          data={orderData}
          filters={filters}
          onFiltersChange={setFilters}
          onOrderAction={handleOrderAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </PageContent>
    </PageWrapper>
  );
} 