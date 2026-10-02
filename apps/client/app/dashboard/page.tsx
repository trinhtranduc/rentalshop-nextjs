'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
  useFormatCurrency,
  PageLoadingIndicator,
  FieldTooltip } from '@rentalshop/ui';
import { TopProduct, TopCustomer } from '@rentalshop/types';
import { 
  Package,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus
} from 'lucide-react';
import { useAuth, useDashboardTranslations, useCommonTranslations, useOrderTranslations } from '@rentalshop/hooks';
import { usePermissions } from '@rentalshop/hooks';
import { analyticsApi, ordersApi, customersApi, productsApi, categoriesApi, outletsApi } from '@rentalshop/utils';
// Plain formatters, not the useFormatted* hooks: these run inside loops (#349, Rules of Hooks)
import { formatFullDateByLocale, formatMonthOnlyByLocale, formatDailyByLocale } from '@rentalshop/utils';
import { useLocale as useNextIntlLocale } from 'next-intl';
import { ORDER_STATUS_COLORS, getOrderStatusClassName, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import { OutletOperationsPanel, UpcomingReturnsCard, useOutletOperations } from './OutletOperationsPanel';
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
  ordersGrowth: number;
  customerBase: number;
  totalCollateral: number; // Tổng tiền thế chân (chỉ tính cho đơn đã PICKUPED)
  // Range periods (#350): from /api/analytics/period → operational
  newOrders: number;
  cancelledOrders: number;
  depositRefund: number;
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
// Option 5: Minimal text-only design - extract dot color from text color
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
  
  // Extract dot color from text color (minimal design)
  if (colorClass.includes('blue-700')) return 'bg-blue-700';
  if (colorClass.includes('green-700')) return 'bg-green-700';
  if (colorClass.includes('green-600')) return 'bg-green-600';
  if (colorClass.includes('gray-700')) return 'bg-gray-700';
  if (colorClass.includes('gray-500')) return 'bg-gray-500';
  return 'bg-gray-600';
};

// Get status badge color class - use the same function as order pages
const getStatusBadgeColor = (status: string): string => {
  return getOrderStatusClassName(status);
};

// Format date as YYYY-MM-DD using local date components (avoids timezone conversion issues)
const formatDateAsYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Parse date from API format: "dd/mm/yy" (daily) or "mm/yy" (monthly)
const parseDateFromAPIFormat = (monthStr: string, year: number): Date => {
  // Check if format is "dd/mm/yy" (daily) or "mm/yy" (monthly)
  const parts = monthStr.split('/');
  
  if (parts.length === 3) {
    // Daily format: "dd/mm/yy" (e.g., "21/11/25")
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    // Handle 2-digit year: assume 20xx for years < 50, 19xx for years >= 50
    const fullYear = parseInt(parts[2], 10) < 50 ? 2000 + parseInt(parts[2], 10) : 1900 + parseInt(parts[2], 10);
    return new Date(fullYear, month, day);
  } else if (parts.length === 2) {
    // Monthly format: "mm/yy" (e.g., "11/25")
    const month = parseInt(parts[0], 10) - 1; // Month is 0-indexed
    // Handle 2-digit year: assume 20xx for years < 50, 19xx for years >= 50
    const fullYear = parseInt(parts[1], 10) < 50 ? 2000 + parseInt(parts[1], 10) : 1900 + parseInt(parts[1], 10);
    return new Date(fullYear, month, 1); // First day of month
  }
  
  // Fallback: try to parse as old format "Nov 21" or "Nov"
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthParts = monthStr.trim().split(' ');
  const monthName = monthParts[0];
  const day = monthParts.length > 1 ? parseInt(monthParts[1]) : 1;
  
  const monthIndex = monthNames.indexOf(monthName);
  if (monthIndex >= 0) {
    return new Date(year, monthIndex, day);
  }
  
  // Last fallback: use provided year and current date
  return new Date(year, 0, 1);
};

