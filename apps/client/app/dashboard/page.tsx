'use client';

import React, { useState, useEffect } from 'react';
import { 
  CardClean, 
  CardHeaderClean, 
  CardTitleClean, 
  CardContentClean,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  IncomeChart,
  OrderChart,
  SubscriptionStatusBanner
} from '@rentalshop/ui';
import { 
  Package,
  PackageCheck,
  Users,
  TrendingUp,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { useAuth } from '@rentalshop/hooks';
import { analyticsApi } from '@rentalshop/utils';

// ============================================================================
// TYPES
// ============================================================================
interface DashboardStats {
  // Today's Operational Metrics
  todayRevenue: number;
  todayRentals: number;
  activeRentals: number;
  todayPickups: number;
  todayReturns: number;
  overdueItems: number;
  productUtilization: number;
  
  // Monthly/Yearly Strategic Metrics
  totalRevenue: number;
  totalRentals: number;
  completedRentals: number;
  customerGrowth: number;
  futureRevenue: number;
  revenueGrowth: number;
  customerBase: number;
}

interface IncomeData {
  period: string;
  actual: number;
  projected: number;
}

interface OrderData {
  period: string;
  count: number;
}

interface TopProduct {
  id: number;
  name: string;
  category: string;
  rentalCount: number;
  revenue: number;
  availability: number;
  image: string;
}

interface TopCustomer {
  id: number;
  name: string;
  location: string;
  rentalCount: number;
  totalSpent: number;
  lastRental: string;
  avatar: string;
}

interface RecentOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  amount: number;
  status: string;
  orderType: string;
  createdAt: string;
  productCount: number;
  pickupPlanAt?: string;
  returnPlanAt?: string;
}

