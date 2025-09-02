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
  PageContent
} from '@rentalshop/ui';
import { 
  AdminPageHeader,
  MetricCard,
  ActivityFeed,
  QuickActions,
  SystemHealth
} from '@rentalshop/ui';
import { usePathname } from 'next/navigation';
import { analyticsApi } from '@rentalshop/utils';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemMetrics();
  }, []);

  const fetchSystemMetrics = async () => {
    try {
      setLoading(true);
      
      // Use centralized analytics API
      const response = await analyticsApi.getSystemAnalytics();

      if (response.success && response.data) {
        setMetrics(response.data);
        setMerchantTrends(response.data.merchantTrends || []);
      } else {
        console.error('Failed to fetch system metrics:', response.message);
        // Fallback to mock data for now
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error);
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
  const enhancedMetrics = [
    {
      title: 'Platform Merchants',
      value: metrics.totalMerchants,
      change: { value: metrics.newMerchantsThisMonth, isPositive: true, period: 'this month' },
      icon: Building2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Platform Revenue',
      value: `$${metrics.totalRevenue.toLocaleString()}`,
      change: { value: 22, isPositive: true, period: 'vs last month' },
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'System Users',
      value: metrics.totalUsers,
      change: { value: 15, isPositive: true, period: 'vs last month' },
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Platform Orders',
      value: metrics.totalOrders.toLocaleString(),
      change: { value: 18, isPositive: true, period: 'vs last month' },
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

  // Recent activities
  const recentActivities = [
    {
      id: '1',
      timestamp: '2 minutes ago',
      user: 'admin@rentalshop.com',
      action: 'created',
      description: 'New merchant account for TechRent Solutions',
      icon: Building2,
      type: 'success' as const
    },
    {
      id: '2',
      timestamp: '5 minutes ago',
      user: 'merchant1@example.com',
      action: 'processed',
      description: 'Bulk order import - 25 new orders',
      icon: ShoppingCart,
      type: 'info' as const
    },
    {
      id: '3',
      timestamp: '10 minutes ago',
      user: 'system@rentalshop.com',
      action: 'completed',
      description: 'Automated backup process',
      icon: Database,
      type: 'success' as const
    },
    {
      id: '4',
      timestamp: '15 minutes ago',
      user: 'admin@rentalshop.com',
      action: 'updated',
      description: 'System configuration settings',
      icon: Settings,
      type: 'info' as const
    },
    {
      id: '5',
      timestamp: '20 minutes ago',
      user: 'merchant2@example.com',
      action: 'reported',
      description: 'Payment processing issue resolved',
      icon: CreditCard,
      type: 'warning' as const
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