'use client';

import React, { useState, useEffect } from 'react';
import { 
  PageWrapper,
  PageContent,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ToastContainer,
  useToasts
} from '@rentalshop/ui';
import { 
  AdminPageHeader,
  SearchAndFilters,
  DataTable,
  AdminStatusBadge,
  ActionButton,
  EmptyState,
  MetricCard,
  ActivityFeed,
  QuickActions,
  SystemHealth
} from '@rentalshop/ui';
import { 
  BarChart3, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Settings, 
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Database,
  Server,
  Globe,
  Shield,
  Calendar,
  User,
  Zap,
  Bell,
  Info,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Cpu,
  HardDrive,
  Wifi,
  Monitor,
  Play,
  Pause
} from 'lucide-react';

interface PerformanceMetric {
  id: string;
  name: string;
  category: 'CPU' | 'MEMORY' | 'DISK' | 'NETWORK' | 'DATABASE' | 'API';
  value: number;
  unit: string;
  threshold: {
    warning: number;
    critical: number;
  };
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  trend: 'UP' | 'DOWN' | 'STABLE';
  change: number;
  timestamp: string;
  description: string;
}

interface PerformanceAlert {
  id: string;
  metric: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export default function PerformancePage() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState('1h');
  const { addToast } = useToasts();

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchPerformanceData();
      }, 10000); // Refresh every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock performance metrics data
      const mockMetrics: PerformanceMetric[] = [
        {
          id: '1',
          name: 'CPU Usage',
          category: 'CPU',
          value: 75,
          unit: '%',
          threshold: { warning: 80, critical: 95 },
          status: 'WARNING',
          trend: 'UP',
          change: 5,
          timestamp: new Date().toISOString(),
          description: 'Current CPU utilization across all cores'
        },
        {
          id: '2',
          name: 'Memory Usage',
          category: 'MEMORY',
          value: 68,
          unit: '%',
          threshold: { warning: 85, critical: 95 },
          status: 'HEALTHY',
          trend: 'STABLE',
          change: 0,
          timestamp: new Date().toISOString(),
          description: 'RAM utilization percentage'
        },
        {
          id: '3',
          name: 'Disk Usage',
          category: 'DISK',
          value: 45,
          unit: '%',
          threshold: { warning: 80, critical: 90 },
          status: 'HEALTHY',
          trend: 'UP',
          change: 2,
          timestamp: new Date().toISOString(),
          description: 'Storage disk utilization'
        },
        {
          id: '4',
          name: 'Network Latency',
          category: 'NETWORK',
          value: 120,
          unit: 'ms',
          threshold: { warning: 200, critical: 500 },
          status: 'HEALTHY',
          trend: 'DOWN',
          change: -15,
          timestamp: new Date().toISOString(),
          description: 'Average network response time'
        },
        {
          id: '5',
          name: 'Database Connections',
          category: 'DATABASE',
          value: 85,
          unit: '%',
          threshold: { warning: 90, critical: 95 },
          status: 'WARNING',
          trend: 'UP',
          change: 8,
          timestamp: new Date().toISOString(),
          description: 'Active database connections percentage'
        },
        {
          id: '6',
          name: 'API Response Time',
          category: 'API',
          value: 250,
          unit: 'ms',
          threshold: { warning: 500, critical: 1000 },
          status: 'HEALTHY',
          trend: 'STABLE',
          change: 0,
          timestamp: new Date().toISOString(),
          description: 'Average API endpoint response time'
        },
        {
          id: '7',
          name: 'Database Query Time',
          category: 'DATABASE',
          value: 45,
          unit: 'ms',
          threshold: { warning: 100, critical: 500 },
          status: 'HEALTHY',
          trend: 'DOWN',
          change: -5,
          timestamp: new Date().toISOString(),
          description: 'Average database query execution time'
        },
        {
          id: '8',
          name: 'Error Rate',
          category: 'API',
          value: 2.5,
          unit: '%',
          threshold: { warning: 5, critical: 10 },
          status: 'HEALTHY',
          trend: 'DOWN',
          change: -0.5,
          timestamp: new Date().toISOString(),
          description: 'Percentage of failed API requests'
        }
      ];

      // Mock performance alerts data
      const mockAlerts: PerformanceAlert[] = [
        {
          id: '1',
          metric: 'CPU Usage',
          severity: 'MEDIUM',
          message: 'CPU usage exceeded 80% threshold',
          timestamp: '2024-01-15 16:30:00',
          resolved: false
        },
        {
          id: '2',
          metric: 'Database Connections',
          severity: 'HIGH',
          message: 'Database connection pool near capacity',
          timestamp: '2024-01-15 16:25:00',
          resolved: false
        },
        {
          id: '3',
          metric: 'Memory Usage',
          severity: 'LOW',
          message: 'Memory usage approaching warning threshold',
          timestamp: '2024-01-15 16:20:00',
          resolved: true,
          resolvedAt: '2024-01-15 16:35:00',
          resolvedBy: 'admin@rentalshop.com'
        },
        {
          id: '4',
          metric: 'API Response Time',
          severity: 'CRITICAL',
          message: 'API response time exceeded 1 second',
          timestamp: '2024-01-15 16:15:00',
          resolved: true,
          resolvedAt: '2024-01-15 16:40:00',
          resolvedBy: 'admin@rentalshop.com'
        }
      ];
      
      setMetrics(mockMetrics);
      setAlerts(mockAlerts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching performance data:', error);
      addToast('error', 'Error', 'Failed to fetch performance data');
      setLoading(false);
    }
  };

  const handleExportMetrics = async () => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      addToast('success', 'Export Started', 'Performance metrics export has been initiated');
    } catch (error) {
      console.error('Error exporting metrics:', error);
      addToast('error', 'Error', 'Failed to export performance metrics');
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { 
          ...alert, 
          resolved: true, 
          resolvedAt: new Date().toISOString(),
          resolvedBy: 'admin@rentalshop.com'
        } : alert
      ));
      addToast('success', 'Alert Resolved', 'Performance alert has been resolved');
    } catch (error) {
      console.error('Error resolving alert:', error);
      addToast('error', 'Error', 'Failed to resolve alert');
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'CPU': return Cpu;
      case 'MEMORY': return Monitor;
      case 'DISK': return HardDrive;
      case 'NETWORK': return Wifi;
      case 'DATABASE': return Database;
      case 'API': return Globe;
      default: return Activity;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600';
      case 'WARNING': return 'text-yellow-600';
      case 'CRITICAL': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'UP': return TrendingUp;
      case 'DOWN': return TrendingDown;
      case 'STABLE': return Activity;
      default: return Activity;
    }
  };

  const filteredMetrics = metrics.filter(metric => {
    const matchesSearch = metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         metric.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || metric.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || metric.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const columns = [
    {
      key: 'name',
      label: 'Metric Name',
      render: (value: string, row: PerformanceMetric) => {
        const Icon = getCategoryIcon(row.category);
        return (
          <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-text-tertiary" />
            <div>
              <span className="text-sm font-medium text-text-primary">{value}</span>
              <p className="text-xs text-text-tertiary">{row.description}</p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'category',
      label: 'Category',
      render: (value: string) => (
        <AdminStatusBadge status={value} type="audit" />
      )
    },
    {
      key: 'value',
      label: 'Current Value',
      render: (value: number, row: PerformanceMetric) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {value}{row.unit}
          </span>
          <div className="flex items-center gap-1">
            {React.createElement(getTrendIcon(row.trend), { 
              className: `w-3 h-3 ${row.change > 0 ? 'text-red-500' : row.change < 0 ? 'text-green-500' : 'text-gray-500'}` 
            })}
            <span className={`text-xs ${row.change > 0 ? 'text-red-500' : row.change < 0 ? 'text-green-500' : 'text-gray-500'}`}>
              {row.change > 0 ? '+' : ''}{row.change}{row.unit}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <AdminStatusBadge status={value} type="audit" />
      )
    },
    {
      key: 'threshold',
      label: 'Thresholds',
      render: (value: PerformanceMetric['threshold'], row: PerformanceMetric) => (
        <div className="text-xs text-text-secondary">
          <div>Warn: {value.warning}{row.unit}</div>
          <div>Critical: {value.critical}{row.unit}</div>
        </div>
      )
    },
    {
      key: 'timestamp',
      label: 'Last Updated',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm">{new Date(value).toLocaleTimeString()}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: PerformanceMetric) => (
        <div className="flex gap-1">
          <ActionButton
            icon={BarChart3}
            label="View Details"
            onClick={() => {
              setSelectedMetric(row);
              setShowDetails(true);
            }}
            variant="outline"
            size="sm"
          />
        </div>
      )
    }
  ];

  const filters = [
    {
      label: 'Category',
      value: categoryFilter,
      options: [
        { value: 'all', label: 'All Categories' },
        { value: 'CPU', label: 'CPU' },
        { value: 'MEMORY', label: 'Memory' },
        { value: 'DISK', label: 'Disk' },
        { value: 'NETWORK', label: 'Network' },
        { value: 'DATABASE', label: 'Database' },
        { value: 'API', label: 'API' }
      ],
      onChange: setCategoryFilter
    },
    {
      label: 'Status',
      value: statusFilter,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'HEALTHY', label: 'Healthy' },
        { value: 'WARNING', label: 'Warning' },
        { value: 'CRITICAL', label: 'Critical' }
      ],
      onChange: setStatusFilter
    }
  ];

  // Performance metrics summary
  const performanceMetrics = [
    {
      title: 'System Health',
      value: `${Math.round((metrics.filter(m => m.status === 'HEALTHY').length / metrics.length) * 100)}%`,
      change: { value: 5, isPositive: true, period: 'vs last hour' },
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Active Alerts',
      value: alerts.filter(a => !a.resolved).length,
      change: { value: -2, isPositive: true, period: 'vs last hour' },
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Avg Response Time',
      value: `${Math.round(metrics.filter(m => m.category === 'API').reduce((sum, m) => sum + m.value, 0) / metrics.filter(m => m.category === 'API').length)}ms`,
      change: { value: -15, isPositive: true, period: 'vs last hour' },
      icon: Zap,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Error Rate',
      value: `${metrics.find(m => m.name === 'Error Rate')?.value || 0}%`,
      change: { value: -0.5, isPositive: true, period: 'vs last hour' },
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  // Recent activities
  const recentActivities = [
    {
      id: '1',
      timestamp: '5 minutes ago',
      user: 'system@rentalshop.com',
      action: 'alerted',
      description: 'CPU usage exceeded 80% threshold',
      icon: AlertTriangle,
      type: 'warning' as const
    },
    {
      id: '2',
      timestamp: '10 minutes ago',
      user: 'admin@rentalshop.com',
      action: 'resolved',
      description: 'API response time alert resolved',
      icon: CheckCircle,
      type: 'success' as const
    },
    {
      id: '3',
      timestamp: '15 minutes ago',
      user: 'system@rentalshop.com',
      action: 'alerted',
      description: 'Database connection pool near capacity',
      icon: AlertCircle,
      type: 'error' as const
    },
    {
      id: '4',
      timestamp: '20 minutes ago',
      user: 'admin@rentalshop.com',
      action: 'exported',
      description: 'Performance metrics exported',
      icon: Download,
      type: 'info' as const
    }
  ];

  // Quick actions
  const quickActions = [
    {
      id: '1',
      label: 'Export Metrics',
      description: 'Export performance data',
      icon: Download,
      onClick: handleExportMetrics
    },
    {
      id: '2',
      label: 'Refresh Data',
      description: 'Refresh performance metrics',
      icon: RefreshCw,
      onClick: fetchPerformanceData
    },
    {
      id: '3',
      label: 'Performance Settings',
      description: 'Configure monitoring settings',
      icon: Settings,
      onClick: () => addToast('info', 'Settings', 'Opening performance settings...')
    },
    {
      id: '4',
      label: 'Auto Refresh',
      description: autoRefresh ? 'Disable auto refresh' : 'Enable auto refresh',
      icon: autoRefresh ? Pause : Play,
      onClick: () => setAutoRefresh(!autoRefresh)
    }
  ];

  // System health metrics for the SystemHealth component
  const systemHealthMetrics = [
    {
      name: 'CPU Usage',
      label: 'CPU Usage',
      value: metrics.find(m => m.name === 'CPU Usage')?.value || 0,
      max: 100,
      unit: '%',
      status: metrics.find(m => m.name === 'CPU Usage')?.status.toLowerCase() as 'healthy' | 'warning' | 'critical',
      description: 'Current CPU utilization',
      icon: Cpu
    },
    {
      name: 'Memory Usage',
      label: 'Memory Usage',
      value: metrics.find(m => m.name === 'Memory Usage')?.value || 0,
      max: 100,
      unit: '%',
      status: metrics.find(m => m.name === 'Memory Usage')?.status.toLowerCase() as 'healthy' | 'warning' | 'critical',
      description: 'RAM utilization percentage',
      icon: Monitor
    },
    {
      name: 'Disk Usage',
      label: 'Disk Usage',
      value: metrics.find(m => m.name === 'Disk Usage')?.value || 0,
      max: 100,
      unit: '%',
      status: metrics.find(m => m.name === 'Disk Usage')?.status.toLowerCase() as 'healthy' | 'warning' | 'critical',
      description: 'Storage disk utilization',
      icon: HardDrive
    },
    {
      name: 'Database Connections',
      label: 'Database Connections',
      value: metrics.find(m => m.name === 'Database Connections')?.value || 0,
      max: 100,
      unit: '%',
      status: metrics.find(m => m.name === 'Database Connections')?.status.toLowerCase() as 'healthy' | 'warning' | 'critical',
      description: 'Active database connections',
      icon: Database
    }
  ];

  return (
    <PageWrapper>
      <AdminPageHeader
        title="Performance Monitoring"
        subtitle="Monitor system performance, metrics, and alerts"
        actionLabel="Export Metrics"
        actionIcon={Download}
        onAction={handleExportMetrics}
      />

      <PageContent>
        {/* Performance Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {performanceMetrics.map((metric, index) => (
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* System Health */}
          <div className="lg:col-span-2">
            <SystemHealth
              title="System Health Overview"
              metrics={systemHealthMetrics}
            />
          </div>

          {/* Quick Actions */}
          <div>
            <QuickActions
              title="Quick Actions"
              actions={quickActions}
            />
          </div>
        </div>

        {/* Recent Activities */}
        <div className="mb-8">
          <ActivityFeed
            title="Recent Performance Activities"
            activities={recentActivities}
            maxItems={5}
          />
        </div>

        {/* Search and Filters */}
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search performance metrics..."
          filters={filters}
          className="mb-6"
        />

        {/* Performance Metrics Table */}
        {filteredMetrics.length > 0 ? (
          <DataTable
            data={filteredMetrics}
            columns={columns}
            loading={loading}
            onRowClick={setSelectedMetric}
          />
        ) : (
          <EmptyState
            icon={BarChart3}
            title="No Performance Metrics Found"
            description="No performance metrics match your current search criteria. Try adjusting your filters or check if monitoring is enabled."
            actionLabel="Refresh Metrics"
            onAction={fetchPerformanceData}
          />
        )}
      </PageContent>

      {/* Metric Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Performance Metric Details</DialogTitle>
          </DialogHeader>
          
          {selectedMetric && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Metric Name</label>
                  <p className="text-sm text-text-primary">{selectedMetric.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Category</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedMetric.category} type="audit" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Description</label>
                <p className="text-sm text-text-primary mt-1">{selectedMetric.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Current Value</label>
                  <p className="text-sm text-text-primary font-medium">
                    {selectedMetric.value}{selectedMetric.unit}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Status</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedMetric.status} type="audit" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Warning Threshold</label>
                  <p className="text-sm text-text-primary">{selectedMetric.threshold.warning}{selectedMetric.unit}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Critical Threshold</label>
                  <p className="text-sm text-text-primary">{selectedMetric.threshold.critical}{selectedMetric.unit}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Trend</label>
                  <div className="flex items-center gap-2 mt-1">
                    {React.createElement(getTrendIcon(selectedMetric.trend), { 
                      className: `w-4 h-4 ${selectedMetric.change > 0 ? 'text-red-500' : selectedMetric.change < 0 ? 'text-green-500' : 'text-gray-500'}` 
                    })}
                    <span className="text-sm text-text-primary">{selectedMetric.trend}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Change</label>
                  <p className={`text-sm font-medium ${selectedMetric.change > 0 ? 'text-red-500' : selectedMetric.change < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                    {selectedMetric.change > 0 ? '+' : ''}{selectedMetric.change}{selectedMetric.unit}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Last Updated</label>
                <p className="text-sm text-text-primary">{new Date(selectedMetric.timestamp).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
