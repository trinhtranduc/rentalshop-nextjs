'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Button, 
  CustomerPageHeader, 
  CustomerOrdersSummaryCard,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@rentalshop/ui';
import { 
  ArrowLeft,
  ShoppingBag,
  Calendar,
  DollarSign,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { customersApi } from "@rentalshop/utils";
import { ordersApi } from "@rentalshop/utils";
import type { Customer, OrderStatus } from '@rentalshop/types';

// Simplified Order interface for this page
interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  pickupPlanAt?: string;
  returnPlanAt?: string;
}

interface CustomerOrdersData {
  orders: Order[];
  total: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

interface CustomerOrdersFilters {
  search: string;
  status: OrderStatus | 'all';
  sortBy: 'createdAt' | 'pickupPlanAt' | 'returnPlanAt' | 'status';
  sortOrder: 'asc' | 'desc';
}

export default function CustomerOrdersPage() {
  const router = useRouter();
  const params = useParams();
  const publicId = params.publicId as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Debug: Log when orders state changes
  useEffect(() => {
    console.log('🔍 CustomerOrdersPage: Orders state changed to:', orders.length, 'orders');
    console.log('🔍 CustomerOrdersPage: First order:', orders[0]);
  }, [orders]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  
  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [filters, setFilters] = useState<CustomerOrdersFilters>({
    search: '',
    status: 'all' as OrderStatus | 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Fetch customer data
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        
        console.log('🔍 CustomerOrdersPage: Fetching customer with public ID:', publicId);
        
        // Validate public ID format (should be numeric)
        const numericId = parseInt(publicId);
        if (isNaN(numericId) || numericId <= 0) {
          console.error('❌ CustomerOrdersPage: Invalid public ID format:', publicId);
          setCustomer(null);
          return;
        }
        
        console.log('🔍 CustomerOrdersPage: Making API call to /api/customers/' + publicId);
        
        // Use the real API to fetch customer data by public ID
        const response = await customersApi.getCustomerByPublicId(publicId);
        
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

    if (publicId) {
      fetchCustomer();
    }
  }, [publicId]);

  // Fetch customer orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!customer) return;
      
      try {
        setIsLoadingOrders(true);
        
        console.log('🔍 CustomerOrdersPage: Fetching orders for customer:', customer.id);
        
        // Build API parameters for customer orders
        const apiFilters = {
          customerId: customer.id, // Filter orders by this specific customer
          limit: 10,
          offset: (currentPage - 1) * 10,
          ...(filters.status !== 'all' && { status: filters.status }),
          ...(filters.search && { q: filters.search }), // Use 'q' for search to match API
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder
        };

        console.log('🔍 CustomerOrdersPage: API filters:', apiFilters);
        console.log('🔍 CustomerOrdersPage: API endpoint will be:', `/api/orders?customerId=${customer.id}&limit=10&offset=${(currentPage - 1) * 10}${filters.status !== 'all' ? `&status=${filters.status}` : ''}${filters.search ? `&q=${filters.search}` : ''}&sortBy=${filters.sortBy}&sortOrder=${filters.sortOrder}`);

        const response = await ordersApi.getOrders(apiFilters);
        
        if (response.success && response.data) {
          console.log('✅ CustomerOrdersPage: Orders fetched successfully:', response.data);
          console.log('🔍 CustomerOrdersPage: Orders data:', response.data.orders);
          console.log('🔍 CustomerOrdersPage: Setting orders state with:', response.data.orders?.length || 0, 'orders');
          setOrders(response.data.orders || []);
          setTotalOrders(response.data.total || 0);
          setTotalPages(response.data.totalPages || 1);
        } else {
          console.error('❌ CustomerOrdersPage: API error:', response.error);
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
  }, [customer, currentPage, filters]);

  // Handle filters change
  const handleFiltersChange = (newFilters: Partial<CustomerOrdersFilters>) => {
    console.log('🔍 CustomerOrdersPage: Filters changing from:', filters, 'to:', { ...filters, ...newFilters });
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle search change
  const handleSearchChange = (searchValue: string) => {
    setFilters(prev => ({ ...prev, search: searchValue }));
    setCurrentPage(1); // Reset to first page when search changes
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle order action
  const handleOrderAction = (action: string, orderId: string) => {
    console.log('🔍 CustomerOrdersPage: Order action:', action, orderId);
    
    switch (action) {
      case 'view':
        router.push(`/orders/${orderId}`);
        break;
      case 'edit':
        router.push(`/orders/${orderId}/edit`);
        break;
      default:
        console.log('🔍 CustomerOrdersPage: Unknown order action:', action);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Customer Not Found</h1>
            <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push('/customers')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <CustomerPageHeader
          title={`${customer.firstName} ${customer.lastName} - Orders`}
          subtitle="View and manage customer orders"
          onBack={() => router.push(`/customers/${publicId}`)}
          backText="Back to Customer"
        >
          <Button
            onClick={() => router.push(`/orders/create?customerId=${customer.id}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </CustomerPageHeader>

        {/* Customer Summary Card */}
        <div className="mb-8">
          <CustomerOrdersSummaryCard 
            customer={customer}
            orderStats={{
              totalOrders: totalOrders,
              totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
              averageOrderValue: totalOrders > 0 ? orders.reduce((sum, order) => sum + order.totalAmount, 0) / totalOrders : 0,
              lastOrderDate: orders.length > 0 ? orders[0].createdAt : undefined
            }}
          />
        </div>

        {/* Order Filters Card */}
        <div className="mb-8">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 backdrop-blur-sm">
          <CardHeader className="pb-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                    Order Search & Filters
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Find and filter orders for this customer
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search Field - Stretched */}
              <div className="flex-1 space-y-3">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Search Orders
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Order #, product name, pickup date..."
                    value={filters.search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Right Side Filters - Status, Sort, and Actions */}
              <div className="flex gap-4">
                {/* Status Filter */}
                <div className="space-y-3 min-w-[140px]">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFiltersChange({ status: e.target.value as OrderStatus | 'all' })}
                    className="w-full px-3 py-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200"
                  >
                    <option value="all">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                {/* Sort By Filter */}
                <div className="space-y-3 min-w-[160px]">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4" />
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFiltersChange({ sortBy: e.target.value as 'createdAt' | 'pickupPlanAt' | 'returnPlanAt' | 'status' })}
                    className="w-full px-3 py-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200"
                  >
                    <option value="createdAt">📅 Created Date</option>
                    <option value="pickupPlanAt">🚚 Pickup Date</option>
                    <option value="returnPlanAt">📦 Return Date</option>
                    <option value="status">🏷️ Status</option>
                  </select>
                </div>

                {/* Sort Order Filter */}
                <div className="space-y-3 min-w-[120px]">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    {filters.sortOrder === 'desc' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                    Order
                  </label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFiltersChange({ sortOrder: e.target.value as 'asc' | 'desc' })}
                    className="w-full px-3 py-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/20 transition-all duration-200"
                  >
                    <option value="desc">⬇️ Newest First</option>
                    <option value="asc">⬆️ Oldest First</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                <div className="space-y-3 min-w-[120px]">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Actions
                  </label>
                  <button
                    onClick={() => {
                      setFilters({
                        search: '',
                        status: 'all',
                        sortBy: 'createdAt',
                        sortOrder: 'desc'
                      });
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-3 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-200"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
              
              {/* Current Sort Info */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Currently sorting by: <span className="font-medium">{
                  filters.sortBy === 'createdAt' ? 'Created Date' : 
                  filters.sortBy === 'pickupPlanAt' ? 'Pickup Date' : 
                  filters.sortBy === 'returnPlanAt' ? 'Return Date' : 
                  filters.sortBy === 'status' ? 'Status' : 'Created Date'
                }</span> 
                ({filters.sortBy === 'status' ? 
                  (filters.sortOrder === 'desc' ? 'Z to A (CANCELLED → ACTIVE)' : 'A to Z (ACTIVE → CANCELLED)') : 
                  (filters.sortOrder === 'desc' ? 'Newest First' : 'Oldest First')
                })
                {isLoadingOrders && <span className="ml-2 text-blue-500">🔄 Sorting...</span>}
              </div>
              
              {/* Debug Info */}
              <div className="text-xs text-gray-400 mt-1">
                Debug: sortBy={filters.sortBy}, sortOrder={filters.sortOrder}
              </div>
              
              {/* Status Sort Help */}
              {filters.sortBy === 'status' && (
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  💡 Status sorting orders alphabetically: ACTIVE, CANCELLED, COMPLETED, CONFIRMED, etc.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Orders Table Card */}
        <div className="mb-8">
          <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 backdrop-blur-sm">
            <CardContent className="pt-6">
            {isLoadingOrders ? (
              <div className="animate-pulse">
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            ) : (
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Number
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          const newSortBy = 'status';
                          const newSortOrder = filters.sortBy === newSortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
                          handleFiltersChange({ sortBy: newSortBy, sortOrder: newSortOrder });
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Status
                          {filters.sortBy === 'status' && (
                            filters.sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          const newSortBy = 'createdAt';
                          const newSortOrder = filters.sortBy === newSortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
                          handleFiltersChange({ sortBy: newSortBy, sortOrder: newSortOrder });
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Created
                          {filters.sortBy === 'createdAt' && (
                            filters.sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          const newSortBy = 'pickupPlanAt';
                          const newSortOrder = filters.sortBy === newSortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
                          handleFiltersChange({ sortBy: newSortBy, sortOrder: newSortOrder });
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Pickup Date
                          {filters.sortBy === 'pickupPlanAt' && (
                            filters.sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          const newSortBy = 'returnPlanAt';
                          const newSortOrder = filters.sortBy === newSortBy && filters.sortOrder === 'desc' ? 'asc' : 'desc';
                          handleFiltersChange({ sortBy: newSortBy, sortOrder: newSortOrder });
                        }}
                      >
                        <div className="flex items-center gap-1">
                          Return Date
                          {filters.sortBy === 'returnPlanAt' && (
                            filters.sortOrder === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                            order.status === 'COMPLETED' ? 'bg-purple-100 text-purple-800' :
                            order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                            order.status === 'WAITING' ? 'bg-orange-100 text-orange-800' :
                            order.status === 'PICKUPED' ? 'bg-indigo-100 text-indigo-800' :
                            order.status === 'RETURNED' ? 'bg-teal-100 text-teal-800' :
                            order.status === 'OVERDUE' ? 'bg-pink-100 text-pink-800' :
                            order.status === 'DAMAGED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${order.totalAmount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.pickupPlanAt ? new Date(order.pickupPlanAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {order.returnPlanAt ? new Date(order.returnPlanAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleOrderAction('view', order.id)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleOrderAction('edit', order.id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* No Orders State */}
            {!isLoadingOrders && orders.length === 0 && (
              <div className="text-center py-12">
                <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
                <p className="text-gray-600 mb-6">
                  {filters.search || filters.status !== 'all' 
                    ? 'No orders match your current filters. Try adjusting your search criteria.'
                    : 'This customer hasn\'t placed any orders yet.'
                  }
                </p>
                <Button
                  onClick={() => router.push(`/orders/create?customerId=${customer.id}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Create First Order
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Orders Pagination - Outside Cards */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages} ({totalOrders} total orders)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