// ============================================================================
// COMPONENTS
// ============================================================================
const StatCard = ({ title, value, change, description, tooltip, color, trend, onClick, isMoney = false }: {
  title: string;
  value: string | number;
  change: string;
  description: string;
  tooltip: string;
  color: string;
  trend: 'up' | 'down' | 'neutral';
  onClick?: () => void;
  /** Money value: format with the merchant currency. Guessing from the (translated) title failed in Vietnamese (#349). */
  isMoney?: boolean;
}) => {
  const formatMoney = useFormatCurrency();
  const shouldShowDollar = isMoney;
  
  // Compact KPI tile (#350): title, then value and growth on one line. ~80px instead of ~160px.
  const cardContent = (
    <div
      className={`h-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-3 sm:px-4 transition-colors duration-200 ${
        onClick ? 'hover:border-blue-300 hover:bg-blue-50/30' : ''
      }`}
    >
      <div className="flex items-start gap-1 text-xs sm:text-sm font-medium text-gray-600">
        {/* Wraps on phones (three tiles per row) instead of cutting "Doanh th…" */}
        <span className="leading-snug">{title}</span>
        <FieldTooltip text={tooltip} />
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className={`text-xl sm:text-2xl font-bold leading-tight ${color}`}>
          {typeof value === 'number'
            ? shouldShowDollar
              ? formatMoney(value)
              : value.toLocaleString()
            : value}
        </p>
        {change && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold ${
              trend === 'up' ? 'bg-green-50 text-green-700' : trend === 'down' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
            }`}
          >
            {trend === 'up' ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : trend === 'down' ? (
              <ArrowDownRight className="h-3.5 w-3.5" />
            ) : (
              <Minus className="h-3.5 w-3.5" />
            )}
            {change}
          </span>
        )}
      </div>
      {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
    </div>
  );

  if (onClick) {
    return (
      <div 
        onClick={onClick}
        className="cursor-pointer h-full"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {cardContent}
      </div>
    );
  }

  return <div className="h-full">{cardContent}</div>;
};

type DashboardPeriod = 'today' | '7d' | '30d' | 'month' | 'year';
const DASHBOARD_PERIODS: DashboardPeriod[] = ['today', '7d', '30d', 'month', 'year'];
type PerformanceChartMode = 'revenue' | 'growth' | 'orders';

/**
 * Growth chip for range KPIs (#350). A jump of 1000%+ means the previous period was (almost) empty,
 * so a percentage is noise: show "new" instead.
 */
function growthChip(value: number | null | undefined, newLabel: string): { text: string; trend: 'up' | 'down' | 'neutral' } {
  if (value == null || Number.isNaN(value) || value === 0) return { text: '', trend: 'neutral' };
  if (Math.abs(value) >= 1000) return { text: newLabel, trend: 'up' };
  const text = `${value > 0 ? '+' : ''}${value.toFixed(Math.abs(value) % 1 === 0 ? 0 : 1)}%`;
  return { text, trend: value > 0 ? 'up' : 'down' };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { toastSuccess } = useToast();
  const formatMoney = useFormatCurrency();
  const t = useDashboardTranslations();
  const tc = useCommonTranslations();
  const to = useOrderTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  // ✅ Use permissions hook to check permissions
  const { hasPermission, canViewRevenue, canViewOrderAnalytics, canViewCustomerAnalytics, canViewProductAnalytics } = usePermissions();
  const locale = useNextIntlLocale() as 'en' | 'vi';
  
  // Check if user has full analytics access (not just dashboard)
  // Users with only 'analytics.view.dashboard' can only view 'today' period
  const hasFullAnalyticsAccess = canViewRevenue || canViewOrderAnalytics || canViewCustomerAnalytics || canViewProductAnalytics;
  
  // Get timePeriod from URL params or default to 'today'
  // Users without full analytics access can only view 'today' period
  const defaultPeriod = !hasFullAnalyticsAccess
    ? 'today'
    : ((DASHBOARD_PERIODS.includes(searchParams.get('period') as DashboardPeriod)
        ? (searchParams.get('period') as DashboardPeriod)
        : 'today'));
  const [timePeriod, setTimePeriod] = useState<DashboardPeriod>(defaultPeriod);
  const [performanceMode, setPerformanceMode] = useState<PerformanceChartMode>('revenue');
  const isRangePeriod = timePeriod !== 'today';
  const [initialLoading, setInitialLoading] = useState(false); // Start with false - page renders immediately
  const [loadingCharts, setLoadingCharts] = useState(false); // Start with false - page renders immediately
  
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
    ordersGrowth: 0,
    customerBase: 0,
    totalCollateral: 0, // Tổng tiền thế chân (chỉ tính cho đơn đã PICKUPED)
    newOrders: 0,
    cancelledOrders: 0,
    depositRefund: 0
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
  // Today's work + returns soon: one request shared by the panel and the list (#350)
  const operations = useOutletOperations(selectedOutlets);

  // Memoize selectedOutlets to prevent unnecessary re-renders (must be before fetchDashboardData)
  const selectedOutletsKey = useMemo(() => {
    return selectedOutlets.length > 0 ? selectedOutlets.sort().join(',') : 'all';
  }, [selectedOutlets]);

  // Memoize selectedOutlets array to prevent reference changes (use JSON.stringify for deep comparison)
  const memoizedSelectedOutlets = useMemo(() => {
    return selectedOutlets.length > 0 ? [...selectedOutlets].sort() : [];
  }, [selectedOutletsKey]); // Use selectedOutletsKey for stability

  // Memoize user.id and merchantId to prevent unnecessary re-renders (user object reference may change)
  const userId = useMemo(() => user?.id || null, [user?.id]);
  const merchantId = useMemo(() => user?.merchant?.id || user?.merchantId || null, [user?.merchant?.id, user?.merchantId]);

  // Fetch categories and outlets for product dialog
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Wait for auth to finish loading first
        if (authLoading) {
          console.log('⏳ Categories/Outlets: Auth still loading, waiting...');
          return;
        }
        
        // Wait for user to be loaded
        if (!user) return;
        
        const merchantId = user?.merchant?.id || user?.merchantId;
        if (!merchantId) {
          console.log('No merchant ID available');
          return;
        }

        // Check if this is right after login - add delay for backend to be ready
        const loginTime = localStorage.getItem('last_login_time');
        const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime, 10)) < 3000;
        
        if (isRecentLogin) {
          console.log('⏳ Recent login detected, waiting 500ms before API calls');
          await new Promise(resolve => setTimeout(resolve, 500));
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
  }, [user, authLoading]);

  // Function to update URL when time period changes
  // Users without full analytics access can only view 'today' period - force to 'today' if they try to change
  const updateTimePeriod = (newPeriod: DashboardPeriod) => {
    // Force users without full analytics access to stay on 'today' period
    if (!hasFullAnalyticsAccess) {
      setTimePeriod('today');
      const params = new URLSearchParams(searchParams.toString());
      params.set('period', 'today');
      router.push(`/dashboard?${params.toString()}`, { scroll: false });
      return;
    }
    
    setTimePeriod(newPeriod);
    // Update URL without causing page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', newPeriod);
    router.push(`/dashboard?${params.toString()}`, { scroll: false });
  };

  // Sync URL params on mount
  // Users without full analytics access can only view 'today' period
  useEffect(() => {
    // Permissions are unknown until the user loads; enforcing earlier reset ?period=30d to today (#350)
    if (authLoading || !user) return;
    if (!hasFullAnalyticsAccess) {
      setTimePeriod('today');
      const params = new URLSearchParams(searchParams.toString());
      params.set('period', 'today');
      router.push(`/dashboard?${params.toString()}`, { scroll: false });
      return;
    }
    
    const urlPeriod = searchParams.get('period');
    if (urlPeriod && DASHBOARD_PERIODS.includes(urlPeriod as DashboardPeriod)) {
      setTimePeriod(urlPeriod as DashboardPeriod);
    }
      }, [searchParams, hasFullAnalyticsAccess, router, authLoading, user]);

  // Memoize fetchDashboardData function to prevent unnecessary re-creations
  const fetchDashboardData = useCallback(async () => {
    try {
      // Step 1: Guard - Check token before making API calls
      const { getAuthToken } = await import('@rentalshop/utils');
      const token = getAuthToken();
      
      if (!token) {
        console.warn('⚠️ fetchDashboardData: No token available, skipping API calls');
        setLoadingCharts(false);
        return;
      }

      // Step 2: Guard - Wait for auth to finish loading before checking user
      if (authLoading) {
        console.log('⏳ fetchDashboardData: Auth still loading, waiting...');
        return; // Don't set loadingCharts to false, keep it as is
      }

      // Step 3: Guard - Verify user is loaded after auth loading completes
      if (!user) {
        console.warn('⚠️ fetchDashboardData: User not loaded after auth loading completed, skipping API calls');
        setLoadingCharts(false);
        return;
      }

      console.log('✅ fetchDashboardData: Token and user confirmed, proceeding with API calls');
      
      // Check if this is right after login - add delay for backend to be ready
      const loginTime = localStorage.getItem('last_login_time');
      const isRecentLogin = loginTime && (Date.now() - parseInt(loginTime, 10)) < 3000;
      
      if (isRecentLogin) {
        console.log('⏳ Recent login detected, waiting 500ms before API calls to allow backend to sync');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setLoadingCharts(true);

      // Dynamic date calculation based on time period
      const today = new Date();
      let startDate: string;
      let endDate: string;
      let groupBy: 'day' | 'month';

      switch (timePeriod) {
        case 'today': {
          const todayStr = today.toISOString().split('T')[0];
          startDate = todayStr;
          endDate = todayStr;
          groupBy = 'day';
          break;
        }
        case '7d': {
          const start = new Date(today);
          start.setDate(today.getDate() - 6);
          startDate = start.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
          groupBy = 'day';
          break;
        }
        case '30d': {
          const start = new Date(today);
          start.setDate(today.getDate() - 29);
          startDate = start.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
          groupBy = 'day';
          break;
        }
        case 'month': {
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          startDate = monthStart.toISOString().split('T')[0];
          endDate = monthEnd.toISOString().split('T')[0];
          groupBy = 'day';
          break;
        }
        case 'year': {
          const currentYear = today.getFullYear();
          startDate = `${currentYear}-01-01`;
          endDate = `${currentYear}-12-31`;
          groupBy = 'month';
          break;
        }
        default: {
          const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const defaultEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          startDate = defaultStart.toISOString().split('T')[0];
          endDate = defaultEnd.toISOString().split('T')[0];
          groupBy = 'day';
        }
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

      // Check permissions to determine which APIs to call
      // OUTLET_STAFF only has 'analytics.view.dashboard' and 'analytics.view.revenue.daily'
      // Other roles have full analytics permissions
      const canViewFullAnalytics = hasPermission('analytics.view.revenue') || 
                                    hasPermission('analytics.view.orders') ||
                                    hasPermission('analytics.view.customers') ||
                                    hasPermission('analytics.view.products');

      console.log('🚀 Starting parallel API calls...');
      console.log('🔗 API URLs being called:');
      console.log('  📊 Enhanced Dashboard:', `/api/analytics/enhanced-dashboard?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}&groupBy=${defaultFilters.groupBy}`);
      console.log('  📈 Today Metrics:', '/api/analytics/today-metrics');
      
      // Users without full analytics permissions can only access dashboard APIs
      if (canViewFullAnalytics) {
      console.log('  📊 Period Report:', `/api/analytics/period?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}&limit=5`);
      console.log('  💰 Income Analytics:', `/api/analytics/income?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}&groupBy=${defaultFilters.groupBy}${memoizedSelectedOutlets.length > 0 ? `&outletIds=${memoizedSelectedOutlets.join(',')}` : ''}`);
      console.log('  📦 Order Analytics:', `/api/analytics/orders?startDate=${defaultFilters.startDate}&endDate=${defaultFilters.endDate}&groupBy=${defaultFilters.groupBy}${memoizedSelectedOutlets.length > 0 ? `&outletIds=${memoizedSelectedOutlets.join(',')}` : ''}`);
      } else {
        console.log('  ⚠️ Limited permissions: Skipping restricted analytics APIs (period, income, orders)');
      }
      console.log('  📋 Dashboard Summary:', '/api/analytics/dashboard');
      
      // Build API calls based on user role
      const apiCalls: Promise<any>[] = [
        analyticsApi.getEnhancedDashboardSummary(defaultFilters).then(response => {
          console.log('📊 Enhanced Dashboard Summary API:', response);
          return response;
        }),
        analyticsApi.getTodayMetrics().then(response => {
          console.log('📈 Today Metrics API:', response);
          return response;
        }),
        analyticsApi.getDashboardSummary(
          timePeriod === 'today' || timePeriod === 'month' || timePeriod === 'year'
            ? timePeriod
            : 'month'
        ).then(response => {
          console.log('📋 Dashboard Summary API:', response);
          return response;
        })
      ];
      
      // Only call restricted APIs if user has full analytics permissions
      if (canViewFullAnalytics) {
        apiCalls.push(
        analyticsApi.getPeriodReport({
          ...defaultFilters,
          limit: 5,
        }).then(response => {
          console.log('📊 Period Report API:', response);
          return response;
        }),
        analyticsApi.getIncomeAnalytics({
          ...defaultFilters,
          outletIds: memoizedSelectedOutlets.length > 0 ? memoizedSelectedOutlets : undefined
        }).then(response => {
          console.log('💰 Income Analytics API:', response);
          return response;
        }),
        analyticsApi.getOrderAnalytics({
          ...defaultFilters,
          outletIds: memoizedSelectedOutlets.length > 0 ? memoizedSelectedOutlets : undefined
        }).then(response => {
          console.log('📦 Order Analytics API:', response);
          return response;
        })
        );
      }
      
      const results = await Promise.all(apiCalls);
      
      // Extract responses based on role
      const statsResponse = results[0];
      const todayMetricsResponse = results[1];
      const dashboardResponse = results[2];
      
      // For users with full analytics permissions, extract additional responses
      let growthMetricsResponse: any = { success: false, data: null };
      let incomeResponse: any = { success: false, data: null };
      let ordersResponse: any = { success: false, data: null };
      let topProductsResponse: any = { success: false, data: null };
      let topCustomersResponse: any = { success: false, data: null };
      
      let periodRevenueTotals: { totalRevenue?: number; totalActualRevenue?: number; totalOrders?: number } | null = null;
      let periodOperational: { orderCounts?: { new?: number; cancelled?: number }; totalDepositRefund?: number } | null = null;
      
      if (canViewFullAnalytics) {
        const periodResponse = results[3];
        incomeResponse = results[4];
        ordersResponse = results[5];
        if (periodResponse?.success && periodResponse.data) {
          const period = periodResponse.data as any;
          periodRevenueTotals = period.revenue ?? null;
          periodOperational = period.operational ?? null;
          growthMetricsResponse = {
            success: true,
            data: period.growth ?? null,
          };
          topProductsResponse = {
            success: true,
            data: period.topProducts ?? [],
          };
          topCustomersResponse = {
            success: true,
            data: period.topCustomers ?? [],
          };
        }
      }

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
        
        // Calculate total collateral from income data (if available)
        let totalCollateral = 0;
        if (incomeResponse.success && incomeResponse.data && Array.isArray(incomeResponse.data)) {
          console.log('💰 Income Data from API:', incomeResponse.data);
          console.log('📅 First 3 items:', incomeResponse.data.slice(0, 3));
          console.log('📅 Last 3 items:', incomeResponse.data.slice(-3));
          
          totalCollateral = incomeResponse.data.reduce((sum: number, item: any) => {
            return sum + (item.totalCollateral || 0);
          }, 0);
          
          console.log('💰 Total Collateral calculated:', totalCollateral);
        }
        
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
          totalRevenue:
            periodRevenueTotals?.totalActualRevenue ??
            periodRevenueTotals?.totalRevenue ??
            apiStats.thisMonth?.revenue ??
            0,
          totalRentals: periodRevenueTotals?.totalOrders ?? apiStats.thisMonth?.orders ?? 0,
          // Was the same number as totalRentals (#350); kept for the today view handlers
          completedRentals: periodRevenueTotals?.totalOrders ?? apiStats.thisMonth?.orders ?? 0,
          newOrders: periodOperational?.orderCounts?.new ?? 0,
          cancelledOrders: periodOperational?.orderCounts?.cancelled ?? 0,
          depositRefund: periodOperational?.totalDepositRefund ?? 0,
          // Period growth is vs previous equal-length window; prefer it over enhanced-dashboard MoM.
          customerGrowth: growthMetrics.customerGrowth || 0,
          futureRevenue: 0, // Not available in current API
          revenueGrowth:
            growthMetrics.revenue?.growth ?? apiStats.growth?.revenue ?? 0,
          ordersGrowth:
            growthMetrics.orders?.growth ?? apiStats.growth?.orders ?? 0,
          customerBase: growthMetrics.customerBase || 0,
          totalCollateral: totalCollateral // Calculated from income data
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
        
        // Also update totalCollateral when income data is set
        // This ensures it's updated even if incomeResponse is processed after statsResponse
        const totalCollateral = incomeResponse.data.reduce((sum: number, item: any) => {
          return sum + (item.totalCollateral || 0);
        }, 0);
        
        console.log('💰 Updating totalCollateral from income data:', totalCollateral);
        setStats(prevStats => ({
          ...prevStats,
          totalCollateral: totalCollateral
        }));
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
        // Handle nested data structure: response.data.data contains the array
        const customersData = Array.isArray(topCustomersResponse.data) 
          ? topCustomersResponse.data 
          : (topCustomersResponse.data as any).data || [];
        console.log('✅ Top Customers data loaded:', customersData);
        console.log('🔍 First customer structure:', customersData[0]);
        setTopCustomers(customersData);
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
        // Error automatically handled by useGlobalErrorHandler
        return;
      }
      
      // Handle other errors - automatically handled by useGlobalErrorHandler
      
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
        ordersGrowth: 0,
        customerBase: 0,
        totalCollateral: 0,
        newOrders: 0,
        cancelledOrders: 0,
        depositRefund: 0
      });
      setIncomeData([]);
      setOrderData([]);
      setTopProducts([]);
      setTopCustomers([]);
    } finally {
      setLoadingCharts(false);
      setInitialLoading(false);
    }
  }, [userId, timePeriod, selectedOutletsKey, memoizedSelectedOutlets]); // Use stable values

  // Update totalCollateral when incomeData changes
  useEffect(() => {
    if (incomeData.length > 0) {
      const totalCollateral = incomeData.reduce((sum: number, item: any) => {
        return sum + (item.totalCollateral || 0);
      }, 0);
      
      console.log('💰 useEffect: Updating totalCollateral from incomeData:', totalCollateral, 'from', incomeData.length, 'items');
      console.log('💰 First item sample:', incomeData[0]);
      setStats(prevStats => ({
        ...prevStats,
        totalCollateral: totalCollateral
      }));
    }
  }, [incomeData]);

  // Main useEffect to fetch dashboard data
  useEffect(() => {
    // Guard: Wait for auth to finish loading first
    if (authLoading) {
      console.log('⏳ Dashboard: Auth still loading, waiting...');
      return;
    }

    // Guard: Only fetch data when user is confirmed loaded and token exists
    if (!userId || !merchantId) {
      console.log('⏳ Dashboard: Waiting for user to be loaded before fetching data');
      return;
    }

    // Verify token exists before making API calls
    const checkTokenAndFetch = async () => {
      const { getAuthToken } = await import('@rentalshop/utils');
      const token = getAuthToken();
      if (!token) {
        console.warn('⚠️ Dashboard: No token found, skipping API calls. User may not be fully authenticated yet.');
        return;
      }

      console.log('✅ Dashboard: User and token confirmed, fetching dashboard data');
      fetchDashboardData();
    };

    checkTokenAndFetch();
  }, [userId, merchantId, timePeriod, selectedOutletsKey, fetchDashboardData, authLoading]); // Include authLoading

  // Auto-refresh disabled - user can manually refresh using browser refresh button
  // Uncomment below to enable auto-refresh every 30 seconds
  // useEffect(() => {
  //   if (!userId) return; // Don't set interval if no user
  //   
  //   const interval = setInterval(() => {
  //     console.log('🔄 Auto-refreshing dashboard data...');
  //     fetchDashboardData();
  //   }, 30000); // 30 seconds

  //   return () => clearInterval(interval);
  // }, [fetchDashboardData, userId]); // Use memoized function and userId

  const getStats = () => {
    // Always return the actual stats from API - no hardcoded data
    return stats;
  };

  const getRevenueData = () => {
    // Check if data has outlet information (outlet comparison mode)
    const hasOutletData = incomeData.length > 0 && incomeData.some((item: any) => item.outletId !== undefined);
    
    if (hasOutletData && memoizedSelectedOutlets.length > 0) {
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
        // Parse period from API response
        // API returns: month: "21/11/25" (for daily) or "11/25" (for monthly), year: 2025
        let date: Date;
        
        if (item.month && item.year) {
          date = parseDateFromAPIFormat(item.month, item.year);
        } else {
          date = new Date();
        }
        
        const periodKey = formatDateAsYYYYMMDD(date);
        
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
      // Parse period from API response
      // API returns: month: "21/11/25" (for daily) or "11/25" (for monthly), year: 2025
      let date: Date;
      
      if (item.month && item.year) {
        date = parseDateFromAPIFormat(item.month, item.year);
      } else if (item.period) {
        // If period is already a date string
        date = new Date(item.period);
      } else {
        // Fallback to current date
        date = new Date();
      }
      
      const result = {
        period: formatDateAsYYYYMMDD(date),  // Return YYYY-MM-DD format to avoid timezone conversion issues
        actual: item.realIncome || 0,
        projected: item.futureIncome || 0
      };
      
      // Debug: log first few items and items with data to verify parsing
      if (incomeData.indexOf(item) < 3 || item.realIncome > 0) {
        console.log('🔍 Revenue data item:', {
          original: { month: item.month, year: item.year, realIncome: item.realIncome },
          parsed: { period: result.period, actual: result.actual, projected: result.projected },
          date: formatDateAsYYYYMMDD(date),
          parsedDate: date.toString()
        });
      }
      
      return result;
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
            periodKey = formatDateAsYYYYMMDD(date);
          } catch {
            periodKey = item.period;
          }
        } else if (item.month && item.year) {
          // Parse month/year - handle "Nov 25" format (daily) or "Nov" format (monthly)
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const monthParts = item.month.trim().split(' ');
          const monthName = monthParts[0]; // Extract "Nov" from "Nov 25"
          const day = monthParts.length > 1 ? parseInt(monthParts[1]) : 1; // Extract day if present, default to 1
          
          const monthIndex = monthNames.indexOf(monthName);
          if (monthIndex >= 0) {
            const date = new Date(item.year, monthIndex, day);
          periodKey = formatDateAsYYYYMMDD(date);
          } else {
            periodKey = 'unknown';
          }
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
            periodLabel = formatMonthOnlyByLocale(date, locale);
          } else {
            periodLabel = formatDailyByLocale(date, locale);
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
      // Parse period from API response
      let date: Date;
      
      if (item.period) {
        // Order Analytics API returns format like "2025-10-02" or "2025-10"
        date = new Date(item.period);
      } else if (item.month && item.year) {
        // Parse month/year - handle "Nov 25" format (daily) or "Nov" format (monthly)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthParts = item.month.trim().split(' ');
        const monthName = monthParts[0]; // Extract "Nov" from "Nov 25"
        const day = monthParts.length > 1 ? parseInt(monthParts[1]) : 1; // Extract day if present, default to 1
        
        const monthIndex = monthNames.indexOf(monthName);
        if (monthIndex >= 0) {
          date = new Date(item.year, monthIndex, day);
        } else {
          date = new Date(item.month + ' ' + item.year);
        }
      } else {
        date = new Date();
      }
      
      return {
        period: formatDateAsYYYYMMDD(date),  // Return YYYY-MM-DD format to avoid timezone conversion issues
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

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Navigation handlers for stat cards
  const handleViewActiveRentals = () => {
    router.push(`/orders?status=${ORDER_STATUS.PICKUPED}`);
  };

  const handleViewTodayRentals = () => {
    const today = getTodayDateString();
    router.push(`/orders?startDate=${today}&endDate=${today}`);
  };


  // Navigation handlers for month/year view stat cards
  const handleViewTotalOrders = () => {
    // Use currentDateRange if available, otherwise calculate from timePeriod
    let startDate: string;
    let endDate: string;
    
    if (currentDateRange.startDate && currentDateRange.endDate) {
      startDate = currentDateRange.startDate;
      endDate = currentDateRange.endDate;
    } else {
      // Fallback: calculate from timePeriod
      const today = new Date();
      if (timePeriod === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        startDate = monthStart.toISOString().split('T')[0];
        endDate = monthEnd.toISOString().split('T')[0];
      } else if (timePeriod === 'year') {
        const currentYear = today.getFullYear();
        startDate = `${currentYear}-01-01`;
        endDate = `${currentYear}-12-31`;
      } else {
        // Default to today
        const todayStr = getTodayDateString();
        startDate = todayStr;
        endDate = todayStr;
      }
    }
    
    router.push(`/orders?startDate=${startDate}&endDate=${endDate}`);
  };

  
  // Debug: log revenue data for chart
  useEffect(() => {
    if (currentRevenueData.length > 0) {
      const itemsWithData = currentRevenueData.filter(item => item.actual > 0 || item.projected > 0);
      console.log('📊 Revenue data for chart:', {
        totalItems: currentRevenueData.length,
        first3: currentRevenueData.slice(0, 3),
        last3: currentRevenueData.slice(-3),
        hasData: currentRevenueData.some(item => item.actual > 0 || item.projected > 0),
        itemsWithData: itemsWithData,
        allPeriods: currentRevenueData.map(item => ({ period: item.period, actual: item.actual, projected: item.projected }))
      });
    }
  }, [currentRevenueData]);
  
  // Debug popular data
  console.log('🔍 Current Top Products:', currentTopProducts);
  console.log('🔍 Current Top Customers:', currentTopCustomers);

  // Handler for customer creation
  const handleCustomerCreated = async (customerData: any) => {
    try {
      const merchantId = user?.merchant?.id || user?.merchantId;
      if (!merchantId) {
        // Error automatically handled by useGlobalErrorHandler
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
      // Error automatically handled by useGlobalErrorHandler
      throw error;
    }
  };

  // Handler for product creation
  const handleProductCreated = async (productData: any, files?: File[]) => {
    try {
      const merchantId = user?.merchant?.id || user?.merchantId;
      if (!merchantId) {
        // Error automatically handled by useGlobalErrorHandler
        return;
      }

      // Always use createProduct - it now always uses multipart form data (unified format)
      const response = await productsApi.createProduct(productData, files);
      
      if (response.success) {
        toastSuccess(tc('labels.success'), tc('messages.createSuccess'));
        // Refresh dashboard data
        fetchDashboardData();
      } else {
        throw new Error(response.error || tc('messages.createFailed'));
      }
    } catch (error) {
      // Error automatically handled by useGlobalErrorHandler
      throw error;
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <PageWrapper>
        {/* Page Loading Indicator - Floating, non-blocking */}
        <PageLoadingIndicator loading={authLoading || initialLoading || loadingCharts} />
      <PageContent>
        {/* Subscription banner: merchant-only (billing is org-level, not outlet) */}
        {user?.role === USER_ROLE.MERCHANT && (
          <div className="sticky top-0 z-20 -mx-4 px-4 pt-1 pb-3 mb-4 bg-bg-primary/95 backdrop-blur-sm border-b border-border/60 supports-[backdrop-filter]:bg-bg-primary/80">
            <SubscriptionStatusBanner
              dismissible
              onPayment={() => router.push('/subscription')}
              dashboardLoaded={!initialLoading}
            />
          </div>
        )}

        {/* Welcome Header - Modern Style */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t('welcome')}, {user?.name || tc('roles.OUTLET_STAFF')} 👋
              </h1>
              <p className="text-base text-gray-600">
                {timePeriod === 'today'
                  ? t('overview')
                  : timePeriod === '7d'
                  ? `${t('overview')} — ${tc('time.last7Days')}`
                  : timePeriod === '30d'
                  ? `${t('overview')} — ${tc('time.last30Days')}`
                  : timePeriod === 'month'
                  ? `${t('overview')} - ${new Date().toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })}`
                  : `${t('overview')} - ${new Date().getFullYear()}`
                }
              </p>
            </div>
            
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            {/* Time Period Filter - Modern Pills */}
            {/* Users without full analytics access can only view 'today' - hide month/year tabs */}
            {hasFullAnalyticsAccess ? (
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-full sm:w-fit overflow-x-auto">
              {[
                { id: 'today', label: tc('time.today') },
                { id: '7d', label: tc('time.last7Days') },
                { id: '30d', label: tc('time.last30Days') },
                { id: 'month', label: tc('time.thisMonth') },
                { id: 'year', label: tc('time.year') }
              ].map(period => (
                <button
                  key={period.id}
                  onClick={() => updateTimePeriod(period.id as DashboardPeriod)}
                  className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    timePeriod === period.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
            ) : (
              // For users without full analytics access, show only "Today" label (not clickable)
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
                <div className="px-4 py-2 rounded-md text-sm font-medium bg-white text-gray-900 shadow-sm">
                  {tc('time.today')}
                </div>
              </div>
            )}
            {/* Replaces the "Thao tác nhanh" card at the bottom (#350) */}
            {hasPermission('orders.create') && (
              <Button onClick={() => router.push('/orders/create')} className="shrink-0 cursor-pointer">
                <Plus className="mr-1.5 h-4 w-4" />
                {t('quickActions.createOrder')}
              </Button>
            )}
            </div>
          </div>
        </div>

        {/* Today View - Operational Focus */}
        {timePeriod === 'today' && (
          <>
            {/* Today: compact KPIs, then today's work, then new orders + returns soon (#350).
                One place per fact: overdue lives in the panel, deposits in "Tiền trong ca". */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 items-stretch">
              <StatCard
                isMoney
                title={t('stats.todayRevenue')}
                value={currentStats.todayRevenue}
                change=""
                description=""
                tooltip={t('tooltips.todayRevenue')}
                color="text-blue-700"
                trend="neutral"
              />
              <StatCard
                title={t('operations.newOrders')}
                value={currentStats.todayRentals}
                change=""
                description=""
                tooltip={t('tooltips.todayRentals')}
                color="text-blue-700"
                trend="neutral"
                onClick={handleViewTodayRentals}
              />
              <StatCard
                title={t('stats.activeRentals')}
                value={currentStats.activeRentals}
                change=""
                description=""
                tooltip={t('tooltips.activeRentals')}
                color="text-blue-700"
                trend="neutral"
                onClick={currentStats.activeRentals > 0 ? handleViewActiveRentals : undefined}
              />
            </div>

            <OutletOperationsPanel state={operations} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-start">
              {/* Recent activity: two-line rows like the operations panel (~66px, was ~98px) (#350) */}
              <section className="min-w-0 rounded-lg border border-gray-200 bg-white">
                <header className="flex items-baseline justify-between px-4 pt-4">
                  {/* Orders with activity today (not only created today), so no count next to the
                      "Đơn mới hôm nay" KPI to avoid two different numbers */}
                  <h2 className="text-base font-semibold text-gray-900">{t('recentActivity.title')}</h2>
                </header>
                <div className="px-4 pb-2">
                  {loadingCharts ? (
                    <div className="my-4 h-24 rounded-md bg-gray-50 animate-pulse" />
                  ) : (todayOrders || []).length > 0 ? (
                    <ul className="divide-y divide-gray-100">
                      {(todayOrders || []).slice(0, 8).map(order => {
                        const translatedOrderType = order.orderType ? to(`orderType.${order.orderType}`) : null;
                        const translatedStatus = to(`status.${order.status}`);
                        const detail = order.pickupPlanAt && order.returnPlanAt
                          ? `${formatFullDateByLocale(order.pickupPlanAt, locale)} – ${formatFullDateByLocale(order.returnPlanAt, locale)}`
                          : order.productNames || '';
                        return (
                          <li key={order.id}>
                            <Link
                              href={`/orders/${order.orderNumber}`}
                              className="-mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-gray-50"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <span className="whitespace-nowrap font-medium text-gray-900">#{order.orderNumber}</span>
                                  {translatedOrderType && (
                                    <span className="whitespace-nowrap rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                                      {translatedOrderType}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 truncate text-xs text-gray-500">
                                  {[order.customerName, detail].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-medium text-gray-900">{formatMoney(order.totalAmount || 0)}</p>
                                <span className={`mt-0.5 inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusBadgeColor(order.status)}`}>
                                  {translatedStatus}
                                </span>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="py-6 text-center text-sm text-gray-500">{tc('labels.noData')}</p>
                  )}
                </div>
              </section>

              <UpcomingReturnsCard state={operations} />
            </div>
          </>
        )}

        {/* Month/Year View - Strategic Focus */}
        {isRangePeriod && (
          <>
            {/* Range KPIs (#350): revenue, new orders, cancel rate, deposit refunds.
                Deposits held are a "now" number and live in the Today view. */}
            {(() => {
              const revenueChip = growthChip(currentStats.revenueGrowth, t('operations.kpi.new'));
              const ordersChip = growthChip(currentStats.ordersGrowth, t('operations.kpi.new'));
              const cancelRate = currentStats.newOrders > 0
                ? Math.round((currentStats.cancelledOrders / currentStats.newOrders) * 100)
                : 0;
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 items-stretch">
                  <StatCard
                    isMoney
                    title={t('operations.kpi.revenue')}
                    value={currentStats.totalRevenue}
                    change={revenueChip.text}
                    description=""
                    tooltip={t('tooltips.totalRevenue')}
                    color="text-blue-700"
                    trend={revenueChip.trend}
                  />
                  <StatCard
                    title={t('operations.kpi.newOrders')}
                    value={currentStats.newOrders}
                    change={ordersChip.text}
                    description=""
                    tooltip={t('tooltips.totalOrders')}
                    color="text-blue-700"
                    trend={ordersChip.trend}
                    onClick={currentStats.newOrders > 0 ? handleViewTotalOrders : undefined}
                  />
                  <StatCard
                    title={t('operations.kpi.cancelRate')}
                    value={`${cancelRate}%`}
                    change=""
                    description={t('operations.cash.orders', { count: currentStats.cancelledOrders })}
                    tooltip={t('operations.kpi.cancelRateTooltip')}
                    color={cancelRate >= 20 ? 'text-red-700' : 'text-blue-700'}
                    trend="neutral"
                  />
                  <StatCard
                    isMoney
                    title={t('operations.kpi.depositRefund')}
                    value={currentStats.depositRefund}
                    change=""
                    description=""
                    tooltip={t('operations.kpi.depositRefundTooltip')}
                    color="text-blue-700"
                    trend="neutral"
                  />
                </div>
              );
            })()}

            {/* Revenue Charts - Hidden for users without full analytics access - Simplified */}
            {hasFullAnalyticsAccess && (
              <CardClean size="md" className="mb-6">
                <CardHeaderClean>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <CardTitleClean size="md">{t('charts.performance')}</CardTitleClean>
                    {/* Outlet filter as chips inside the chart card (was a separate card) (#350) */}
                    {user?.role === 'MERCHANT' && outlets.length > 1 && (
                      <div className="flex flex-wrap gap-2" role="group" aria-label={t('charts.selectOutletsToCompare')}>
                        <button
                          type="button"
                          onClick={() => setSelectedOutlets([])}
                          aria-pressed={selectedOutlets.length === 0}
                          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            selectedOutlets.length === 0 ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {t('charts.allOutlets')}
                        </button>
                        {outlets.map((outlet) => {
                          const active = selectedOutlets.includes(outlet.id);
                          return (
                            <button
                              key={outlet.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => {
                                const next = active
                                  ? selectedOutlets.filter((id) => id !== outlet.id)
                                  : [...selectedOutlets, outlet.id];
                                setSelectedOutlets(next.length === outlets.length ? [] : next);
                              }}
                              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {outlet.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardHeaderClean>
                <CardContentClean>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {([
                      { id: 'revenue', label: t('stats.totalRevenue') },
                      { id: 'growth', label: t('charts.growthPercent') },
                      { id: 'orders', label: t('stats.totalOrders') },
                    ] as const).map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setPerformanceMode(mode.id)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                          performanceMode === mode.id
                            ? 'bg-white text-gray-900 border-gray-900'
                            : 'bg-gray-50 text-gray-600 border-transparent hover:text-gray-900'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  {/* The period total and growth are in the KPI row above; not repeated here (#350) */}
                  {performanceMode === 'orders' ? (
                    <OrderChart
                      data={currentOrderData}
                      loading={loadingCharts}
                      legendLabel={t('charts.rentalOrders')}
                      tooltipLabel={t('charts.ordersCount')}
                      timePeriod={timePeriod === 'year' ? 'year' : 'month'}
                      outlets={selectedOutlets.length > 0
                        ? outlets.filter(o => selectedOutlets.includes(o.id)).map(o => ({ id: o.id, name: o.name }))
                        : []
                      }
                    />
                  ) : (
                    <IncomeChart
                      data={currentRevenueData}
                      loading={loadingCharts}
                      actualLabel={t('charts.actualRevenue')}
                      projectedLabel={t('charts.projectedRevenue')}
                      noDataText={t('charts.noData')}
                      loadingText={tc('labels.loading')}
                      timePeriod={timePeriod === 'year' ? 'year' : 'month'}
                      outlets={
                        selectedOutlets.length > 0 && selectedOutlets.length < outlets.length
                          ? outlets.filter(o => selectedOutlets.includes(o.id)).map(o => ({ id: o.id, name: o.name }))
                          : outlets.map(o => ({ id: o.id, name: o.name }))
                      }
                    />
                  )}
                </CardContentClean>
              </CardClean>
            )}

            {/* Rankings: two-line rows with rank, like the Today lists (#350) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 items-start">
              <section className="min-w-0 rounded-lg border border-gray-200 bg-white">
                <header className="px-4 pt-4">
                  <h2 className="text-base font-semibold text-gray-900">{t('charts.topProducts')}</h2>
                </header>
                <div className="px-4 pb-2">
                  {loadingCharts ? (
                    <div className="my-4 h-24 rounded-md bg-gray-50 animate-pulse" />
                  ) : (currentTopProducts || []).length > 0 ? (
                    <ol className="divide-y divide-gray-100">
                      {(currentTopProducts || []).map((product, index) => (
                        <li key={product.id} className="flex items-center gap-3 py-2.5">
                          <span className="w-5 shrink-0 text-center text-xs font-semibold text-gray-400">{index + 1}</span>
                          {product.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image}
                              alt=""
                              className="h-8 w-8 shrink-0 rounded-md border border-gray-100 bg-gray-50 object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50">
                              <Package className="h-4 w-4 text-blue-700" aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                            {product.category && <p className="truncate text-xs text-gray-500">{product.category}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-medium text-gray-900">{formatMoney(product.totalRevenue || 0)}</p>
                            <p className="text-xs text-gray-500">{t('operations.cash.orders', { count: product.rentalCount || 0 })}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="py-6 text-center text-sm text-gray-500">{tc('labels.noData')}</p>
                  )}
                </div>
              </section>

              <section className="min-w-0 rounded-lg border border-gray-200 bg-white">
                <header className="px-4 pt-4">
                  <h2 className="text-base font-semibold text-gray-900">{t('operations.topCustomers')}</h2>
                </header>
                <div className="px-4 pb-2">
                  {loadingCharts ? (
                    <div className="my-4 h-24 rounded-md bg-gray-50 animate-pulse" />
                  ) : (currentTopCustomers || []).length > 0 ? (
                    <ol className="divide-y divide-gray-100">
                      {(currentTopCustomers || []).map((customer, index) => (
                        <li key={customer.id}>
                          <Link
                            href={`/customers/${customer.id}`}
                            className="-mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-gray-50"
                          >
                            <span className="w-5 shrink-0 text-center text-xs font-semibold text-gray-400">{index + 1}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-900">{customer.name}</p>
                              <p className="truncate text-xs text-gray-500">
                                {customer.rentalCount || 0} {t('charts.rentals')} · {customer.saleCount || 0} {t('charts.sales')}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-medium text-gray-900">{formatMoney(customer.totalSpent || 0)}</p>
                              <p className="text-xs text-gray-500">{t('operations.cash.orders', { count: customer.orderCount || 0 })}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="py-6 text-center text-sm text-gray-500">{tc('labels.noData')}</p>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {/* Add Customer Dialog */}
        <AddCustomerDialog
          open={showAddCustomerDialog}
          onOpenChange={setShowAddCustomerDialog}
          // Always pass merchantId if available (backend will validate from userScope)
          // This helps with UX (pre-fill) and backend will override if needed for security
          merchantId={user?.merchantId || user?.merchant?.id}
          onCustomerCreated={handleCustomerCreated}
          onError={(error) => {
            // Error automatically handled by useGlobalErrorHandler
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
            // Error automatically handled by useGlobalErrorHandler
          }}
          useMultipartUpload={true}
        />
      </PageContent>
    </PageWrapper>
    </div>
  );
} 