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
  CardContent,
  OrderFilters
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
  const publicId = params.id as string; // Fix: use params.id instead of params.publicId
  
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
        
        console.log('🔍 CustomerOrdersPage: Fetching customer with public ID:', publicId);
        
        // Validate public ID format (should be numeric)
        const numericId = parseInt(publicId);
        if (isNaN(numericId) || numericId <= 0) {
          console.error('❌ CustomerOrdersPage: Invalid public ID format:', publicId);
          setCustomer(null);
          return;
        }
        
        console.log('🔍 CustomerOrdersPage: Making API call to /api/customers/' + numericId);
        
        // Use the real API to fetch customer data by public ID
        const response = await customersApi.getCustomerByPublicId(numericId);
        
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
        console.log('🔍 CustomerOrdersPage: API endpoint will be:', `/api/orders?customerId=${customer.id}&limit=10&offset=${(currentPage - 1) * 10}${filters.status !== undefined ? `&status=${filters.status}` : ''}${filters.orderType !== undefined ? `&orderType=${filters.orderType}` : ''}${filters.outlet ? `&outlet=${filters.outlet}` : ''}${filters.dateRange.start && filters.dateRange.end ? `&startDate=${filters.dateRange.start}&endDate=${filters.dateRange.end}` : ''}${filters.search ? `&q=${filters.search}` : ''}&sortBy=${filters.sortBy}&sortOrder=${filters.sortOrder}`);

        const response = await ordersApi.searchOrders(apiFilters);
        
        if (response.success && response.data) {
          console.log('✅ CustomerOrdersPage: Orders fetched successfully:', response.data);
          console.log('🔍 CustomerOrdersPage: Orders data:', response.data);
          console.log('🔍 CustomerOrdersPage: Setting orders state with:', response.data?.length || 0, 'orders');
          setOrders(response.data || []);
          setTotalOrders(response.data?.length || 0);
          setTotalPages(Math.ceil((response.data?.length || 0) / 10));
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
  }, [customer, currentPage]); // Removed filters dependency since we removed frontend filtering

  // SECURITY: Frontend filtering removed - all filtering is handled securely by backend
  // This prevents security vulnerabilities where hackers could bypass filters

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
  const handleOrderAction = (action: string, orderId: number) => {
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

        {/* Order Filters - Use the professional OrderFilters component */}
        <div className="mb-8">
          <OrderFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        {/* Orders Table Card */}
        <div className="mb-8">
          <Card className="shadow-sm border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Customer Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingOrders ? (
                <div className="animate-pulse">
                  <div className="h-64 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                          Order Number
                        </th>
                        <th 
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm cursor-pointer hover:bg-gray-100 transition-colors"
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
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                          Amount
                        </th>
                        <th 
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm cursor-pointer hover:bg-gray-100 transition-colors"
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
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm cursor-pointer hover:bg-gray-100 transition-colors"
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
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm cursor-pointer hover:bg-gray-100 transition-colors"
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
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground text-sm">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="p-4 align-middle text-sm font-medium text-gray-900">
                            {order.orderNumber}
                          </td>
                          <td className="p-4 align-middle">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              order.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
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
                          <td className="p-4 align-middle text-sm text-gray-900">
                            ${order.totalAmount.toLocaleString()}
                          </td>
                          <td className="p-4 align-middle text-sm text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 align-middle text-sm text-gray-500">
                            {order.pickupPlanAt ? new Date(order.pickupPlanAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-4 align-middle text-sm text-gray-500">
                            {order.returnPlanAt ? new Date(order.returnPlanAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-4 align-middle text-sm font-medium">
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
                     {filters.search || filters.status !== undefined || filters.orderType !== undefined || filters.outlet || filters.dateRange.start || filters.dateRange.end
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
