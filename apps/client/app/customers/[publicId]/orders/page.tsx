'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Button, 
  CustomerPageHeader, 
  CustomerInfoCard
} from '@rentalshop/ui';
import { 
  ArrowLeft,
  ShoppingBag,
  Calendar,
  DollarSign,
  Package
} from 'lucide-react';
import { customersApi } from '../../../../lib/api/customers';
import { ordersApi } from '../../../../lib/api/orders';
import type { Customer } from '@rentalshop/ui';

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
  status: string;
  sortBy: 'createdAt' | 'totalAmount' | 'orderNumber';
  sortOrder: 'asc' | 'desc';
}

export default function CustomerOrdersPage() {
  const router = useRouter();
  const params = useParams();
  const publicId = params.publicId as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  
  // Pagination and filters
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [filters, setFilters] = useState<CustomerOrdersFilters>({
    search: '',
    status: 'all',
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

        const response = await ordersApi.getOrders({
          limit: 10,
          offset: (currentPage - 1) * 10,
          ...(filters.status !== 'all' && { status: filters.status }),
          ...(filters.search && { search: filters.search }),
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder
        });
        
        if (response.success && response.data) {
          console.log('✅ CustomerOrdersPage: Orders fetched successfully:', response.data);
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
        <CustomerInfoCard 
          customer={customer}
          showActions={false}
        />

        {/* Orders Section */}
        <div className="space-y-6">
          {/* Orders Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Customer Orders</h2>
          </div>

          {/* Orders Filters */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={filters.status}
                onChange={(e) => handleFiltersChange({ status: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
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
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Orders Table */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
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
                          order.status === 'active' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'completed' ? 'bg-blue-100 text-blue-800' :
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

          {/* Orders Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
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
        </div>
      </div>
    </div>
  );
}
