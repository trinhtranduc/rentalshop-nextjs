'use client';

// Disable prerendering to avoid module resolution issues
export const dynamic = 'force-dynamic';

// Disable prerendering to avoid module resolution issues

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Pagination,
  useToast,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@rentalshop/ui';
import { 
  getAuditLogs, 
  getAuditLogStats,
  type AuditLog, 
  type AuditLogFilter, 
  type AuditLogStats 
} from '@rentalshop/utils';
import { usePagination } from '@rentalshop/hooks';
import { PAGINATION } from '@rentalshop/constants';
import { 
  Activity,
  AlertTriangle,
  Shield,
  Database,
  FileText,
  Clock,
  RefreshCw,
  Filter,
  Eye,
  XCircle,
  Info,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { AuditLogDetail } from '@rentalshop/ui';

// Quick filter buttons for common scenarios
const QuickFilters = ({ onApplyFilter }: { onApplyFilter: (filter: Partial<AuditLogFilter>) => void }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApplyFilter({ severity: 'CRITICAL' })}
        className="flex items-center gap-1"
      >
        <XCircle className="w-3 h-3" />
        Critical Only
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApplyFilter({ category: 'SECURITY' })}
        className="flex items-center gap-1"
      >
        <Shield className="w-3 h-3" />
        Security Events
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApplyFilter({ action: 'DELETE' })}
        className="flex items-center gap-1"
      >
        <AlertTriangle className="w-3 h-3" />
        Deletions
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApplyFilter({ 
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        })}
        className="flex items-center gap-1"
      >
        <Clock className="w-3 h-3" />
        Last 24 Hours
      </Button>
    </div>
  );
};

// Stats Cards Component
const StatsCards = ({ stats }: { stats: AuditLogStats | null }) => {
  if (!stats) return null;

  const statCards = [
    {
      title: 'Total Logs',
      value: stats.totalLogs.toLocaleString(),
      icon: FileText,
      color: 'text-blue-700',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Recent Activity',
      value: stats.recentActivity.toLocaleString(),
      subtitle: 'Last 24 hours',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Security Events',
      value: (stats.logsByCategory.SECURITY || 0).toLocaleString(),
      icon: Shield,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20'
    },
    {
      title: 'Critical Issues',
      value: (stats.logsBySeverity.CRITICAL || 0).toLocaleString(),
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-text-secondary mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-xs text-text-tertiary mt-1">
                    {stat.subtitle}
                  </p>
                )}
              </div>
              <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Severity badge component
function SeverityBadge({ severity }: { severity: string }) {
  const config = {
    CRITICAL: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    ERROR: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    WARNING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
    INFO: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Info },
  }[severity] || { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Info };

  const Icon = config.icon;

  return (
    <Badge className={`inline-flex items-center gap-1 ${config.color}`}>
      <Icon className="w-3 h-3" />
      {severity}
    </Badge>
  );
}

// Action badge component
function ActionBadge({ action }: { action: string }) {
  const config = {
    CREATE: 'bg-green-100 text-green-800 border-green-200',
    UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
    DELETE: 'bg-red-100 text-red-800 border-red-200',
    LOGIN: 'bg-purple-100 text-purple-800 border-purple-200',
    LOGOUT: 'bg-gray-100 text-gray-800 border-gray-200',
    VIEW: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  }[action] || 'bg-gray-100 text-gray-800 border-gray-200';

  return <Badge className={config}>{action}</Badge>;
}

