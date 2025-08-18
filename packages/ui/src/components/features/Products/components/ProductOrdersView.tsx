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
  BarChart3
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../../lib';
import { ProductsLoading } from './ProductsLoading';
import { 
  OrderListHeader,
  OrderListFilters,
  OrderTable,
  OrderListActions,
  OrderStats,
  OrderPagination
} from '../../Orders/components';
import type { OrderData, OrderFilters } from '../../Orders/types';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  orderId: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  };
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  orderType: 'RENT' | 'SALE' | 'RENT_TO_OWN';
  totalAmount: number;
  depositAmount: number;
  pickupPlanAt?: Date;
  returnPlanAt?: Date;
  pickedUpAt?: Date;
  returnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  orderItems: OrderItem[];
}

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Initialize filters
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    status: '',
    orderType: '',
    outlet: '',
    dateRange: {
      start: '',
      end: ''
    },
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Mock data for demonstration - replace with actual API call
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data - replace with actual API call
        const mockOrders: Order[] = [
          {
            id: '1',
            orderNumber: 'ORD-001',
            customer: {
              firstName: 'John',
              lastName: 'Doe',
              phone: '+1234567890',
              email: 'john@example.com'
            },
            status: 'ACTIVE',
            orderType: 'RENT',
            totalAmount: 150.00,
            depositAmount: 50.00,
            pickupPlanAt: new Date('2024-01-15'),
            returnPlanAt: new Date('2024-01-20'),
            pickedUpAt: new Date('2024-01-15'),
            createdAt: new Date('2024-01-10'),
            updatedAt: new Date('2024-01-15'),
            orderItems: [{
              id: '1',
              quantity: 1,
              unitPrice: 150.00,
              totalPrice: 150.00,
              orderId: '1'
            }]
          },
          {
            id: '2',
            orderNumber: 'ORD-002',
            customer: {
              firstName: 'Jane',
              lastName: 'Smith',
              phone: '+1234567891',
              email: 'jane@example.com'
            },
            status: 'COMPLETED',
            orderType: 'SALE',
            totalAmount: 300.00,
            depositAmount: 0,
            createdAt: new Date('2024-01-05'),
            updatedAt: new Date('2024-01-12'),
            orderItems: [{
              id: '2',
              quantity: 2,
              unitPrice: 150.00,
              totalPrice: 300.00,
              orderId: '2'
            }]
          },
          {
            id: '3',
            orderNumber: 'ORD-003',
            customer: {
              firstName: 'Mike',
              lastName: 'Johnson',
              phone: '+1234567892'
            },
            status: 'PENDING',
            orderType: 'RENT',
            totalAmount: 75.00,
            depositAmount: 25.00,
            pickupPlanAt: new Date('2024-01-25'),
            returnPlanAt: new Date('2024-01-30'),
            createdAt: new Date('2024-01-20'),
            updatedAt: new Date('2024-01-20'),
            orderItems: [{
              id: '3',
              quantity: 1,
              unitPrice: 75.00,
              totalPrice: 75.00,
              orderId: '3'
            }]
          }
        ];
        
        setOrders(mockOrders);
        setTotalPages(1);
      } catch (err) {
        setError('Failed to fetch orders');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [productId]);

  // Calculate overview statistics
  const overview = {
    totalOrders: orders.length,
    totalQuantity: orders.reduce((sum, order) => 
      sum + order.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    ),
    totalSales: orders.reduce((sum, order) => sum + order.totalAmount, 0),
    totalDeposits: orders.reduce((sum, order) => sum + order.depositAmount, 0),
    activeRentals: orders.filter(order => order.status === 'ACTIVE').length,
    completedOrders: orders.filter(order => order.status === 'COMPLETED').length,
    pendingOrders: orders.filter(order => order.status === 'PENDING').length
  };

  // Transform orders to match OrderData interface
  const orderData: OrderData = {
    orders: orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      customerId: order.customer.email || '',
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      customerPhone: order.customer.phone,
      outletId: '',
      outletName: '',
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      pickupPlanAt: order.pickupPlanAt?.toISOString(),
      returnPlanAt: order.returnPlanAt?.toISOString(),
      pickedUpAt: order.pickedUpAt?.toISOString(),
      returnedAt: order.returnedAt?.toISOString(),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      orderItems: [],
      payments: []
    })),
    total: orders.length,
    currentPage,
    totalPages,
    limit: 10,
    stats: {
      totalOrders: overview.totalOrders,
      pendingOrders: overview.pendingOrders,
      activeOrders: overview.activeRentals,
      completedOrders: overview.completedOrders,
      cancelledOrders: 0,
      totalRevenue: overview.totalSales,
      totalDeposits: overview.totalDeposits,
      averageOrderValue: overview.totalOrders > 0 ? overview.totalSales / overview.totalOrders : 0,
      ordersThisMonth: overview.totalOrders,
      revenueThisMonth: overview.totalSales
    }
  };

  const handleFiltersChange = (newFilters: OrderFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSearchChange = (searchValue: string) => {
    setFilters(prev => ({ ...prev, search: searchValue }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      orderType: '',
      outlet: '',
      dateRange: { start: '', end: '' },
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  const handleOrderAction = (action: string, orderId: string) => {
    console.log('Order action:', action, orderId);
    // Implement order actions here
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSort = (column: string) => {
    const newSortOrder = filters.sortBy === column && filters.sortOrder === 'asc' ? 'desc' : 'asc';
    setFilters(prev => ({
      ...prev,
      sortBy: column as any,
      sortOrder: newSortOrder
    }));
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
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Close
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
                  <p className="text-sm text-gray-600 mb-1">Pending Orders</p>
                  <p className="text-xl font-bold text-orange-600">{overview.pendingOrders}</p>
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
        
        <OrderListFilters 
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
        
        <OrderPagination 
          currentPage={orderData.currentPage}
          totalPages={orderData.totalPages}
          total={orderData.total}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};
