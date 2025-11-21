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
  DashboardLoading,
  useToast,
  Button,
  AddCustomerDialog,
  ProductAddDialog,
  useFormatCurrency } from '@rentalshop/ui';
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
import { useAuth, useDashboardTranslations, useCommonTranslations } from '@rentalshop/hooks';
import { analyticsApi, ordersApi, customersApi, productsApi, categoriesApi, outletsApi, useFormattedFullDate, useFormattedMonthOnly, useFormattedDaily } from '@rentalshop/utils';
import { useLocale as useNextIntlLocale } from 'next-intl';
import { ORDER_STATUS_COLORS } from '@rentalshop/constants';
import type { CustomerCreateInput, ProductCreateInput } from '@rentalshop/types';

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
// HELPER FUNCTIONS
// ============================================================================
// Map status key to ORDER_STATUS constant and get color
const getStatusDotColor = (statusKey: string): string => {
  const statusMap: Record<string, string> = {
    'reserved': 'RESERVED',
    'pickup': 'PICKUPED',
    'return': 'RETURNED',
    'returned': 'RETURNED',
    'completed': 'COMPLETED',
    'cancelled': 'CANCELLED'
  };
  
  const status = statusMap[statusKey.toLowerCase()] || 'RESERVED';
  const colorClass = ORDER_STATUS_COLORS[status as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.RESERVED;
  
  // Extract background color from class (e.g., "bg-blue-50" -> "bg-blue-700" for dot)
  if (colorClass.includes('blue')) return 'bg-blue-700';
  if (colorClass.includes('orange')) return 'bg-orange-700';
  if (colorClass.includes('green')) return 'bg-green-700';
  if (colorClass.includes('red')) return 'bg-red-700';
  if (colorClass.includes('gray')) return 'bg-gray-700';
  return 'bg-gray-700';
};

// Get status badge color class
const getStatusBadgeColor = (status: string): string => {
  const normalizedStatus = status.toUpperCase();
  return ORDER_STATUS_COLORS[normalizedStatus as keyof typeof ORDER_STATUS_COLORS] || ORDER_STATUS_COLORS.RESERVED;
};

// ============================================================================
// COMPONENTS
// ============================================================================
const StatCard = ({ title, value, change, description, tooltip, color, trend, activeTooltip, setActiveTooltip, position }: {
  title: string;
  value: string | number;
  change: string;
  description: string;
  tooltip: string;
  color: string;
  trend: 'up' | 'down' | 'neutral';
  activeTooltip: string | null;
  setActiveTooltip: (title: string | null) => void;
  position?: 'left' | 'center' | 'right';
}) => {
  const formatMoney = useFormatCurrency();
  const shouldShowDollar = title.toLowerCase().includes('revenue') || title.toLowerCase().includes('income');
  const isTooltipActive = activeTooltip === title;
  
  // Smart tooltip positioning
  const getTooltipClasses = () => {
    if (position === 'left') {
      return "absolute bottom-full right-0 mb-2 px-4 py-3 bg-gray-800 text-white text-xs rounded-lg z-50 w-80 whitespace-normal break-words leading-relaxed";
    } else if (position === 'right') {
      return "absolute bottom-full left-0 mb-2 px-4 py-3 bg-gray-800 text-white text-xs rounded-lg z-50 w-80 whitespace-normal break-words leading-relaxed";
    } else {
      return "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-3 bg-gray-800 text-white text-xs rounded-lg z-50 w-80 whitespace-normal break-words leading-relaxed";
    }
  };
  
  const getArrowClasses = () => {
    if (position === 'left') {
      return "absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800";
    } else if (position === 'right') {
      return "absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800";
    } else {
      return "absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800";
    }
  };
  
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
              <div className={getTooltipClasses()}>
                {tooltip}
                <div className={getArrowClasses()}></div>
              </div>
            )}
          </div>
        </div>
      </CardHeaderClean>
      <CardContentClean>
        <p className={`text-3xl font-bold ${color} mb-2`}>
          {typeof value === 'number' 
            ? shouldShowDollar 
              ? formatMoney(value)
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
  const formatMoney = useFormatCurrency();
  const t = useDashboardTranslations();
  const tc = useCommonTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useNextIntlLocale() as 'en' | 'vi';
  
  // Get timePeriod from URL params or default to 'today'
  const [timePeriod, setTimePeriod] = useState<'today' | 'month' | 'year'>(
    (searchParams.get('period') as 'today' | 'month' | 'year') || 'today'
  );
  const [initialLoading, setInitialLoading] = useState(true);
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
  const [currentDateRange, setCurrentDateRange] = useState<{startDate: string, endDate: string}>({startDate: '', endDate: ''});
  
  // Dialog states
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  
  // Data for product dialog
  const [categories, setCategories] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  
  // Outlet comparison state (MERCHANT only)
  const [selectedOutlets, setSelectedOutlets] = useState<number[]>([]); // Empty = all outlets

  // Fetch categories and outlets for product dialog
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Wait for user to be loaded
        if (!user) return;
        
        const merchantId = user?.merchant?.id || user?.merchantId;
        if (!merchantId) {
          console.log('No merchant ID available');
          return;
        }

        const [categoriesRes, outletsRes] = await Promise.all([
          categoriesApi.getCategories(),
          outletsApi.getOutletsByMerchant(Number(merchantId))
        ]);
        
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
        if (outletsRes.success && outletsRes.data) {
          // Handle both direct array and wrapped object formats
          const outletsList = Array.isArray(outletsRes.data) 
            ? outletsRes.data 
            : outletsRes.data?.outlets || [];
          setOutlets(outletsList);
          console.log('Loaded outlets for product dialog:', outletsList.length);
        }
      } catch (error) {
        console.error('Error fetching categories/outlets:', error);
      }
    };
    
    fetchData();
  }, [user]);

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
  }, [timePeriod, selectedOutlets]); // Fetch when time period or selected outlets change

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
          // Use current year for both start and end
          const currentYear = today.getFullYear();
          startDate = `${currentYear}-01-01`;
          endDate = `${currentYear}-12-31`;
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

      // Store current date range for chart titles
      setCurrentDateRange({ startDate, endDate });

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
      console.log('  💰 Income Analytics:', `/api/analytics/income?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}&groupBy=${defaultFilters.groupBy}${selectedOutlets.length > 0 ? `&outletIds=${selectedOutlets.join(',')}` : ''}`);
      console.log('  📦 Order Analytics:', `/api/analytics/orders?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}&groupBy=${defaultFilters.groupBy}${selectedOutlets.length > 0 ? `&outletIds=${selectedOutlets.join(',')}` : ''}`);
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
        analyticsApi.getIncomeAnalytics({
          ...defaultFilters,
          outletIds: selectedOutlets.length > 0 ? selectedOutlets : undefined
        }).then(response => {
          console.log('💰 Income Analytics API:', response);
          return response;
        }),
        analyticsApi.getOrderAnalytics({
          ...defaultFilters,
          outletIds: selectedOutlets.length > 0 ? selectedOutlets : undefined
        }).then(response => {
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
        analyticsApi.getDashboardSummary(timePeriod).then(response => {
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
        console.log('💰 Income Data from API:', incomeResponse.data);
        console.log('📅 First 3 items:', incomeResponse.data.slice(0, 3));
        console.log('📅 Last 3 items:', incomeResponse.data.slice(-3));
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
      setInitialLoading(false);
    }
  };

  const getStats = () => {
    // Always return the actual stats from API - no hardcoded data
    return stats;
  };

  const getRevenueData = () => {
    // Check if data has outlet information (outlet comparison mode)
    const hasOutletData = incomeData.length > 0 && incomeData.some((item: any) => item.outletId !== undefined);
    
    if (hasOutletData && selectedOutlets.length > 0) {
      // Group by period and outlet for comparison mode
      const groupedByPeriod: { [key: string]: any } = {};
      const outletMap = new Map<number, string>();
      
      // Build outlet map from data
      incomeData.forEach((item: any) => {
        if (item.outletId && item.outletName) {
          outletMap.set(item.outletId, item.outletName);
        }
      });
      
      incomeData.forEach((item: any) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthIndex = monthNames.indexOf(item.month);
        const date = new Date(item.year, monthIndex, 1);
        const periodKey = date.toISOString();
        
        if (!groupedByPeriod[periodKey]) {
          groupedByPeriod[periodKey] = {
            period: periodKey,
            outlets: {} as { [outletId: string]: { actual: number; projected: number; outletName: string } }
          };
        }
        
        const outletKey = item.outletId || 'all';
        const outletName = item.outletName || outletMap.get(item.outletId) || 'All Outlets';
        groupedByPeriod[periodKey].outlets[outletKey] = {
          actual: item.realIncome || 0,
          projected: item.futureIncome || 0,
          outletName: outletName
        };
      });
      
      // Convert to array format for chart
      return Object.values(groupedByPeriod).map((group: any) => {
        const result: any = { period: group.period };
        Object.entries(group.outlets).forEach(([outletId, outletData]: [string, any]) => {
          result[`${outletData.outletName}_actual`] = outletData.actual;
          result[`${outletData.outletName}_projected`] = outletData.projected;
        });
        return result;
      });
    }
    
    // Default behavior: aggregate data (no outlet comparison)
    return incomeData.map((item: any) => {
      // Create a proper date object from month name and year
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthIndex = monthNames.indexOf(item.month);
      const date = new Date(item.year, monthIndex, 1);
      
      return {
        period: date.toISOString(),  // Return ISO string for consistent date formatting
        actual: item.realIncome || 0,
        projected: item.futureIncome || 0
      };
    });
  };

  const getOrderData = () => {
    // Check if data has outlet information (outlet comparison mode)
    const hasOutletData = orderData.length > 0 && orderData.some((item: any) => item.outletId !== undefined);
    
    if (hasOutletData && selectedOutlets.length > 0 && outlets.length > 1) {
      // Group by period and outlet for comparison mode
      const groupedByPeriod: { [key: string]: any } = {};
      const outletMap = new Map<number, string>();
      
      // Build outlet map from data
      orderData.forEach((item: any) => {
        if (item.outletId && item.outletName) {
          outletMap.set(item.outletId, item.outletName);
        }
      });
      
      orderData.forEach((item: any) => {
        // Handle different date formats from API
        let periodKey: string;
        
        if (item.period) {
          // Try to parse as date, otherwise use as-is
          try {
            const date = new Date(item.period);
            periodKey = date.toISOString();
          } catch {
            periodKey = item.period;
          }
        } else if (item.month && item.year) {
          // Convert month/year to period key
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthIndex = monthNames.indexOf(item.month);
          const date = new Date(item.year, monthIndex, 1);
          periodKey = date.toISOString();
        } else {
          periodKey = 'unknown';
        }
        
        if (!groupedByPeriod[periodKey]) {
          groupedByPeriod[periodKey] = {
            period: periodKey,
            outlets: {} as { [outletId: string]: { actual: number; outletName: string } }
          };
        }
        
        const outletKey = item.outletId || 'all';
        const outletName = item.outletName || outletMap.get(item.outletId) || 'All Outlets';
        groupedByPeriod[periodKey].outlets[outletKey] = {
          actual: item.count || item.orderCount || 0,
          outletName: outletName
        };
      });
      
      // Convert to array format for chart
      return Object.values(groupedByPeriod).map((group: any) => {
        // Format period label for display
        let periodLabel: string;
        try {
          const date = new Date(group.period);
          if (timePeriod === 'year') {
            periodLabel = useFormattedMonthOnly(date.toISOString());
          } else {
            periodLabel = useFormattedDaily(date.toISOString());
          }
        } catch {
          periodLabel = group.period;
        }
        
        const result: any = { period: periodLabel };
        Object.entries(group.outlets).forEach(([outletId, outletData]: [string, any]) => {
          result[outletData.outletName] = outletData.actual;
        });
        return result;
      });
    }
    
    // Default behavior: aggregate data (no outlet comparison)
    return orderData.map((item: any) => {
      // Handle different date formats from API
      let periodLabel: string;
      
      if (item.period) {
        // Order Analytics API returns format like "2025-10-02" or "2025-10"
        const date = new Date(item.period);
        // Determine if it's day or month format based on string length
        if (item.period.includes('-') && item.period.split('-').length === 3) {
          // Day format: "2025-10-02"
          periodLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else {
          // Month format: "2025-10"
          periodLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
      } else if (item.month && item.year) {
        // Income Analytics API returns format like "Oct 2025"
        periodLabel = `${item.month} ${item.year}`;
      } else {
        periodLabel = 'Unknown';
      }
      
      return {
        period: periodLabel,
        actual: item.count || item.orderCount || 0,
        projected: item.count || item.orderCount || 0
      };
    });
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

  // Handler for customer creation
  const handleCustomerCreated = async (customerData: any) => {
    try {
      const merchantId = user?.merchant?.id || user?.merchantId;
      if (!merchantId) {
        toastError(tc('labels.error'), tc('messages.sessionExpired'));
        return;
      }

      const response = await customersApi.createCustomer({
        ...customerData,
        phone: customerData.phone || '',
        merchantId: Number(merchantId)
      });
      
      if (response.success) {
        toastSuccess(tc('labels.success'), tc('messages.createSuccess'));
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        throw new Error(response.error || tc('messages.createFailed'));
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toastError(tc('labels.error'), error instanceof Error ? error.message : tc('messages.createFailed'));
      throw error;
    }
  };

  // Handler for product creation
  const handleProductCreated = async (productData: any) => {
    try {
      const merchantId = user?.merchant?.id || user?.merchantId;
      if (!merchantId) {
        toastError(tc('labels.error'), tc('messages.sessionExpired'));
        return;
      }

      const response = await productsApi.createProduct(productData);
      
      if (response.success) {
        toastSuccess(tc('labels.success'), tc('messages.createSuccess'));
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        throw new Error(response.error || tc('messages.createFailed'));
      }
    } catch (error) {
      console.error('Error creating product:', error);
      toastError(tc('labels.error'), error instanceof Error ? error.message : tc('messages.createFailed'));
      throw error;
    }
  };

  // Show loading skeleton on initial load
  if (initialLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <PageWrapper>
          <PageContent>
            <DashboardLoading />
          </PageContent>
        </PageWrapper>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageWrapper>
      
      <PageContent>
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold mb-1.5 text-gray-900">
                  {t('welcome')}, {user?.name || tc('roles.owner')}! 👋
                </h1>
                <p className="text-base text-gray-700 font-medium">
                  {timePeriod === 'today' 
                    ? t('overview')
                    : timePeriod === 'month'
                    ? `${t('overview')} - ${new Date().toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })}`
                    : `${t('overview')} - ${new Date().getFullYear()}`
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
                    {timePeriod === 'today' ? `📊 ${tc('periods.dailyOperations')}` : timePeriod === 'month' ? `📈 ${tc('periods.monthlyAnalytics')}` : `🎯 ${tc('periods.annualStrategy')}`}
                  </span>
                </div>
              </div>
              
              {/* Time Period Filter */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[
                    { id: 'today', label: tc('time.today'), description: 'Operations' },
                    { id: 'month', label: tc('time.thisMonth'), description: 'Statistics' },
                    { id: 'year', label: tc('time.year'), description: tc('periods.annualStrategy') }
                  ].map(period => (
                    <Button
                      key={period.id}
                      onClick={() => updateTimePeriod(period.id as 'today' | 'month' | 'year')}
                      variant={timePeriod === period.id ? 'default' : 'outline'}
                      size="sm"
                      title={period.description}
                    >
                      {period.label}
                    </Button>
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
                  title={t('stats.todayRevenue')}
                  value={currentStats.todayRevenue}
                  change=""
                  description=""
                  tooltip={t('tooltips.todayRevenue')}
                  color="text-green-600"
                  trend="neutral"
                  activeTooltip={activeTooltip}
                  setActiveTooltip={setActiveTooltip}
                  position="left"
                />
              )}
              <StatCard
                title={t('stats.todayRentals')}
                value={currentStats.todayRentals}
                change=""
                description=""
                tooltip={t('tooltips.todayRentals')}
                color="text-blue-700"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
                position="center"
              />
              <StatCard
                title={t('stats.activeRentals')}
                value={currentStats.activeRentals}
                change=""
                description=""
                tooltip={t('tooltips.activeRentals')}
                color="text-purple-600"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
                position="center"
              />
              <StatCard
                title={t('stats.overdueReturns')}
                value={currentStats.overdueItems}
                change=""
                description=""
                tooltip={t('tooltips.overdueReturns')}
                color="text-red-600"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
                position="right"
              />
            </div>

            {/* Today's Operations - 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Recent Activity - Simple Design */}
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">{t('recentActivity.title')}</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  {loadingCharts ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
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
                      {(todayOrders || []).slice(0, 6).map(order => {
                        const statusColor = getStatusBadgeColor(order.status);
                        // Extract background color for card (e.g., "bg-blue-50" from "bg-blue-50 text-blue-700")
                        const cardBgColor = statusColor.split(' ')[0] || 'bg-gray-50';
                        // Extract text color for icon and amount
                        const textColor = statusColor.includes('blue') ? 'text-blue-700' :
                                         statusColor.includes('orange') ? 'text-orange-700' :
                                         statusColor.includes('green') ? 'text-green-700' :
                                         statusColor.includes('red') ? 'text-red-700' :
                                         'text-gray-700';
                        
                        return (
                          <div key={order.id} className={`flex items-center justify-between p-3 ${cardBgColor} rounded-lg border transition-colors hover:shadow-sm`}>
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <Package className={`w-4 h-4 ${textColor} shrink-0`} />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm text-gray-900 truncate">{order.orderNumber}</div>
                                <div className="text-xs text-gray-600 font-normal mt-0.5">
                                  {order.pickupPlanAt ? useFormattedFullDate(order.pickupPlanAt) : 'N/A'} • 
                                  {order.returnPlanAt ? useFormattedFullDate(order.returnPlanAt) : 'N/A'}
                                </div>
                                <div className="text-xs text-gray-500 font-normal truncate">{order.productNames || 'N/A'}</div>
                                <div className="mt-1.5">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right ml-3 shrink-0">
                              <div className={`font-bold text-sm ${textColor}`}>{formatMoney(order.totalAmount || 0)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>{tc('labels.noData')}</p>
                    </div>
                  )}
                </CardContentClean>
              </CardClean>

              {/* Order Status - Simple & Clean Design */}
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">{tc('labels.status')}</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="space-y-3">
                    {[
                      { statusKey: 'reserved', count: orderStatusCounts.reserved || 0 },
                      { statusKey: 'pickup', count: orderStatusCounts.pickup || 0 },
                      { statusKey: 'return', count: orderStatusCounts.returned || 0 },
                      { statusKey: 'completed', count: orderStatusCounts.completed || 0 },
                      { statusKey: 'cancelled', count: orderStatusCounts.cancelled || 0 }
                    ].map((item, index) => {
                      const dotColor = getStatusDotColor(item.statusKey);
                      const statusColor = getStatusBadgeColor(
                        item.statusKey === 'pickup' ? 'PICKUPED' :
                        item.statusKey === 'return' ? 'RETURNED' :
                        item.statusKey.toUpperCase()
                      );
                      const cardBgColor = statusColor.split(' ')[0] || 'bg-gray-50';
                      
                      return (
                        <div key={index} className={`flex items-center justify-between p-3 ${cardBgColor} rounded-lg border hover:shadow-sm transition-all`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${dotColor} shrink-0`}></div>
                            <span className="text-sm font-semibold text-gray-900 capitalize">{t(`orderStatuses.${item.statusKey}`)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-gray-900">{item.count}</span>
                            <span className="text-xs text-gray-400 font-normal">{t('orderStatuses.ordersCount')}</span>
                          </div>
                        </div>
                      );
                    })}
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
                  title={t('stats.totalRevenue')}
                  value={currentStats.totalRevenue}
                  change={currentStats.revenueGrowth > 0 ? `+${currentStats.revenueGrowth.toFixed(1)}%` : ''}
                  description=""
                  tooltip={t('tooltips.totalRevenue')}
                  color="text-green-600"
                  trend={currentStats.revenueGrowth > 0 ? "up" : "neutral"}
                  activeTooltip={activeTooltip}
                  setActiveTooltip={setActiveTooltip}
                />
              )}
              <StatCard
                title={t('stats.totalOrders')}
                value={currentStats.totalRentals}
                change=""
                description=""
                tooltip={t('tooltips.totalOrders')}
                color="text-blue-700"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              <StatCard
                title={t('stats.completedOrders')}
                value={currentStats.completedRentals}
                change=""
                description=""
                tooltip={t('tooltips.completedOrders')}
                color="text-purple-600"
                trend="neutral"
                activeTooltip={activeTooltip}
                setActiveTooltip={setActiveTooltip}
              />
              {/* Future Revenue Card - Hidden for OUTLET_STAFF */}
              {user?.role !== 'OUTLET_STAFF' && (
                <StatCard
                  title={t('stats.futureRevenue')}
                  value={currentStats.futureRevenue}
                  change=""
                  description=""
                  tooltip={t('tooltips.futureRevenue')}
                  color="text-orange-600"
                  trend="neutral"
                  activeTooltip={activeTooltip}
                  setActiveTooltip={setActiveTooltip}
                />
              )}
            </div>

            {/* Outlet Selector - Only for MERCHANT role in month/year views */}
            {user?.role === 'MERCHANT' && outlets.length > 1 && (timePeriod === 'month' || timePeriod === 'year') && (
              <CardClean size="md" className="mb-6">
                <CardHeaderClean>
                  <CardTitleClean size="sm">{t('charts.compareOutlets')}</CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">{t('charts.selectOutletsToCompare')}</p>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedOutlets.length === 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOutlets([]); // All outlets
                            } else {
                              // If unchecking "All", select first outlet
                              if (outlets.length > 0) {
                                setSelectedOutlets([outlets[0].id]);
                              }
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">{t('charts.allOutlets')}</span>
                      </label>
                      {outlets.map((outlet) => {
                        const isChecked = selectedOutlets.length === 0 ? true : selectedOutlets.includes(outlet.id);
                        return (
                          <label key={outlet.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Add outlet to selection
                                  if (selectedOutlets.length === 0) {
                                    // If "all" was selected, replace with this outlet
                                    setSelectedOutlets([outlet.id]);
                                  } else if (!selectedOutlets.includes(outlet.id)) {
                                    setSelectedOutlets([...selectedOutlets, outlet.id]);
                                  }
                                } else {
                                  // Remove outlet from selection
                                  if (selectedOutlets.length === 0) {
                                    // If "all" was checked, select all except this one
                                    setSelectedOutlets(outlets.filter(o => o.id !== outlet.id).map(o => o.id));
                                  } else {
                                    const newSelection = selectedOutlets.filter(id => id !== outlet.id);
                                    // If no outlets selected, default to all (empty array)
                                    setSelectedOutlets(newSelection.length > 0 ? newSelection : []);
                                  }
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{outlet.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </CardContentClean>
              </CardClean>
            )}

            {/* Revenue Charts - Hidden for OUTLET_STAFF */}
            {user?.role !== 'OUTLET_STAFF' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <CardClean size="md">
                  <CardHeaderClean>
                    <CardTitleClean size="md">
                      {timePeriod === 'month' 
                        ? `${useFormattedMonthOnly(new Date())} ${t('chartTitles.monthlyRevenue')}`
                        : `${new Date().getFullYear()} ${t('chartTitles.yearlyRevenue')}`
                      }
                    </CardTitleClean>
                  </CardHeaderClean>
                  <CardContentClean>
                    <IncomeChart 
                      data={currentRevenueData} 
                      loading={loadingCharts}
                      actualLabel={t('charts.actualRevenue')}
                      projectedLabel={t('charts.projectedRevenue')}
                      noDataText={t('charts.noData')}
                      loadingText={tc('labels.loading')}
                      timePeriod={timePeriod}
                      outlets={
                        selectedOutlets.length > 0 && selectedOutlets.length < outlets.length
                          ? outlets.filter(o => selectedOutlets.includes(o.id)).map(o => ({ id: o.id, name: o.name }))
                          : outlets.map(o => ({ id: o.id, name: o.name }))
                      }
                    />
                  </CardContentClean>
                </CardClean>
              
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">
                    {timePeriod === 'month' 
                      ? `${useFormattedMonthOnly(new Date())} ${t('chartTitles.monthlyRentals')}`
                      : `${new Date().getFullYear()} ${t('chartTitles.yearlyRentals')}`
                    }
                  </CardTitleClean>
                </CardHeaderClean>
                <CardContentClean>
                  <OrderChart 
                    data={currentOrderData} 
                    loading={loadingCharts}
                    legendLabel={t('charts.rentalOrders')}
                    tooltipLabel={t('charts.ordersCount')}
                    timePeriod={timePeriod}
                    outlets={selectedOutlets.length > 0 
                      ? outlets.filter(o => selectedOutlets.includes(o.id)).map(o => ({ id: o.id, name: o.name }))
                      : []
                    }
                  />
                </CardContentClean>
              </CardClean>
              </div>
            )}

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">{t('charts.topProducts')}</CardTitleClean>
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
                          <Package className="w-5 h-5 text-blue-700" />
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{product.name}</h4>
                            <p className="text-sm text-gray-600">{product.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600 text-lg">{formatMoney(product.totalRevenue || 0)}</p>
                            <p className="text-sm text-gray-500">{product.rentalCount || 0} total orders</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>{tc('labels.noData')}</p>
                    </div>
                  )}
                </CardContentClean>
              </CardClean>
              
              <CardClean size="md">
                <CardHeaderClean>
                  <CardTitleClean size="md">{t('charts.customerActivity')}</CardTitleClean>
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
                            <p className="font-semibold text-green-600 text-lg">{formatMoney(customer.totalSpent || 0)}</p>
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
                      <p>{tc('labels.noData')}</p>
                    </div>
                  )}
                </CardContentClean>
              </CardClean>
            </div>
          </>
        )}

        {/* Admin Quick Actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">{t('quickActions.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="ghost"
              className="flex items-center gap-3 p-4 h-auto bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-lg transition-colors duration-200 group justify-start"
              onClick={() => router.push('/orders/create')}
            >
              <Package className="w-5 h-5 text-gray-700" />
              <div className="text-left flex-1">
                <p className="font-semibold text-sm text-gray-900">{t('quickActions.createOrder')}</p>
                <p className="text-xs text-gray-600 font-normal">{tc('labels.create')}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            
            <Button
              variant="ghost"
              className="flex items-center gap-3 p-4 h-auto bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-lg transition-colors duration-200 group justify-start"
              onClick={() => setShowAddCustomerDialog(true)}
            >
              <Users className="w-5 h-5 text-gray-700" />
              <div className="text-left flex-1">
                <p className="font-semibold text-sm text-gray-900">{t('quickActions.addCustomer')}</p>
                <p className="text-xs text-gray-600 font-normal">{tc('labels.create')}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            
            <Button
              variant="ghost"
              className="flex items-center gap-3 p-4 h-auto bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-lg transition-colors duration-200 group justify-start"
              onClick={() => setShowAddProductDialog(true)}
            >
              <PackageCheck className="w-5 h-5 text-gray-700" />
              <div className="text-left flex-1">
                <p className="font-semibold text-sm text-gray-900">{t('quickActions.addProduct')}</p>
                <p className="text-xs text-gray-600 font-normal">{tc('labels.create')}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
            
            <Button
              variant="ghost"
              className="flex items-center gap-3 p-4 h-auto bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-lg transition-colors duration-200 group justify-start"
              onClick={() => router.push('/orders')}
            >
              <TrendingUp className="w-5 h-5 text-gray-700" />
              <div className="text-left flex-1">
                <p className="font-semibold text-sm text-gray-900">{t('quickActions.viewReports')}</p>
                <p className="text-xs text-gray-600 font-normal">{tc('navigation.analytics')}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        </div>

        {/* Add Customer Dialog */}
        <AddCustomerDialog
          open={showAddCustomerDialog}
          onOpenChange={setShowAddCustomerDialog}
          onCustomerCreated={handleCustomerCreated}
          onError={(error) => {
            toastError(tc('labels.error'), error);
          }}
        />

        {/* Add Product Dialog */}
        <ProductAddDialog
          open={showAddProductDialog}
          onOpenChange={setShowAddProductDialog}
          categories={categories}
          outlets={outlets}
          merchantId={String(user?.merchantId || user?.merchant?.id || 0)}
          onProductCreated={handleProductCreated}
          onError={(error) => {
            toastError(tc('labels.error'), error);
          }}
        />
      </PageContent>
    </PageWrapper>
    </div>
  );
} 