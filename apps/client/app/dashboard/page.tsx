'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  SubscriptionStatusBanner,
  useToast } from '@rentalshop/ui';
import { TopProduct, TopCustomer } from '@rentalshop/types';
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
import { analyticsApi, ordersApi } from '@rentalshop/utils';

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
  const { toastError, toastSuccess } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get timePeriod from URL params or default to 'today'
  const [timePeriod, setTimePeriod] = useState<'today' | 'month' | 'year'>(
    (searchParams.get('period') as 'today' | 'month' | 'year') || 'today'
  );
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
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [orderStatusCounts, setOrderStatusCounts] = useState<any>({});

  // Function to update URL when time period changes
  const updateTimePeriod = (newPeriod: 'today' | 'month' | 'year') => {
    setTimePeriod(newPeriod);
    // Update URL without causing page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', newPeriod);
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
  };

  // Sync URL params on mount
  useEffect(() => {
    const urlPeriod = searchParams.get('period');
    if (urlPeriod && ['today', 'month', 'year'].includes(urlPeriod)) {
      setTimePeriod(urlPeriod as 'today' | 'month' | 'year');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchDashboardData();
  }, [timePeriod]); // Fetch when time period changes

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard data...');
      fetchDashboardData();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [timePeriod]);

  const fetchDashboardData = async () => {
    try {
      setLoadingCharts(true);

      // Dynamic date calculation based on time period
      const today = new Date();
      let startDate: string;
      let endDate: string;
      let groupBy: 'day' | 'month';

      switch (timePeriod) {
        case 'today':
          const todayStr = today.toISOString().split('T')[0];
          startDate = todayStr;
          endDate = todayStr;
          groupBy = 'day';
          break;
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          startDate = monthStart.toISOString().split('T')[0];
          endDate = monthEnd.toISOString().split('T')[0];
          groupBy = 'day';
          break;
        case 'year':
          const yearStart = new Date(today.getFullYear(), 0, 1);
          const yearEnd = new Date(today.getFullYear(), 11, 31);
          startDate = yearStart.toISOString().split('T')[0];
          endDate = yearEnd.toISOString().split('T')[0];
          groupBy = 'month';
          break;
        default:
          const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          startDate = defaultStart.toISOString().split('T')[0];
          endDate = defaultEnd.toISOString().split('T')[0];
          groupBy = 'day';
      }
      
      const defaultFilters = {
        startDate,
        endDate,
        groupBy
      };

      console.log(`📊 Fetching dashboard data for ${timePeriod} period:`, {
        startDate: defaultFilters.startDate,
        endDate: defaultFilters.endDate,
        groupBy: defaultFilters.groupBy,
        note: timePeriod === 'year' ? 'Using 2024 data range' : 'Using current date range'
      });

      console.log('🚀 Starting parallel API calls...');
      console.log('🔗 API URLs being called:');
      console.log('  📊 Enhanced Dashboard:', `/api/analytics/enhanced-dashboard?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}&groupBy=${defaultFilters.groupBy}`);
      console.log('  📈 Today Metrics:', '/api/analytics/today-metrics');
      console.log('  📉 Growth Metrics:', `/api/analytics/growth-metrics?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}`);
      console.log('  💰 Income Analytics:', `/api/analytics/income?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}&groupBy=${defaultFilters.groupBy}`);
      console.log('  📦 Order Analytics:', `/api/analytics/orders?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}&groupBy=${defaultFilters.groupBy}`);
      console.log('  🏆 Top Products:', `/api/analytics/top-products?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}`);
      console.log('  👥 Top Customers:', `/api/analytics/top-customers?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}`);
      console.log('  📋 Dashboard Summary:', '/api/analytics/dashboard');
      
      const [
        statsResponse,
        todayMetricsResponse,
        growthMetricsResponse,
        incomeResponse,
        ordersResponse,
        topProductsResponse,
        topCustomersResponse,
        dashboardResponse
      ] = await Promise.all([
        analyticsApi.getEnhancedDashboardSummary(defaultFilters).then(response => {
          console.log('📊 Enhanced Dashboard Summary API:', response);
          return response;
        }),
        analyticsApi.getTodayMetrics().then(response => {
          console.log('📈 Today Metrics API:', response);
          return response;
        }),
        analyticsApi.getGrowthMetrics(defaultFilters).then(response => {
          console.log('📉 Growth Metrics API:', response);
          return response;
        }),
        analyticsApi.getIncomeAnalytics(defaultFilters).then(response => {
          console.log('💰 Income Analytics API:', response);
          return response;
        }),
        analyticsApi.getOrderAnalytics(defaultFilters).then(response => {
          console.log('📦 Order Analytics API:', response);
          return response;
        }),
        analyticsApi.getTopProducts(defaultFilters).then(response => {
          console.log('🏆 Top Products API:', response);
          return response;
        }),
        analyticsApi.getTopCustomers(defaultFilters).then(response => {
          console.log('👥 Top Customers API:', response);
          return response;
        }),
        analyticsApi.getDashboardSummary().then(response => {
          console.log('📋 Dashboard Summary API:', response);
          return response;
        })
      ]);

      // Process responses
      console.log('Dashboard API responses:', {
        statsResponse,
        todayMetricsResponse,
        growthMetricsResponse,
        incomeResponse,
        ordersResponse,
        topProductsResponse,
        topCustomersResponse,
        dashboardResponse
      });

      // Check which APIs are successful
      console.log('🔍 API Success Status:');
      console.log('  📊 Enhanced Dashboard Summary:', statsResponse.success, (statsResponse.success && 'data' in statsResponse && statsResponse.data) ? 'HAS DATA' : 'NO DATA');
      console.log('  📈 Today Metrics:', todayMetricsResponse.success, (todayMetricsResponse.success && 'data' in todayMetricsResponse && todayMetricsResponse.data) ? 'HAS DATA' : 'NO DATA');
      console.log('  📉 Growth Metrics:', growthMetricsResponse.success, (growthMetricsResponse.success && 'data' in growthMetricsResponse && growthMetricsResponse.data) ? 'HAS DATA' : 'NO DATA');
      console.log('  💰 Income Analytics:', incomeResponse.success, (incomeResponse.success && 'data' in incomeResponse && incomeResponse.data) ? 'HAS DATA' : 'NO DATA');
      console.log('  📦 Order Analytics:', ordersResponse.success, (ordersResponse.success && 'data' in ordersResponse && ordersResponse.data) ? 'HAS DATA' : 'NO DATA');
      console.log('  🏆 Top Products:', topProductsResponse.success, (topProductsResponse.success && 'data' in topProductsResponse && topProductsResponse.data) ? 'HAS DATA' : 'NO DATA');
      console.log('  👥 Top Customers:', topCustomersResponse.success, (topCustomersResponse.success && 'data' in topCustomersResponse && topCustomersResponse.data) ? 'HAS DATA' : 'NO DATA');
      console.log('  📋 Dashboard Summary:', dashboardResponse.success, (dashboardResponse.success && 'data' in dashboardResponse && dashboardResponse.data) ? 'HAS DATA' : 'NO DATA');

      // Debug actual data structures
      console.log('🔍 Raw API Data Structures:');
      console.log('  📊 Enhanced Dashboard Summary data:', (statsResponse.success && 'data' in statsResponse) ? statsResponse.data : 'No data');
      console.log('  💰 Income Analytics data:', (incomeResponse.success && 'data' in incomeResponse) ? incomeResponse.data : 'No data');
      console.log('  📋 Dashboard Summary data:', (dashboardResponse.success && 'data' in dashboardResponse) ? dashboardResponse.data : 'No data');

      if (statsResponse.success && statsResponse.data) {
        // Transform API data to match our DashboardStats interface
        const apiStats = statsResponse.data as any;
        const todayMetrics = todayMetricsResponse.success ? (todayMetricsResponse.data as any) : {};
        const growthMetrics = growthMetricsResponse.success ? (growthMetricsResponse.data as any) : {};
        
        console.log('🔍 Enhanced Dashboard Summary structure:', JSON.stringify(apiStats, null, 2));
        console.log('🔍 Today Metrics structure:', JSON.stringify(todayMetrics, null, 2));
        console.log('🔍 Growth Metrics structure:', JSON.stringify(growthMetrics, null, 2));
        
        console.log('Setting dashboard stats:', {
          apiStats,
          todayMetrics,
          growthMetrics
        });
        
        const newStats = {
          // Today metrics - use correct API structure
          todayRevenue: apiStats.today?.revenue || 0,
          todayRentals: apiStats.today?.orders || 0,
          activeRentals: apiStats.activeRentals || 0,
          todayPickups: todayMetrics.todayPickups || 0,
          todayReturns: todayMetrics.todayReturns || 0,
          overdueItems: todayMetrics.overdueItems || 0,
          productUtilization: todayMetrics.productUtilization || 0,
          
          // This month metrics - use correct API structure  
          totalRevenue: apiStats.thisMonth?.revenue || 0,
          totalRentals: apiStats.thisMonth?.orders || 0,
          completedRentals: apiStats.thisMonth?.orders || 0, // Use total orders as completed for now
          customerGrowth: growthMetrics.customerGrowth || 0,
          futureRevenue: 0, // Not available in current API
          revenueGrowth: apiStats.growth?.revenue || 0,
          customerBase: growthMetrics.customerBase || 0
        };
        
        console.log('📊 Setting final stats:', newStats);
        setStats(newStats);
      } else {
        console.error('❌ Stats API failed:', statsResponse);
        console.log('ℹ️ No data available for selected period - keeping stats at 0');
        // Keep stats at 0 if no data - no fallback
      }

      if (incomeResponse.success && incomeResponse.data) {
        setIncomeData(incomeResponse.data);
      }

      if (ordersResponse.success && ordersResponse.data) {
        setOrderData(ordersResponse.data);
      }

      if (topProductsResponse.success && topProductsResponse.data) {
        console.log('✅ Top Products data loaded:', topProductsResponse.data);
        console.log('📅 Date range used:', { startDate: defaultFilters.startDate, endDate: defaultFilters.endDate });
        console.log('🔍 First product structure:', topProductsResponse.data[0]);
        setTopProducts(topProductsResponse.data);
        console.log('🎯 Top Products state set to:', topProductsResponse.data);
      } else {
        console.log('❌ Top Products failed:', topProductsResponse);
        console.log('🔍 Top Products response details:', {
          success: topProductsResponse.success,
          data: (topProductsResponse.success && 'data' in topProductsResponse) ? topProductsResponse.data : undefined,
          error: (!topProductsResponse.success && 'error' in topProductsResponse) ? topProductsResponse.error : undefined
        });
      }

      if (topCustomersResponse.success && topCustomersResponse.data) {
        console.log('✅ Top Customers data loaded:', topCustomersResponse.data);
        console.log('🔍 First customer structure:', topCustomersResponse.data[0]);
        setTopCustomers(topCustomersResponse.data);
      } else {
        console.log('❌ Top Customers failed:', topCustomersResponse);
      }

      if (dashboardResponse.success && dashboardResponse.data) {
        setTodayOrders(dashboardResponse.data.todayOrders || []);
        setOrderStatusCounts(dashboardResponse.data.orderStatusCounts || {});
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard data';
      
      // Check if it's a subscription error (don't redirect to login)
      if (error instanceof Error && (
        error.message.includes('subscription') ||
        error.message.includes('paused') ||
        error.message.includes('expired') ||
        error.message.includes('trial')
      )) {
        console.log('⚠️ Subscription error detected, showing error instead of redirecting');
        toastError('Subscription Issue', errorMessage);
        return;
      }
      
      // Handle other errors
      
      toastError('Error', errorMessage);
      
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
    } finally {
      setLoadingCharts(false);
    }
  };

  const getStats = () => {
    // Always return the actual stats from API - no hardcoded data
    return stats;
  };

  const getRevenueData = () => {
    // Transform income data to match chart component expectations
    return incomeData.map((item: any) => ({
      period: `${item.month} ${item.year}`,
      actual: item.realIncome || 0,
      projected: item.futureIncome || 0
    }));
  };

  const getOrderData = () => {
    // Transform order data to match chart component expectations
    return orderData.map((item: any) => ({
      period: `${item.month} ${item.year}`,
      actual: item.orderCount || 0,
      projected: item.orderCount || 0 // Use same value for both actual and projected
    }));
  };

  const getTopProducts = () => {
    // Always return the actual top products data from API - no hardcoded data
    return topProducts;
  };

  const getTopCustomers = () => {
    // Always return the actual top customers data from API - no hardcoded data
    return topCustomers;
  };

  const currentStats = getStats();
  const currentRevenueData = getRevenueData();
  const currentOrderData = getOrderData();
  const currentTopProducts = getTopProducts();
  const currentTopCustomers = getTopCustomers();
  
  // Debug popular data
  console.log('🔍 Current Top Products:', currentTopProducts);
  console.log('🔍 Current Top Customers:', currentTopCustomers);

  return (
    <div className="h-full overflow-y-auto">
      <PageWrapper>
      <PageHeader>
        <div className="flex items-center justify-between">
          <PageTitle>Dashboard</PageTitle>
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              fetchDashboardData();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
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
                      onClick={() => updateTimePeriod(period.id as 'today' | 'month' | 'year')}
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
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${
              user?.role === 'OUTLET_STAFF' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
            }`}>
              {/* Revenue Card - Hidden for OUTLET_STAFF */}
              {user?.role !== 'OUTLET_STAFF' && (
                <StatCard
                  title="Today's Revenue"
                  value={currentStats.todayRevenue}
                  change="Real-time data"
                  description="Cash in hand"
                  tooltip="Total revenue collected from completed rentals and payments today"
                  color="text-green-600"
                  trend="neutral"
                  activeTooltip={activeTooltip}
                  setActiveTooltip={setActiveTooltip}
                />
              )}
              <StatCard
                title="New Rentals"
                value={currentStats.todayRentals}
                change="Real-time data"
                description="Orders created today"
                tooltip="Number of new rental orders created today"
                color="text-blue-600"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Pickup Orders"
                value={currentStats.activeRentals}
                change="Real-time data"
                description="Currently rented"
                tooltip="Total number of items currently being rented out"
                color="text-purple-600"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Overdue Items"
                value={currentStats.overdueItems}
                change="Real-time data"
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
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg animate-pulse">
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 bg-gray-200 rounded"></div>
                            <div>
                              <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                              <div className="h-3 bg-gray-200 rounded w-32"></div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-12"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (todayOrders || []).length > 0 ? (
                    <div className="space-y-2">
                      {(todayOrders || []).slice(0, 6).map(order => (
                        <div key={order.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Package className="w-4 h-4 text-blue-600" />
                            <div>
                              <div className="font-medium text-sm">{order.orderNumber}</div>
                              <div className="text-xs text-gray-600">
                                {order.pickupPlanAt ? new Date(order.pickupPlanAt).toLocaleDateString() : 'N/A'} • 
                                {order.returnPlanAt ? new Date(order.returnPlanAt).toLocaleDateString() : 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">{order.productNames || 'N/A'}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-blue-600">${(order.totalAmount || 0).toLocaleString()}</div>
                            <div className="text-xs text-gray-500">{order.status}</div>
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
                      { status: 'Reserved', count: orderStatusCounts.reserved || 0, color: 'bg-blue-500' },
                      { status: 'Pickup', count: orderStatusCounts.pickup || 0, color: 'bg-green-500' },
                      { status: 'Return', count: orderStatusCounts.returned || 0, color: 'bg-yellow-500' },
                      { status: 'Completed', count: orderStatusCounts.completed || 0, color: 'bg-gray-500' },
                      { status: 'Cancelled', count: orderStatusCounts.cancelled || 0, color: 'bg-red-500' }
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
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 ${
              user?.role === 'OUTLET_STAFF' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
            }`}>
              {/* Revenue Card - Hidden for OUTLET_STAFF */}
              {user?.role !== 'OUTLET_STAFF' && (
                <StatCard
                  title="Total Revenue"
                  value={currentStats.totalRevenue}
                  change={currentStats.revenueGrowth > 0 ? `+${currentStats.revenueGrowth.toFixed(1)}% growth` : 'No growth data'}
                  description={timePeriod === 'month' ? 'This month' : 'This year'}
                  tooltip="Total revenue from all completed rentals and payments"
                  color="text-green-600"
                  trend={currentStats.revenueGrowth > 0 ? "up" : "neutral"}
                  activeTooltip={activeTooltip}
                  setActiveTooltip={setActiveTooltip}
                />
              )}
              <StatCard
                title="Total Rentals"
                value={currentStats.totalRentals}
                change="Real-time data"
                description="All rentals"
                tooltip="Total number of rental orders created"
                color="text-blue-600"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title="Completed Rentals"
                value={currentStats.completedRentals}
                change="Real-time data"
                description="Successfully completed"
                tooltip="Number of rentals that have been successfully completed"
                color="text-purple-600"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              {/* Future Revenue Card - Hidden for OUTLET_STAFF */}
              {user?.role !== 'OUTLET_STAFF' && (
                <StatCard
                  title="Future Revenue"
                  value={currentStats.futureRevenue}
                  change="Real-time data"
                  description="Booked revenue"
                  tooltip="Expected revenue from upcoming and ongoing rentals"
                  color="text-orange-600"
                  trend="neutral"
                  activeTooltip={activeTooltip}
                  setActiveTooltip={setActiveTooltip}
                />
              )}
            </div>

            {/* Revenue Charts - Hidden for OUTLET_STAFF */}
            {user?.role !== 'OUTLET_STAFF' && (
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
                    data={currentOrderData} 
                    loading={loadingCharts} 
                  />
                </CardContentClean>
              </CardClean>
              </div>
            )}

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
                            <p className="font-semibold text-green-600 text-lg">${(product.totalRevenue || 0).toLocaleString()}</p>
                            <p className="text-sm text-gray-500">{product.rentalCount || 0} total orders</p>
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
                            <p className="font-semibold text-green-600 text-lg">${(customer.totalSpent || 0).toLocaleString()}</p>
                            <p className="text-sm text-gray-500">{customer.orderCount || 0} total orders</p>
                            <p className="text-xs text-gray-400">
                              {customer.rentalCount || 0} rentals • {customer.saleCount || 0} sales
                            </p>
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
    </div>
  );
} 