// Enhanced Log Row
function AuditLogRow({ log, onViewDetails }: { log: AuditLog; onViewDetails: (log: AuditLog) => void }) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="mb-3 hover:shadow-md transition-all hover:border-action-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <ActionBadge action={log.action} />
              <SeverityBadge severity={log.severity} />
              <Badge variant="outline" className="text-xs">
                {log.category}
              </Badge>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary">
                  {log.entityType}
                </span>
                <span className="text-text-secondary">→</span>
                <span className="text-text-primary truncate">
                  {log.entityName || log.entityId}
                </span>
              </div>
              
              {log.description && (
                <p className="text-sm text-text-secondary line-clamp-2">
                  {log.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-text-tertiary mt-2">
                {log.user && (
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{log.user.name}</span>
                    <Badge variant="outline" className="text-xs ml-1">
                      {log.user.role}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(log.createdAt)}</span>
                </div>
                
                {log.ipAddress && (
                  <div className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    <span>{log.ipAddress}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(log)}
            className="flex-shrink-0"
          >
            <Eye className="w-4 h-4 mr-2" />
            Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Filters Component
function EnhancedFilters({ 
  filter, 
  onFilterChange, 
  onReset 
}: { 
  filter: AuditLogFilter; 
  onFilterChange: (filter: AuditLogFilter) => void; 
  onReset: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilter, setLocalFilter] = useState(filter);

  const handleApply = () => {
    onFilterChange(localFilter);
  };

  const updateFilter = (key: keyof AuditLogFilter, value: any) => {
    setLocalFilter(prev => ({
      ...prev,
      [key]: value === 'all' || value === '' ? undefined : value
    }));
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Always visible filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={localFilter.action || 'all'}
                onValueChange={(value) => updateFilter('action', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="LOGIN">LOGIN</SelectItem>
                  <SelectItem value="LOGOUT">LOGOUT</SelectItem>
                  <SelectItem value="VIEW">VIEW</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select
                value={localFilter.severity || 'all'}
                onValueChange={(value) => updateFilter('severity', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="INFO">INFO</SelectItem>
                  <SelectItem value="WARNING">WARNING</SelectItem>
                  <SelectItem value="ERROR">ERROR</SelectItem>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={localFilter.category || 'all'}
                onValueChange={(value) => updateFilter('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="GENERAL">GENERAL</SelectItem>
                  <SelectItem value="SECURITY">SECURITY</SelectItem>
                  <SelectItem value="BUSINESS">BUSINESS</SelectItem>
                  <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                  <SelectItem value="COMPLIANCE">COMPLIANCE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expandable filters */}
          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Type</label>
                <Input
                  placeholder="e.g., User, Product"
                  value={localFilter.entityType || ''}
                  onChange={(e) => updateFilter('entityType', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Entity ID</label>
                <Input
                  placeholder="Enter entity ID"
                  value={localFilter.entityId || ''}
                  onChange={(e) => updateFilter('entityId', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">User ID</label>
                <Input
                  placeholder="Enter user ID"
                  value={localFilter.userId || ''}
                  onChange={(e) => updateFilter('userId', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="datetime-local"
                  value={localFilter.startDate || ''}
                  onChange={(e) => updateFilter('startDate', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="datetime-local"
                  value={localFilter.endDate || ''}
                  onChange={(e) => updateFilter('endDate', e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onReset}>
              Reset All
            </Button>
            <Button onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SystemAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filter, setFilter] = useState<AuditLogFilter>({
    limit: 20,
    offset: 0
  });
  
  const {
    pagination,
    handlePageChange,
    updatePaginationFromResponse
  } = usePagination({ initialLimit: 20, initialOffset: 0 });
  
  const { toastError } = useToast();

  // Load audit logs
  const loadAuditLogs = async (newFilter?: AuditLogFilter) => {
    setLoading(true);
    try {
      const currentFilter = newFilter || filter;
      const result = await getAuditLogs(currentFilter);
      
      if (result.success && result.data) {
        setLogs(result.data);
        const resultWithPagination = result as any;
        if (resultWithPagination.pagination) {
          updatePaginationFromResponse(resultWithPagination.pagination);
        }
      } else {
        toastError('Failed to load audit logs', result.message || 'Please try again later.');
      }
    } catch (error: any) {
      toastError('Failed to load audit logs', error.message || 'Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const result = await getAuditLogStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error: any) {
      console.error('Failed to load audit statistics:', error);
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilter: AuditLogFilter) => {
    setFilter({ ...newFilter, limit: filter.limit, offset: 0 });
    loadAuditLogs({ ...newFilter, limit: filter.limit, offset: 0 });
  };

  // Handle quick filter
  const handleQuickFilter = (quickFilter: Partial<AuditLogFilter>) => {
    const newFilter = { ...filter, ...quickFilter, offset: 0 };
    setFilter(newFilter);
    loadAuditLogs(newFilter);
  };

  // Handle filter reset
  const handleFilterReset = () => {
    const resetFilter = { limit: 20, offset: 0 };
    setFilter(resetFilter);
    loadAuditLogs(resetFilter);
  };

  // Handle pagination
  const handlePageChangeClick = (page: number) => {
    handlePageChange(page);
    const newFilter = {
      ...filter,
      offset: (page - 1) * pagination.limit
    };
    setFilter(newFilter);
    loadAuditLogs(newFilter);
  };

  // Handle view details
  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  // Load data on mount
  useEffect(() => {
    loadAuditLogs();
    loadStats();
  }, []);

  return (
    <PageWrapper maxWidth="7xl" padding="md" spacing="md">
      <PageHeader>
        <div className="flex items-center justify-between">
          <PageTitle subtitle="Track all system changes, user actions, and security events across the platform">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-action-primary" />
              System Audit Logs
            </div>
          </PageTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadAuditLogs()}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </PageHeader>
      
      <PageContent>
        {/* Stats Cards */}
        <StatsCards stats={stats} />

        {/* Quick Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-sm font-medium mb-2">Quick Filters</h3>
                <QuickFilters onApplyFilter={handleQuickFilter} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Filters */}
        <EnhancedFilters
          filter={filter}
          onFilterChange={handleFilterChange}
          onReset={handleFilterReset}
        />

        {/* Audit Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                <span>Audit Logs</span>
                <Badge variant="outline" className="ml-2">
                  {pagination.total} total
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-action-primary" />
                <p className="text-text-secondary">Loading audit logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
                <p className="text-text-secondary text-lg mb-2">No audit logs found</p>
                <p className="text-text-tertiary text-sm">
                  Try adjusting your filters or check back later
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {logs.map((log) => (
                  <AuditLogRow
                    key={log.id}
                    log={log}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={handlePageChangeClick}
              itemName="audit logs"
            />
          </div>
        )}

        {/* Audit Log Detail Modal */}
        {selectedLog && (
          <AuditLogDetail
            log={selectedLog}
            isOpen={isDetailOpen}
            onClose={() => setIsDetailOpen(false)}
          />
        )}
      </PageContent>
    </PageWrapper>
  );
}