// ============================================================================
// COMPONENTS
// ============================================================================
const StatCard = ({ title, value, change, description, tooltip, color, trend, activeTooltip, setActiveTooltip }: {
  title: string;
  value: string | number;
  change: string;
  description: string;
  tooltip: string;
  color: string;
  trend: 'up' | 'down' | 'neutral';
  activeTooltip: string | null;
  setActiveTooltip: (title: string | null) => void;
}) => {
  const shouldShowDollar = title.toLowerCase().includes('revenue') || title.toLowerCase().includes('income');
  const isTooltipActive = activeTooltip === title;
  
  const handleTooltipClick = () => {
    if (isTooltipActive) {
      setActiveTooltip(null);
    } else {
      setActiveTooltip(title);
    }
  };
  
  return (
    <CardClean variant="default" size="md" className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeaderClean>
        <div className="flex items-center justify-between">
          <CardTitleClean size="md">{title}</CardTitleClean>
          <div className="relative">
            <Info 
              className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors" 
              onClick={handleTooltipClick}
            />
            {isTooltipActive && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-10 max-w-xs">
                {tooltip}
                <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            )}
          </div>
        </div>
      </CardHeaderClean>
      <CardContentClean>
        <p className={`text-3xl font-bold ${color} mb-2`}>
          {typeof value === 'number' 
            ? shouldShowDollar 
              ? `$${value.toLocaleString()}`
              : value.toLocaleString()
            : value}
        </p>
        <div className="flex items-center gap-2 mb-1">
          <div className={`flex items-center gap-1 text-sm font-medium ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {trend === 'up' ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            {change}
          </div>
        </div>
        <p className="text-text-tertiary text-xs">{description}</p>
      </CardContentClean>
    </CardClean>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function DashboardPage() {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<'today' | 'month' | 'year'>('today');
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  // API data states
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    todayRentals: 0,
    activeRentals: 0,
    todayPickups: 0,
    todayReturns: 0,
    overdueItems: 0,
    productUtilization: 0,
    totalRevenue: 0,
    totalRentals: 0,
    completedRentals: 0,
    customerGrowth: 0,
    futureRevenue: 0,
    revenueGrowth: 0,
    customerBase: 0
  });
  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [orderData, setOrderData] = useState<OrderData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []); // Only fetch on initial load

  const fetchDashboardData = async () => {
    try {
      setLoadingCharts(true);

      // Fetch all dashboard data in parallel using centralized APIs
      // Create default date range for analytics
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const defaultFilters = {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
        groupBy: 'day' as const
      };

      const [
        statsResponse,
        incomeResponse,
        ordersResponse,
        topProductsResponse,
        topCustomersResponse,
        recentOrdersResponse
      ] = await Promise.all([
        analyticsApi.getDashboardSummary(),
        analyticsApi.getIncomeAnalytics(defaultFilters),
        analyticsApi.getOrderAnalytics(defaultFilters),
        analyticsApi.getTopProducts(),
        analyticsApi.getTopCustomers(),
        analyticsApi.getRecentOrders()
      ]);

      // Process responses
      if (statsResponse.success && statsResponse.data) {
        // Transform API data to match our DashboardStats interface
        const apiStats = statsResponse.data;
        setStats({
          todayRevenue: apiStats.totalRevenue || 0,
          todayRentals: apiStats.totalOrders || 0,
          activeRentals: apiStats.totalOrders || 0,
          todayPickups: 0, // Not available in current API
          todayReturns: 0, // Not available in current API
          overdueItems: 0, // Not available in current API
          productUtilization: 0, // Not available in current API
          totalRevenue: apiStats.totalRevenue || 0,
          totalRentals: apiStats.totalOrders || 0,
          completedRentals: apiStats.totalOrders || 0,
          customerGrowth: 0, // Not available in current API
          futureRevenue: apiStats.futureIncome || 0,
          revenueGrowth: 0, // Not available in current API
          customerBase: 0 // Not available in current API
        });
      }

      if (incomeResponse.success && incomeResponse.data) {
        setIncomeData(incomeResponse.data);
      }

      if (ordersResponse.success && ordersResponse.data) {
        setOrderData(ordersResponse.data);
      }

      if (topProductsResponse.success && topProductsResponse.data) {
        setTopProducts(topProductsResponse.data);
      }

      if (topCustomersResponse.success && topCustomersResponse.data) {
        setTopCustomers(topCustomersResponse.data);
      }

      if (recentOrdersResponse.success && recentOrdersResponse.data) {
        setRecentOrders(recentOrdersResponse.data);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      
      // Set default data if API fails to prevent crashes
      setStats({
        todayRevenue: 0,
        todayRentals: 0,
        activeRentals: 0,
        todayPickups: 0,
        todayReturns: 0,
        overdueItems: 0,
        productUtilization: 0,
        totalRevenue: 0,
        totalRentals: 0,
        completedRentals: 0,
        customerGrowth: 0,
        futureRevenue: 0,
        revenueGrowth: 0,
        customerBase: 0
      });
      setIncomeData([]);
      setOrderData([]);
      setTopProducts([]);
      setTopCustomers([]);
      setRecentOrders([]);
    } finally {
      setLoadingCharts(false);
    }
  };

  const getStats = () => {
    // Return different stats based on the selected period
    switch (timePeriod) {
      case 'today':
        return stats;
      case 'month':
        return {
          ...stats,
          todayRevenue: 0,
          todayRentals: 0,
          activeRentals: 89,
          todayPickups: 0,
          todayReturns: 0,
          overdueItems: 3,
          productUtilization: 78,
          totalRevenue: 45678.90,
          totalRentals: 156,
          completedRentals: 142,
          customerGrowth: 23,
          futureRevenue: 15000,
          revenueGrowth: 8,
          customerBase: 0
        };
      case 'year':
        return {
          ...stats,
          todayRevenue: 0,
          todayRentals: 0,
          activeRentals: 45,
          todayPickups: 0,
          todayReturns: 0,
          overdueItems: 3,
          productUtilization: 78,
          totalRevenue: 544043.16,
          totalRentals: 1847,
          completedRentals: 1756,
          customerGrowth: 234,
          futureRevenue: 180000,
          revenueGrowth: 18,
          customerBase: 234
        };
      default:
        return stats;
    }
  };

  const getRevenueData = () => {
    // Return different revenue data based on the selected period
    switch (timePeriod) {
      case 'today':
        return incomeData;
      case 'month':
        return [
          { period: 'Week 1', actual: 12000, projected: 8000 },
          { period: 'Week 2', actual: 15000, projected: 10000 },
          { period: 'Week 3', actual: 18000, projected: 12000 },
          { period: 'Week 4', actual: 22000, projected: 15000 }
        ];
      case 'year':
        return [
          { period: 'Jan', actual: 45000, projected: 12000 },
          { period: 'Feb', actual: 52000, projected: 15000 },
          { period: 'Mar', actual: 48000, projected: 18000 },
          { period: 'Apr', actual: 61000, projected: 22000 },
          { period: 'May', actual: 55000, projected: 19000 },
          { period: 'Jun', actual: 68000, projected: 25000 },
          { period: 'Jul', actual: 72000, projected: 28000 },
          { period: 'Aug', actual: 65000, projected: 24000 },
          { period: 'Sep', actual: 58000, projected: 21000 },
          { period: 'Oct', actual: 62000, projected: 23000 },
          { period: 'Nov', actual: 70000, projected: 26000 },
          { period: 'Dec', actual: 75000, projected: 30000 }
        ];
      default:
        return incomeData;
    }
  };

  const getOrderData = () => {
    // Return different order data based on the selected period
    switch (timePeriod) {
      case 'today':
        return orderData;
      case 'month':
        return [
          { period: 'Week 1', count: 45 },
          { period: 'Week 2', count: 52 },
          { period: 'Week 3', count: 48 },
          { period: 'Week 4', count: 61 }
        ];
      case 'year':
        return [
          { period: 'Jan', count: 156 },
          { period: 'Feb', count: 142 },
          { period: 'Mar', count: 168 },
          { period: 'Apr', count: 189 },
          { period: 'May', count: 175 },
          { period: 'Jun', count: 203 },
          { period: 'Jul', count: 218 },
          { period: 'Aug', count: 195 },
          { period: 'Sep', count: 182 },
          { period: 'Oct', count: 198 },
          { period: 'Nov', count: 215 },
          { period: 'Dec', count: 234 }
        ];
      default:
        return orderData;
    }
  };

  const getTopProducts = () => {
    // Return different product data based on the selected period
    switch (timePeriod) {
      case 'today':
        return topProducts;
      case 'month':
        return [
          { id: '1', name: 'iPhone 15 Pro', category: 'Electronics', rentalCount: 45, revenue: 12500, availability: 3, image: '📱' },
          { id: '2', name: 'MacBook Air M2', category: 'Electronics', rentalCount: 32, revenue: 8900, availability: 1, image: '💻' },
          { id: '3', name: 'Canon EOS R6', category: 'Photography', rentalCount: 28, revenue: 6700, availability: 2, image: '📷' },
          { id: '4', name: 'DJI Mini 3 Pro', category: 'Drones', rentalCount: 22, revenue: 5400, availability: 0, image: '🚁' },
          { id: '5', name: 'GoPro Hero 11', category: 'Action Cameras', rentalCount: 18, revenue: 4200, availability: 4, image: '🎥' }
        ];
      case 'year':
        return [
          { id: '1', name: 'iPhone 15 Pro', category: 'Electronics', rentalCount: 156, revenue: 45000, availability: 3, image: '📱' },
          { id: '2', name: 'MacBook Air M2', category: 'Electronics', rentalCount: 142, revenue: 38000, availability: 1, image: '💻' },
          { id: '3', name: 'Canon EOS R6', category: 'Photography', rentalCount: 128, revenue: 32000, availability: 2, image: '📷' },
          { id: '4', name: 'DJI Mini 3 Pro', category: 'Drones', rentalCount: 98, revenue: 25000, availability: 0, image: '🚁' },
          { id: '5', name: 'GoPro Hero 11', category: 'Action Cameras', rentalCount: 87, revenue: 18000, availability: 4, image: '🎥' }
        ];
      default:
        return topProducts;
    }
  };

  const getTopCustomers = () => {
    // Return different customer data based on the selected period
    switch (timePeriod) {
      case 'today':
        return topCustomers;
      case 'month':
        return [
          { id: '1', name: 'John Smith', location: 'New York', rentalCount: 15, totalSpent: 2500, lastRental: '2 hours ago', avatar: '👨‍💼' },
          { id: '2', name: 'Sarah Johnson', location: 'Los Angeles', rentalCount: 12, totalSpent: 2100, lastRental: '1 day ago', avatar: '👩‍💻' },
          { id: '3', name: 'Mike Wilson', location: 'Chicago', rentalCount: 10, totalSpent: 1800, lastRental: '3 days ago', avatar: '👨‍🎨' },
          { id: '4', name: 'Emily Davis', location: 'Miami', rentalCount: 8, totalSpent: 1500, lastRental: '1 week ago', avatar: '👩‍🎤' },
          { id: '5', name: 'David Brown', location: 'Seattle', rentalCount: 7, totalSpent: 1200, lastRental: '2 weeks ago', avatar: '👨‍🔬' }
        ];
      case 'year':
        return [
          { id: '1', name: 'John Smith', location: 'New York', rentalCount: 156, totalSpent: 45000, lastRental: '2 hours ago', avatar: '👨‍💼' },
          { id: '2', name: 'Sarah Johnson', location: 'Los Angeles', rentalCount: 142, totalSpent: 38000, lastRental: '1 day ago', avatar: '👩‍💻' },
          { id: '3', name: 'Mike Wilson', location: 'Chicago', rentalCount: 128, totalSpent: 32000, lastRental: '3 days ago', avatar: '👨‍🎨' },
          { id: '4', name: 'Emily Davis', location: 'Miami', rentalCount: 98, totalSpent: 25000, lastRental: '1 week ago', avatar: '👩‍🎤' },
          { id: '5', name: 'David Brown', location: 'Seattle', rentalCount: 87, totalSpent: 18000, lastRental: '2 weeks ago', avatar: '👨‍🔬' }
        ];
      default:
        return topCustomers;
    }
  };

  const currentStats = getStats();
  const currentRevenueData = getRevenueData();
  const currentOrderData = getOrderData();
  const currentTopProducts = getTopProducts();
  const currentTopCustomers = getTopCustomers();

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Dashboard</PageTitle>
      </PageHeader>
      <PageContent>
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 text-gray-800">
                  Welcome back, {user?.name || 'Owner'}! 👋
                </h1>
                <p className="text-gray-600">
                  {timePeriod === 'today' 
                    ? "Here&apos;s what&apos;s happening with your rental business today"
                    : timePeriod === 'month'
                    ? `Monthly overview of your rental business performance for ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                    : `Annual performance and strategic insights for ${new Date().getFullYear()}`
                  }
                </p>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    timePeriod === 'today' 
                      ? 'bg-blue-100 text-blue-800' 
                      : timePeriod === 'month'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {timePeriod === 'today' ? '📊 Daily Operations' : timePeriod === 'month' ? '📈 Monthly Analytics' : '🎯 Annual Strategy'}
                  </span>
                </div>
              </div>
              
              {/* Time Period Filter */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[
                    { id: 'today', label: 'Today', description: 'Operations' },
                    { id: 'month', label: 'Month', description: 'Statistics' },
                    { id: 'year', label: 'Year', description: 'Analytics' }
                  ].map(period => (
                    <button
                      key={period.id}
                      onClick={() => setTimePeriod(period.id as 'today' | 'month' | 'year')}
                      className={`px-4 py-2 rounded-lg font-medium transition-all text-sm border-2 ${
                        timePeriod === period.id
                          ? 'bg-gray-800 text-white border-gray-800 shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-transparent hover:border-gray-300'
                      }`}
                      title={period.description}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today View - Operational Focus */}
        {timePeriod === 'today' && (
          <>
            {/* Today's Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Today's Revenue"
                value={currentStats.todayRevenue}
                change="+15% from yesterday"
                description="Cash in hand"
                tooltip="Total revenue collected from completed rentals and payments today"
                color="text-green-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="New Rentals"
                value={currentStats.todayRentals}
                change="+2 from yesterday"
                description="Orders created today"
                tooltip="Number of new rental orders created today"
                color="text-blue-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Active Rentals"
                value={currentStats.activeRentals}
                change="+3 from yesterday"
                description="Currently rented"
                tooltip="Total number of items currently being rented out"
                color="text-purple-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Overdue Items"
                value={currentStats.overdueItems}
                change="+0 from yesterday"
                description="Need attention"
                tooltip="Number of items that are overdue for return"
                color="text-red-600"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
            </div>

            {/* Today's Operations - 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* New Orders */}
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">New Orders</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  {loadingCharts ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg animate-pulse">
                          <div className="w-5 h-5 bg-gray-200 rounded"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                            <div className="h-3 bg-gray-200 rounded w-32"></div>
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (recentOrders || []).filter(order => order.status === 'book').slice(0, 6).length > 0 ? (
                    <div className="space-y-3">
                      {(recentOrders || []).filter(order => order.status === 'book').slice(0, 6).map(order => (
                        <div key={order.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                          <Package className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{order.orderNumber}</div>
                            <div className="text-xs text-gray-600">{order.customerName} - {order.productCount || 0} items</div>
                            <div className="text-xs text-gray-500">{order.createdAt}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-blue-600">${(order.amount || 0).toLocaleString()}</div>
                            <div className="text-xs text-gray-500">Book</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No new orders today</p>
                    </div>
                  )}
                </CardContentClean>
              </CardClean>

              {/* Rental Status */}
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">Rental Status</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="space-y-4">
                    {[
                      { status: 'Book', count: (recentOrders || []).filter(o => o.status === 'book').length, color: 'bg-blue-500' },
                      { status: 'Pickup', count: (recentOrders || []).filter(o => o.status === 'pickup').length, color: 'bg-green-500' },
                      { status: 'Return', count: (recentOrders || []).filter(o => o.status === 'return').length, color: 'bg-gray-500' },
                      { status: 'Cancel', count: (recentOrders || []).filter(o => o.status === 'cancel').length, color: 'bg-red-500' }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${item.color.replace('bg-', 'bg-').replace('-500', '-100')}`}>
                            <span className="text-sm font-medium capitalize">{item.status}</span>
                          </div>
                          <span className="text-sm text-gray-600">{item.count} orders</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-800">{item.count}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContentClean>
              </CardClean>
            </div>
          </>
        )}

        {/* Month/Year View - Strategic Focus */}
        {(timePeriod === 'month' || timePeriod === 'year') && (
          <>
            {/* Business Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Revenue"
                value={currentStats.totalRevenue}
                change={timePeriod === 'month' ? '+8% from last month' : '+12% from last year'}
                description={timePeriod === 'month' ? 'This month' : 'This year'}
                tooltip="Total revenue from all completed rentals and payments"
                color="text-green-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Total Rentals"
                value={currentStats.totalRentals}
                change={timePeriod === 'month' ? '+12% from last month' : '+5% from last year'}
                description="All rentals"
                tooltip="Total number of rental orders created"
                color="text-blue-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Completed Rentals"
                value={currentStats.completedRentals}
                change={timePeriod === 'month' ? '+10% from last month' : '+8% from last year'}
                description="Successfully completed"
                tooltip="Number of rentals that have been successfully completed"
                color="text-purple-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Future Revenue"
                value={currentStats.futureRevenue}
                change={timePeriod === 'month' ? '+5% from last month' : '+8% from last year'}
                description="Booked revenue"
                tooltip="Expected revenue from upcoming and ongoing rentals"
                color="text-orange-600"
                trend="up"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
            </div>

            {/* Revenue Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">
                    {timePeriod === 'month' 
                      ? `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Revenue`
                      : `${new Date().getFullYear()} Revenue`
                    }
                  </CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <IncomeChart data={currentRevenueData} loading={loadingCharts} />
                </CardContentClean>
              </CardClean>
              
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">
                    {timePeriod === 'month' 
                      ? `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Rentals`
                      : `${new Date().getFullYear()} Rentals`
                    }
                  </CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <OrderChart 
                    data={currentOrderData.map(order => ({
                      period: order.period,
                      actual: order.count,
                      projected: order.count * 1.1 // Estimate 10% growth
                    }))} 
                    loading={loadingCharts} 
                  />
                </CardContentClean>
              </CardClean>
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">Top Products</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  {loadingCharts ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                          <div className="w-5 h-5 bg-gray-200 rounded"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (currentTopProducts || []).length > 0 ? (
                    <div className="space-y-2">
                      {(currentTopProducts || []).map(product => (
                        <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <Package className="w-5 h-5 text-blue-600" />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{product.name}</h4>
                            <p className="text-sm text-gray-600">{product.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">${(product.revenue || 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{product.rentalCount || 0} rentals</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No products data available</p>
                    </div>
                  )}
                </CardContentClean>
              </CardClean>
              
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">Top Customers</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  {loadingCharts ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                          <div className="w-5 h-5 bg-gray-200 rounded"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="h-4 bg-gray-200 rounded w-16"></div>
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (currentTopCustomers || []).length > 0 ? (
                    <div className="space-y-2">
                      {(currentTopCustomers || []).map(customer => (
                        <div key={customer.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                          <Users className="w-5 h-5 text-purple-600" />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{customer.name}</h4>
                            <p className="text-sm text-gray-600">{customer.location}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-blue-600">{customer.rentalCount || 0} rentals</p>
                            <p className="text-xs text-gray-500">{customer.lastRental || 'N/A'}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No customers data available</p>
                    </div>
                  )}
                </CardContentClean>
              </CardClean>
            </div>
          </>
        )}

        {/* Admin Quick Actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group">
              <Package className="w-6 h-6 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-blue-900">Create Order</p>
                <p className="text-sm text-blue-700">New rental order</p>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group">
              <Users className="w-6 h-6 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-green-900">Add Customer</p>
                <p className="text-sm text-green-700">New customer</p>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group">
              <PackageCheck className="w-6 h-6 text-purple-600" />
              <div className="text-left">
                <p className="font-medium text-purple-900">Add Product</p>
                <p className="text-sm text-purple-700">New product</p>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group">
              <TrendingUp className="w-6 h-6 text-orange-600" />
              <div className="text-left">
                <p className="font-medium text-orange-900">View Reports</p>
                <p className="text-sm text-orange-700">Analytics</p>
              </div>
            </button>
          </div>
        </div>
      </PageContent>
    </PageWrapper>
  );
} 