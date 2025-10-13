'use client'

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Badge,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../../ui';
import { 
  Package, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp, 
  Calendar,
  Search,
  Filter,
  Eye,
  Download,
  RefreshCw,
  ArrowUpDown,
  Clock,
  User,
  MapPin,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../../lib';
import { ProductsLoading } from './ProductsLoading';
import { 
  OrderFilters as OrderFiltersComponent,
  OrderTable
} from '../../Orders/components';
import { Pagination } from '@rentalshop/ui';
import { ordersApi } from '@rentalshop/utils';
import type { 
  OrderWithDetails, 
  OrderFilters,
  OrderStats
} from '@rentalshop/types';

interface ProductOrdersViewProps {
  productId: string;
  productName: string;
  onClose?: () => void;
  className?: string;
  showHeader?: boolean;
  inventoryData?: {
    totalStock: number;
    totalRenting: number;
    totalAvailable: number;
  };
}

export const ProductOrdersView: React.FC<ProductOrdersViewProps> = ({
  productId,
  productName,
  onClose,
  className = '',
  showHeader = true,
  inventoryData
}) => {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Initialize filters
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    status: undefined,
    orderType: undefined,
    outletId: undefined,
    customerId: undefined,
    startDate: undefined,
    endDate: undefined,
    limit: 20,
    offset: 0,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Fetch orders for this specific product
  useEffect(() => {
    const fetchProductOrders = async () => {
      try {
        setLoading(true);
        // Use the dedicated method to get orders for this specific product
        const response = await ordersApi.getOrdersByProduct(parseInt(productId));
        
        console.log('🔍 ProductOrdersView: API Response:', response);
        
        if (response.success && response.data) {
          // Handle both array and paginated response structures
          const ordersData = Array.isArray(response.data) 
            ? response.data 
            : (response.data as any).orders || [];
          const totalPages = Array.isArray(response.data) 
            ? 1 
            : (response.data as any).totalPages || 1;
          console.log('🔍 ProductOrdersView: Setting orders:', ordersData);
          console.log('🔍 ProductOrdersView: Total pages:', totalPages);
          setOrders(ordersData as OrderWithDetails[]);
          setTotalPages(totalPages);
        } else {
          console.log('🔍 ProductOrdersView: No data or unsuccessful response');
          setOrders([]);
          setTotalPages(1);
        }
      } catch (err) {
        console.error('❌ ProductOrdersView: Error fetching product orders:', err);
        setError('Failed to fetch product orders');
        setOrders([]); // Ensure orders is always an array
      } finally {
        setLoading(false);
      }
    };
    fetchProductOrders();
  }, [productId]);

  // Calculate overview statistics with safety checks
  const overview = {
    totalOrders: Array.isArray(orders) ? orders.length : 0,
    totalQuantity: Array.isArray(orders) ? orders.reduce((sum, order) => 
      sum + (order.orderItems?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0
    ) : 0,
    totalSales: Array.isArray(orders) ? orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) : 0,
    totalDeposits: Array.isArray(orders) ? orders.reduce((sum, order) => sum + (order.depositAmount || 0), 0) : 0,
    activeRentals: Array.isArray(orders) ? orders.filter(order => order.status === 'PICKUPED').length : 0,
    completedOrders: Array.isArray(orders) ? orders.filter(order => order.status === 'COMPLETED').length : 0,
    pendingOrders: Array.isArray(orders) ? orders.filter(order => order.status === 'RESERVED').length : 0
  };

  // Transform OrderWithDetails to the format expected by OrderTable
  console.log('🔍 ProductOrdersView: Transforming orders:', orders);
  const orderData = {
    orders: Array.isArray(orders) ? orders.map(order => ({
      id: typeof order.id === 'string' ? parseInt(order.id) : order.id, // Handle both string and number IDs
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest',
      customerPhone: order.customer?.phone || 'No phone',
      outletName: order.outlet.name,
      merchantName: order.outlet.merchant?.name || 'N/A',
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      createdAt: new Date(order.createdAt),
      pickupPlanAt: order.pickupPlanAt ? new Date(order.pickupPlanAt) : undefined,
      returnPlanAt: order.returnPlanAt ? new Date(order.returnPlanAt) : undefined,
      pickedUpAt: order.pickedUpAt ? new Date(order.pickedUpAt) : undefined,
      returnedAt: order.returnedAt ? new Date(order.returnedAt) : undefined,
      isReadyToDeliver: (order as any).isReadyToDeliver || false
    })) : [],
    total: Array.isArray(orders) ? orders.length : 0,
    currentPage,
    totalPages,
    limit: filters.limit || 20,
    stats: {
      totalOrders: overview.totalOrders,
      totalRevenue: overview.totalSales,
      totalDeposits: overview.totalDeposits,
      activeRentals: overview.activeRentals,
      overdueRentals: 0, // Not calculated in this context
      completedOrders: overview.completedOrders,
      cancelledOrders: 0, // Not calculated in this context
      averageOrderValue: overview.totalOrders > 0 ? overview.totalSales / overview.totalOrders : 0
    } as OrderStats
  };

  console.log('🔍 ProductOrdersView: Final orderData:', orderData);

  const handleFiltersChange = (newFilters: OrderFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSearchChange = (searchValue: string) => {
    setFilters((prev: OrderFilters) => ({ ...prev, search: searchValue }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: undefined,
      orderType: undefined,
      outletId: undefined,
      customerId: undefined,
      startDate: undefined,
      endDate: undefined,
      limit: 20,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  const handleOrderAction = (action: string, orderId: string) => {
    console.log('Order action:', action, orderId);
    // TODO: Implement order actions here
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (column: string) => {
    const newSortOrder = filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters((prev: OrderFilters) => ({
      ...prev,
      sortBy: column,
      sortOrder: newSortOrder
    }));
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    setError(null);
    // Trigger a new fetch
    const fetchProductOrders = async () => {
      try {
        setLoading(true);
        const response = await ordersApi.getOrdersByProduct(parseInt(productId));
        
        if (response.success && response.data) {
          setOrders(response.data as OrderWithDetails[]);
          setTotalPages(1);
        } else {
          setOrders([]);
          setTotalPages(1);
        }
      } catch (err) {
        setError('Failed to fetch product orders');
        console.error('Error refreshing product orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProductOrders();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export orders for product:', productId);
    // This could export to CSV, PDF, or other formats
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <ProductsLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <BarChart3 className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Orders</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showHeader && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Orders for {productName}</h1>
              <p className="text-gray-600">View and manage all orders for this product</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Products
                </Button>
              )}
            </div>
          </div>

          {/* Overview Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Quantity</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.totalQuantity}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.totalSales)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Active Rentals</p>
                    <p className="text-2xl font-bold text-gray-900">{overview.activeRentals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Total Deposits</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(overview.totalDeposits)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Completed Orders</p>
                  <p className="text-xl font-bold text-blue-600">{overview.completedOrders}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                                  <p className="text-sm text-gray-600 mb-1">Reserved Orders</p>
                <p className="text-xl font-bold text-red-600">{overview.pendingOrders}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Inventory Summary */}
      {inventoryData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Package className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Stock</p>
                  <p className="text-2xl font-bold text-gray-900">{inventoryData.totalStock}</p>
                  <p className="text-xs text-gray-500">Available inventory</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Currently Rented</p>
                  <p className="text-2xl font-bold text-blue-600">{inventoryData.totalRenting}</p>
                  <p className="text-xs text-gray-500">Out on rental</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Package className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Available Now</p>
                  <p className="text-2xl font-bold text-green-600">{inventoryData.totalAvailable}</p>
                  <p className="text-xs text-gray-500">Ready to rent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(overview.totalSales)}</p>
                  <p className="text-xs text-gray-500">All time earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List using the same UI components as main orders page */}
      <div className="space-y-6">
        {/* OrderListHeader hidden as requested */}
        
        <OrderFiltersComponent 
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
        />      
        
        <OrderTable 
          orders={orderData.orders}
          onOrderAction={handleOrderAction}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={handleSort}
        />
        
        {orderData.total > orderData.limit && (
          <Pagination 
            currentPage={orderData.currentPage}
            totalPages={orderData.totalPages}
            total={orderData.total}
            limit={orderData.limit}
            onPageChange={handlePageChange}
            itemName="orders"
          />
        )}
      </div>
    </div>
  );
};
