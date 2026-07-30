'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Breadcrumb,
  Button,
  CustomerOrdersSummaryCard,
  Orders,
  PageWrapper,
} from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { useAuth, useDedupedApi } from '@rentalshop/hooks';
import { customersApi, ordersApi } from '@rentalshop/utils';
import type { Customer, Order, OrderFilters as OrderFiltersType } from '@rentalshop/types';

/**
 * Admin customer orders — same pattern as client `/customers/[id]/orders`.
 * Uses dedicated `/api/customers/{id}/orders` so customerId is always in the path
 * (not the generic `/api/orders` list, which previously dropped customerId).
 */
export default function AdminCustomerOrdersPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const [filters, setFilters] = useState<OrderFiltersType>({
    search: '',
    status: undefined,
    orderType: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const {
    data: customerData,
    loading: customerLoading,
  } = useDedupedApi({
    filters: { _hook: 'adminCustomerDetail', customerId: id },
    fetchFn: async () => {
      const numericId = parseInt(id, 10);
      if (!Number.isFinite(numericId) || numericId <= 0) {
        throw new Error('Invalid customer ID format');
      }

      const response = await customersApi.getCustomerById(numericId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch customer');
      }
      return response.data;
    },
    enabled: !!id,
    staleTime: 60000,
    cacheTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    setCustomer(customerData || null);
    setIsLoading(customerLoading);
  }, [customerData, customerLoading]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!customer?.id) return;

      try {
        setIsLoadingOrders(true);
        // Dedicated endpoint — customer id is in the URL path
        const response = await ordersApi.getOrdersByCustomer(customer.id, currentPage, 25);

        if (response.success && response.data) {
          setOrders(response.data.orders || []);
          setTotalOrders(response.data.total || 0);
          setTotalPages(response.data.totalPages || 1);
        } else {
          setOrders([]);
          setTotalOrders(0);
          setTotalPages(1);
        }
      } catch (error) {
        console.error('AdminCustomerOrdersPage: Error fetching orders:', error);
        setOrders([]);
        setTotalOrders(0);
        setTotalPages(1);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [customer, currentPage]);

  const handleSearchChange = (searchValue: string) => {
    setFilters((prev) => ({ ...prev, search: searchValue }));
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: Partial<OrderFiltersType>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: undefined,
      orderType: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    setCurrentPage(1);
  };

  const handleOrderAction = (action: string, orderNumber: string) => {
    switch (action) {
      case 'view':
        router.push(`/orders/${orderNumber}`);
        break;
      case 'edit':
        router.push(`/orders/${orderNumber}/edit`);
        break;
      default:
        break;
    }
  };

  if (isLoading || isLoadingOrders && !customer) {
    return (
      <PageWrapper>
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-1/4 rounded bg-gray-200" />
          <div className="mb-8 h-4 w-1/2 rounded bg-gray-200" />
          <div className="space-y-4">
            <div className="h-32 rounded bg-gray-200" />
            <div className="h-32 rounded bg-gray-200" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!customer) {
    return (
      <PageWrapper>
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">Customer Not Found</h1>
          <p className="mb-6 text-gray-600">
            The customer you are looking for does not exist or has been removed.
          </p>
          <Button onClick={() => router.push('/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const customerName =
    [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Customer';

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Customers', href: '/customers' },
    { label: customerName },
    { label: 'Orders' },
  ];

  const billableOrders = orders.filter((order) => order.status !== 'CANCELLED');
  const totalRevenue = billableOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

  return (
    <PageWrapper>
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/dashboard" className="mb-6" />

      <div className="mb-8">
        <CustomerOrdersSummaryCard
          customer={customer}
          orderStats={{
            totalOrders,
            totalRevenue,
            averageOrderValue: billableOrders.length > 0 ? totalRevenue / billableOrders.length : 0,
            lastOrderDate: orders.length > 0 ? orders[0].createdAt : undefined,
          }}
        />
      </div>

      <Orders
        data={{
          orders: orders as any,
          total: totalOrders,
          hasMore: currentPage < totalPages,
          currentPage,
          limit: 25,
          totalPages,
          stats: undefined,
        }}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSearchChange={handleSearchChange}
        onClearFilters={handleClearFilters}
        onOrderAction={handleOrderAction}
        onPageChange={setCurrentPage}
        onSort={(column: string) => {
          const newSortOrder =
            filters.sortBy === column && filters.sortOrder === 'desc' ? 'asc' : 'desc';
          handleFiltersChange({ sortBy: column, sortOrder: newSortOrder });
        }}
        showStats={false}
        showMerchant={true}
        userRole={(user?.role as 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF') || 'ADMIN'}
      />
    </PageWrapper>
  );
}
