'use client';

import React, { useState, useEffect } from 'react';
import { merchantsApi } from '@rentalshop/utils';
import { useParams, useRouter } from 'next/navigation';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Orders,
  Button,
  useToasts,
  ToastContainer
} from '@rentalshop/ui';
import { ArrowLeft, Plus } from 'lucide-react';
import type { Order, OrderFilters, OrdersData } from '@rentalshop/types';

interface OrderData {
  orders: Order[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
  stats?: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
  };
}

export default function MerchantOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const { toasts, showInfo, removeToast } = useToasts();
  const merchantId = params.id as string;
  
  const [orderData, setOrderData] = useState<OrderData>({
    orders: [],
    total: 0,
    currentPage: 1,
    totalPages: 1,
    hasMore: false,
    stats: {
      total: 0,
      active: 0,
      completed: 0,
      cancelled: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<OrderFilters>({
    limit: 20,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  useEffect(() => {
    fetchOrders();
  }, [merchantId, filters]);

  const fetchOrders = async () => {
    try {
      console.log('fetchOrders called with filters:', filters);
      setLoading(true);
      
      // Use centralized API client with automatic authentication and error handling
      const queryParams = new URLSearchParams();
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.orderType) queryParams.append('orderType', filters.orderType);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.offset) queryParams.append('offset', filters.offset.toString());
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

      const response = await merchantsApi.orders.list(parseInt(merchantId), queryParams.toString());
      const data = await response.json();

      if (data.success) {
        // Transform the API response to match OrderTable component expectations
        const transformedOrders = (data.data.orders || []).map((order: any) => ({
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
          // Transform nested objects to flat properties expected by OrderTable
          customerName: order.customer?.name || 'Unknown Customer',
          customerPhone: order.customer?.phone || '',
          outletName: order.outlet?.name || 'Unknown Outlet',
          merchantName: `Merchant ${merchantId}`, // Since this is merchant-specific page
          // Keep original nested objects for other uses
          customer: order.customer,
          outlet: order.outlet
        }));

        setOrderData({
          orders: transformedOrders,
          total: data.data.total || 0,
          currentPage: Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1,
          totalPages: Math.ceil((data.data.total || 0) / (filters.limit || 20)),
          hasMore: (filters.offset || 0) + (filters.limit || 20) < (data.data.total || 0),
          stats: data.data.stats || {
            total: 0,
            active: 0,
            completed: 0,
            cancelled: 0
          }
        });
      } else {
        setError(data.message || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: OrderFilters) => {
    setFilters(newFilters);
  };

  const handleSearchChange = (searchValue: string) => {
    setFilters(prev => ({ ...prev, search: searchValue, offset: 0 }));
  };

  const handleClearFilters = () => {
    setFilters({ 
      limit: 20, 
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const handleOrderAction = (action: string, orderId: string) => {
    switch (action) {
      case 'view':
        router.push(`/merchants/${merchantId}/orders/${orderId}`);
        break;
      case 'edit':
        router.push(`/merchants/${merchantId}/orders/${orderId}/edit`);
        break;
      case 'create':
        router.push(`/merchants/${merchantId}/orders/create`);
        break;
      default:
        console.log('Order action:', action, orderId);
    }
  };

  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * (filters.limit || 20);
    setFilters(prev => ({ ...prev, offset: newOffset }));
  };

  const handleSort = (column: string) => {
    console.log('handleSort called with column:', column);
    console.log('Current filters:', filters);
    const newSortOrder = filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    console.log('New sort order:', newSortOrder);
    setFilters(prev => ({ 
      ...prev, 
      sortBy: column, 
      sortOrder: newSortOrder,
      offset: 0 // Reset to first page when sorting
    }));
  };



  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  if (error) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-medium mb-2">Error Loading Orders</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {error}
            </p>
            <button
              onClick={() => router.push(`/merchants/${merchantId}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Back to Merchant
            </button>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <>
    <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/merchants/${merchantId}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Merchant
            </Button>
            <PageTitle subtitle={`Manage orders for merchant ${merchantId}`}>
              Merchant Orders
            </PageTitle>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Implement export functionality
                showInfo('Export Feature', 'Export functionality coming soon!');
              }}
            >
              Export
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => router.push(`/merchants/${merchantId}/orders/create`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
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
