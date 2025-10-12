'use client';

import React, { useState, useEffect } from 'react';
import { CardClean, 
  CardHeaderClean, 
  CardTitleClean, 
  CardContentClean,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent, 
  useToast,
  Button } from '@rentalshop/ui';
import { 
  AdminPageHeader,
  MetricCard,
  ActivityFeed,
  QuickActions,
  SystemHealth
} from '@rentalshop/ui';
import { usePathname } from 'next/navigation';
import { analyticsApi } from '@rentalshop/utils';
import { useAuth } from '@rentalshop/hooks';
import { 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Building2, 
  Activity, 
  Database, 
  Server, 
  TrendingUp,
  Settings,
  Store,
  Package,
  CreditCard,
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface SystemMetrics {
  totalMerchants: number;
  totalOutlets: number;
  totalUsers: number;
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  activeMerchants: number;
  newMerchantsThisMonth: number;
  newMerchantsThisYear: number;
}

interface MerchantTrend {
  month: string;
  newMerchants: number;
  activeMerchants: number;
}

export default function AdminDashboard() {
  const pathname = usePathname();
  const { toastError } = useToast();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalMerchants: 0,
    totalOutlets: 0,
    totalUsers: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeMerchants: 0,
    newMerchantsThisMonth: 0,
    newMerchantsThisYear: 0
  });
  const [merchantTrends, setMerchantTrends] = useState<MerchantTrend[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'today' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchSystemMetrics();
  }, [timePeriod]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSystemMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [timePeriod]);

  const fetchSystemMetrics = async () => {
    try {
      setLoading(true);
      
      // Create date range based on selected time period
      const today = new Date();
      let startDate: Date;
      let endDate: Date;
      let groupBy: 'day' | 'month' | 'year';

      switch (timePeriod) {
        case 'today':
          // For today, we want to include the entire current day
          // Use UTC to avoid timezone issues
          const todayUTC = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
          startDate = new Date(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate());
          endDate = new Date(todayUTC.getFullYear(), todayUTC.getMonth(), todayUTC.getDate() + 1);
          groupBy = 'day';
          break;
        case 'month':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          groupBy = 'day';
          break;
        case 'year':
          startDate = new Date(today.getFullYear(), 0, 1);
          endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
          groupBy = 'month';
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          groupBy = 'day';
      }
      
      const filters = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        groupBy: groupBy
      };

      console.log(`📊 Fetching admin dashboard data for ${timePeriod} period:`, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy: filters.groupBy
      });
      
      // Fetch both system metrics and recent activities in parallel
      const [systemResponse, activitiesResponse] = await Promise.all([
        analyticsApi.getSystemAnalytics(filters),
        analyticsApi.getRecentActivities(10, 0)
      ]);

      if (systemResponse.success && systemResponse.data) {
        setMetrics(systemResponse.data);
        setMerchantTrends(systemResponse.data.merchantTrends || []);
      } else {
        console.error('Failed to fetch system metrics:', systemResponse.message);
        toastError('Error', `Failed to fetch system metrics: ${systemResponse.message}`);
        // Fallback to mock data for now
      }

      if (activitiesResponse.success && activitiesResponse.data) {
        setRecentActivities(activitiesResponse.data || []);
      } else {
        console.error('Failed to fetch recent activities:', activitiesResponse.message);
        toastError('Error', `Failed to fetch recent activities: ${activitiesResponse.message}`);
        // Keep empty array for activities
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch system metrics';
      
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
      
      // Handle other 401 errors
      if (error instanceof Error) {
        const { analyzeError, clearAuthData } = await import('@rentalshop/utils');
        const errorInfo = analyzeError(error);
        
        if (errorInfo.type === 'auth') {
          clearAuthData();
          toastError('Session Expired', 'Please log in again');
          // Redirect to login after a short delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
          return;
        }
      }
      
      toastError('Error', errorMessage);
      // Fallback to mock data for now
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-80 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Enhanced metrics with icons and trends
  const getPeriodLabel = () => {
    switch (timePeriod) {
      case 'today': return 'today';
      case 'month': return 'this month';
      case 'year': return 'this year';
      default: return 'this month';
    }
  };

  const enhancedMetrics = [
    {
      title: 'Platform Merchants',
      value: metrics.totalMerchants,
      change: { value: metrics.newMerchantsThisMonth, isPositive: true, period: getPeriodLabel() },
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    // Platform Revenue - Hidden for OUTLET_STAFF
    ...(user?.role !== 'OUTLET_STAFF' ? [{
      title: 'Platform Revenue',
      value: `$${metrics.totalRevenue.toLocaleString()}`,
      change: { value: 22, isPositive: true, period: getPeriodLabel() },
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }] : []),
    {
      title: 'System Users',
      value: metrics.totalUsers,
      change: { value: 15, isPositive: true, period: getPeriodLabel() },
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Platform Orders',
      value: metrics.totalOrders.toLocaleString(),
      change: { value: 18, isPositive: true, period: getPeriodLabel() },
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  // System health metrics
  const healthMetrics = [
    {
      name: 'API Response Time',
      value: 45,
      max: 100,
      unit: 'ms',
      status: 'healthy' as const,
      icon: Activity
    },
    {
      name: 'Database Performance',
      value: 78,
      max: 100,
      unit: '%',
      status: 'warning' as const,
      icon: Database
    },
    {
      name: 'Server Uptime',
      value: 99,
      max: 100,
      unit: '%',
      status: 'healthy' as const,
      icon: Server
    },
    {
      name: 'Memory Usage',
      value: 65,
      max: 100,
      unit: '%',
      status: 'healthy' as const,
      icon: Activity
    }
  ];


  // Quick actions
  const quickActions = [
    {
      id: '1',
      label: 'Manage Merchants',
      description: 'View and manage merchant accounts',
      icon: Store,
      onClick: () => window.location.href = '/merchants'
    },
    {
      id: '2',
      label: 'View Analytics',
      description: 'Access detailed platform analytics',
      icon: BarChart3,
      onClick: () => window.location.href = '/analytics'
    },
    {
      id: '3',
      label: 'System Settings',
      description: 'Configure system-wide settings',
      icon: Settings,
      onClick: () => window.location.href = '/system/settings'
    },
    {
      id: '4',
      label: 'Security Center',
      description: 'Monitor security and access controls',
      icon: AlertTriangle,
      onClick: () => window.location.href = '/system/security'
    }
  ];

  return (
    <PageWrapper>
      <AdminPageHeader
        title="System Operations Dashboard"
        subtitle="Monitor platform performance and business metrics"
      />

      <PageContent>
        {/* Time Period Selector */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-2">
            <Button
              variant={timePeriod === 'today' ? 'default' : 'outline'}
              onClick={() => setTimePeriod('today')}
              className="px-4 py-2 text-sm"
            >
              Today
            </Button>
            <Button
              variant={timePeriod === 'month' ? 'default' : 'outline'}
              onClick={() => setTimePeriod('month')}
              className="px-4 py-2 text-sm"
            >
              This Month
            </Button>
            <Button
              variant={timePeriod === 'year' ? 'default' : 'outline'}
              onClick={() => setTimePeriod('year')}
              className="px-4 py-2 text-sm"
            >
              This Year
            </Button>
          </div>
          <Button
            variant="success"
            onClick={fetchSystemMetrics}
            className="px-4 py-2 text-sm"
          >
            Refresh
          </Button>
        </div>
        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {enhancedMetrics.map((metric, index) => (
            <MetricCard
              key={index}
              title={metric.title}
              value={metric.value}
              change={metric.change}
              icon={metric.icon}
              color={metric.color}
              bgColor={metric.bgColor}
            />
          ))}
        </div>

        {/* Enhanced Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <ActivityFeed
              title="Recent System Activities"
              activities={recentActivities}
              maxItems={5}
            />
          </div>

          {/* System Health */}
          <div>
            <SystemHealth
              title="System Health"
              metrics={healthMetrics}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions
          title="System Operations"
          actions={quickActions}
        />
      </PageContent>
    </PageWrapper>
  );
} 