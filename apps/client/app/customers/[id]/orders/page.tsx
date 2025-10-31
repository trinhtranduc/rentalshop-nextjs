'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Button, 
  CustomerPageHeader, 
  CustomerOrdersSummaryCard,
  Orders,
  PageWrapper,
  Breadcrumb
} from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { ArrowLeft } from 'lucide-react';
import { customersApi } from "@rentalshop/utils";
import { ordersApi } from "@rentalshop/utils";
import { useAuth } from '@rentalshop/hooks';
import type { Customer, OrderStatus, OrderFilters as OrderFiltersType } from '@rentalshop/types';

// Use the Order type from the types package to match API response
import type { Order } from '@rentalshop/types';

interface CustomerOrdersData {
  orders: Order[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

export default function CustomerOrdersPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const id = params.id as string; // Fix: use params.id instead of params.id
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Debug: Log when orders state changes
  useEffect(() => {
    console.log('🔍 CustomerOrdersPage: Orders state changed to:', orders.length, 'orders');
    console.log('🔍 CustomerOrdersPage: First order:', orders[0]);
  }, [orders]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  
  // Pagination and filters - Updated to match main orders page
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  
  // Initialize filters to match main orders page structure
  const [filters, setFilters] = useState<OrderFiltersType>({
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

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        
        console.log('🔍 CustomerOrdersPage: Fetching customer with public ID:', id);
        
        // Validate public ID format (should be numeric)
        const numericId = parseInt(id);
        if (isNaN(numericId) || numericId <= 0) {
          console.error('❌ CustomerOrdersPage: Invalid public ID format:', id);
          setCustomer(null);
          return;
        }
        
        console.log('🔍 CustomerOrdersPage: Making API call to /api/customers/' + numericId);
        
        // Use the real API to fetch customer data by public ID
        const response = await customersApi.getCustomerById(numericId);
        
        console.log('🔍 CustomerOrdersPage: API response received:', response);
        
        if (response.success && response.data) {
          console.log('✅ CustomerOrdersPage: Customer fetched successfully:', response.data);
          setCustomer(response.data);
        } else {
          console.error('❌ CustomerOrdersPage: API error:', response.error);
          throw new Error(response.error || 'Failed to fetch customer');
        }
        
      } catch (error) {
        console.error('❌ CustomerOrdersPage: Error fetching customer:', error);
        // Show error state
        setCustomer(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchCustomer();
    }
  }, [id]);

  // Fetch customer orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!customer) return;
      
      try {
        setIsLoadingOrders(true);
        
        console.log('🔍 CustomerOrdersPage: Fetching orders for customer:', customer.id);
        
        // SECURITY: All filtering must be done at the backend/database level
        // Frontend only sends the customer ID - backend handles role-based access control
        const apiFilters = {
          customerId: customer.id, // Filter orders by this specific customer
          limit: 10,
          offset: (currentPage - 1) * 10
        };

        // SECURITY: User role and outlet restrictions are handled by the backend API
        // The backend will automatically filter based on user's role and scope
        console.log('🔒 CustomerOrdersPage: Sending minimal filters to backend - backend handles security');
        console.log('🔒 CustomerOrdersPage: User role:', user?.role);
        console.log('🔒 CustomerOrdersPage: User outlet ID:', user?.outletId);

        console.log('🔍 CustomerOrdersPage: API filters:', apiFilters);
        console.log('🔍 CustomerOrdersPage: API endpoint will be:', `/api/orders?customerId=${customer.id}&limit=10&offset=${(currentPage - 1) * 10}${filters.status !== undefined ? `&status=${filters.status}` : ''}${filters.orderType !== undefined ? `&orderType=${filters.orderType}` : ''}${filters.outlet ? `&outlet=${filters.outlet}` : ''}${filters.dateRange?.start && filters.dateRange?.end ? `&startDate=${filters.dateRange.start}&endDate=${filters.dateRange.end}` : ''}${filters.search ? `&q=${filters.search}` : ''}&sortBy=${filters.sortBy}&sortOrder=${filters.sortOrder}`);

        const response = await ordersApi.searchOrders(apiFilters);
        
        if (response.success && response.data) {
          console.log('✅ CustomerOrdersPage: Orders fetched successfully:', response.data);
          console.log('🔍 CustomerOrdersPage: Orders data:', response.data);
          console.log('🔍 CustomerOrdersPage: Setting orders state with:', response.data?.orders?.length || 0, 'orders');
          setOrders(response.data?.orders || []);
          setTotalOrders(response.data?.total || 0);
          setTotalPages(Math.ceil((response.data?.total || 0) / 10));
        } else {
          console.error('❌ CustomerOrdersPage: API error:', response);
          setOrders([]);
          setTotalOrders(0);
          setTotalPages(1);
        }
        
      } catch (error) {
        console.error('❌ CustomerOrdersPage: Error fetching orders:', error);
        setOrders([]);
        setTotalOrders(0);
        setTotalPages(1);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    if (customer) {
      fetchOrders();
    }
  }, [customer, currentPage]); // Removed filters dependency since we removed frontend filtering

  // SECURITY: Frontend filtering removed - all filtering is handled securely by backend
  // This prevents security vulnerabilities where hackers could bypass filters

  // Handle search change
  const handleSearchChange = (searchValue: string) => {
    setFilters(prev => ({ ...prev, search: searchValue }));
    setCurrentPage(1);
  };

  // Handle filters change
  const handleFiltersChange = (newFilters: Partial<OrderFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  // Handle clear filters
  const handleClearFilters = () => {
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
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle order action
  const handleOrderAction = (action: string, orderNumber: string) => {
    console.log('🔍 CustomerOrdersPage: Order action:', action, orderNumber);
    
    switch (action) {
      case 'view':
        router.push(`/orders/${orderNumber}`);
        break;
      case 'edit':
        router.push(`/orders/${orderNumber}/edit`);
        break;
      default:
        console.log('🔍 CustomerOrdersPage: Unknown order action:', action);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <PageWrapper>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
      </PageWrapper>
    );
  }

  // Error state
  if (!customer) {
    return (
      <PageWrapper>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Customer Not Found</h1>
            <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push('/customers')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </div>
      </PageWrapper>
    );
  }

  // Breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Customers', href: '/customers' },
    { label: `${customer.firstName} ${customer.lastName}`, href: `/customers/${id}` },
    { label: 'Orders' }
  ];

  return (
    <PageWrapper>
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} showHome={false} className="mb-6" />
        {/* Customer Summary Card */}
        <div className="mb-8">
          <CustomerOrdersSummaryCard 
            customer={customer}
            orderStats={{
              totalOrders: totalOrders,
              totalRevenue: Array.isArray(orders) ? orders.reduce((sum, order) => sum + order.totalAmount, 0) : 0,
              averageOrderValue: totalOrders > 0 && Array.isArray(orders) ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / totalOrders : 0,
              lastOrderDate: Array.isArray(orders) && orders.length > 0 ? orders[0].createdAt : undefined
            }}
          />
        </div>

        {/* Orders - Use shared Orders component for consistent UI */}
        <Orders
          data={{
            orders: orders as any,
            total: totalOrders,
            hasMore: currentPage < totalPages,
            page: currentPage,
            currentPage: currentPage,
            limit: 20,
            totalPages: totalPages,
            filters: filters,
            stats: undefined
          }}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
          onOrderAction={handleOrderAction}
          onPageChange={handlePageChange}
          onSort={(column: string) => {
            const newSortOrder = filters.sortBy === column && filters.sortOrder === 'desc' ? 'asc' : 'desc';
            handleFiltersChange({ sortBy: column, sortOrder: newSortOrder });
          }}
          showStats={false}
        />
    </PageWrapper>
  );
}
