'use client';

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
    <div className="flex flex-wrap gap-1.5">
      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => onApplyFilter({ severity: 'CRITICAL' })}>
        <XCircle className="w-3 h-3 mr-1" />
        Critical
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => onApplyFilter({ category: 'SECURITY' })}>
        <Shield className="w-3 h-3 mr-1" />
        Security
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => onApplyFilter({ action: 'DELETE' })}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        Deletions
      </Button>
      <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={() => onApplyFilter({ startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() })}>
        <Clock className="w-3 h-3 mr-1" />
        Last 24h
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-sm transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-secondary truncate">
                  {stat.title}
                </p>
                <p className="text-lg font-bold text-text-primary leading-tight">
                  {stat.value}
                </p>
                {stat.subtitle && (
                  <p className="text-[10px] text-text-tertiary">
                    {stat.subtitle}
                  </p>
                )}
              </div>
              <div className={`${stat.bgColor} ${stat.color} p-2 rounded-md flex-shrink-0`}>
                <stat.icon className="w-4 h-4" />
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
    RESTORE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    LOGIN: 'bg-purple-100 text-purple-800 border-purple-200',
    LOGOUT: 'bg-gray-100 text-gray-800 border-gray-200',
    VIEW: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  }[action] || 'bg-gray-100 text-gray-800 border-gray-200';

  return <Badge className={`text-[10px] px-1.5 py-0 ${config}`}>{action}</Badge>;
}

// Compact table row for audit log
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
    <tr
      className="border-b border-border hover:bg-bg-secondary/50 transition-colors group"
    >
      <td className="py-2 px-3 text-xs whitespace-nowrap">
        <ActionBadge action={log.action} />
      </td>
      <td className="py-2 px-3 text-xs">
        <span className="font-medium text-text-primary">{log.entityType}</span>
        <span className="text-text-secondary mx-1">·</span>
        <span className="text-text-primary truncate max-w-[140px] inline-block align-bottom" title={log.entityName || log.entityId}>
          {log.entityName || log.entityId}
        </span>
      </td>
      <td className="py-2 px-3 text-xs text-text-secondary line-clamp-1 max-w-[180px]" title={log.description}>
        {log.description || '—'}
      </td>
      <td className="py-2 px-3 text-xs text-text-tertiary">
        {log.user ? (
          <span className="truncate max-w-[100px] inline-block" title={log.user.name}>
            {log.user.name}
          </span>
        ) : '—'}
      </td>
      <td className="py-2 px-3 text-xs text-text-secondary">
        {log.merchant ? (
          <span className="truncate max-w-[120px] inline-block" title={log.merchant.name}>
            {log.merchant.name}
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="py-2 px-3 text-xs text-text-secondary">
        {log.outlet ? (
          <span className="truncate max-w-[120px] inline-block" title={log.outlet.name}>
            {log.outlet.name}
          </span>
        ) : (
          <span className="text-text-tertiary">—</span>
        )}
      </td>
      <td className="py-2 px-3 text-xs text-text-tertiary whitespace-nowrap">
        {formatDate(log.createdAt)}
      </td>
      <td className="py-2 px-3 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs opacity-70 group-hover:opacity-100"
          onClick={() => onViewDetails(log)}
        >
          <Eye className="w-3.5 h-3.5" />
        </Button>
      </td>
    </tr>
  );
}

// Filters Component - prominent, always visible, apply on change or via Apply
function EnhancedFilters({ 
  filter, 
  onFilterChange, 
  onReset 
}: { 
  filter: AuditLogFilter; 
  onFilterChange: (filter: AuditLogFilter) => void; 
  onReset: () => void;
}) {
  const [localFilter, setLocalFilter] = useState(filter);

  useEffect(() => {
    setLocalFilter(filter);
  }, [filter.limit, filter.offset, filter.action, filter.merchantId, filter.outletId]);

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
    <Card className="mb-4 border-2 border-action-primary/20 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent shadow-sm">
      <CardHeader className="py-3 px-4 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <div className="p-1.5 rounded-md bg-action-primary/10">
              <Filter className="w-4 h-4 text-action-primary" />
            </div>
            Bộ lọc Audit Logs
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onReset}>
              Reset
            </Button>
            <Button size="sm" onClick={handleApply} className="bg-action-primary hover:opacity-90">
              Áp dụng
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-4 px-4">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">Nhanh</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Action</label>
                <Select
                  value={localFilter.action || 'all'}
                  onValueChange={(value) => updateFilter('action', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="CREATE">CREATE</SelectItem>
                    <SelectItem value="UPDATE">UPDATE</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                    <SelectItem value="RESTORE">RESTORE</SelectItem>
                    <SelectItem value="LOGIN">LOGIN</SelectItem>
                    <SelectItem value="LOGOUT">LOGOUT</SelectItem>
                    <SelectItem value="VIEW">VIEW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Severity</label>
                <Select
                  value={localFilter.severity || 'all'}
                  onValueChange={(value) => updateFilter('severity', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="WARNING">WARNING</SelectItem>
                    <SelectItem value="ERROR">ERROR</SelectItem>
                    <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Category</label>
                <Select
                  value={localFilter.category || 'all'}
                  onValueChange={(value) => updateFilter('category', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="GENERAL">GENERAL</SelectItem>
                    <SelectItem value="SECURITY">SECURITY</SelectItem>
                    <SelectItem value="BUSINESS">BUSINESS</SelectItem>
                    <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                    <SelectItem value="COMPLIANCE">COMPLIANCE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Merchant ID</label>
                <Input
                  type="number"
                  placeholder="ID merchant"
                  className="h-9"
                  value={localFilter.merchantId ?? ''}
                  onChange={(e) => updateFilter('merchantId', e.target.value ? e.target.value : undefined)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Outlet ID</label>
                <Input
                  type="number"
                  placeholder="ID outlet"
                  className="h-9"
                  value={localFilter.outletId ?? ''}
                  onChange={(e) => updateFilter('outletId', e.target.value ? e.target.value : undefined)}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-border">
            <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">Chi tiết</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Entity Type</label>
                <Input
                  placeholder="User, Product, Order..."
                  className="h-9"
                  value={localFilter.entityType || ''}
                  onChange={(e) => updateFilter('entityType', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Entity ID</label>
                <Input
                  placeholder="ID thực thể"
                  className="h-9"
                  value={localFilter.entityId || ''}
                  onChange={(e) => updateFilter('entityId', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">User ID</label>
                <Input
                  type="number"
                  placeholder="ID user"
                  className="h-9"
                  value={localFilter.userId ?? ''}
                  onChange={(e) => updateFilter('userId', e.target.value ? e.target.value : undefined)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Từ ngày</label>
                <Input
                  type="datetime-local"
                  className="h-9 text-xs"
                  value={localFilter.startDate || ''}
                  onChange={(e) => updateFilter('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Đến ngày</label>
                <Input
                  type="datetime-local"
                  className="h-9 text-xs"
                  value={localFilter.endDate || ''}
                  onChange={(e) => updateFilter('endDate', e.target.value)}
                />
              </div>
            </div>
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
    limit: 50,
    offset: 0
  });
  
  const {
    pagination,
    handlePageChange,
    updatePaginationFromResponse
  } = usePagination({ initialLimit: 50, initialOffset: 0 });
  
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
    const resetFilter = { limit: pagination.limit, offset: 0 };
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
    <PageWrapper maxWidth="7xl" padding="sm" spacing="sm">
      <PageHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <PageTitle subtitle="Track system changes and security events">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-action-primary" />
              <span className="text-lg">Audit Logs</span>
            </div>
          </PageTitle>
          <div className="flex items-center gap-2">
            <Select
              value={String(pagination.limit)}
              onValueChange={(v) => {
                const limit = Number(v);
                setFilter((f) => ({ ...f, limit, offset: 0 }));
                loadAuditLogs({ ...filter, limit, offset: 0 });
              }}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => loadAuditLogs()}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </PageHeader>
      
      <PageContent>
        <StatsCards stats={stats} />

        {/* Quick Filters - compact */}
        <Card className="mb-4">
          <CardContent className="py-2 px-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-text-secondary mr-1">Quick:</span>
              <QuickFilters onApplyFilter={handleQuickFilter} />
            </div>
          </CardContent>
        </Card>

        <EnhancedFilters
          filter={filter}
          onFilterChange={handleFilterChange}
          onReset={handleFilterReset}
        />

        {/* Audit Logs Table */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center justify-between text-base">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Logs</span>
                <Badge variant="outline" className="text-xs">
                  {pagination.total} total
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-action-primary" />
                <p className="text-sm text-text-secondary">Loading...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 mx-auto mb-2 text-text-tertiary" />
                <p className="text-sm text-text-secondary">No audit logs found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-bg-secondary/50 text-xs font-medium text-text-secondary uppercase tracking-wide">
                      <th className="py-2 px-3 w-[90px]">Action</th>
                      <th className="py-2 px-3 min-w-[140px]">Entity</th>
                      <th className="py-2 px-3 min-w-[120px]">Description</th>
                      <th className="py-2 px-3 w-[90px]">User</th>
                      <th className="py-2 px-3 w-[100px]">Merchant</th>
                      <th className="py-2 px-3 w-[100px]">Outlet</th>
                      <th className="py-2 px-3 w-[110px]">Time</th>
                      <th className="py-2 px-3 w-[44px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <AuditLogRow
                        key={log.id}
                        log={log}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {pagination.totalPages > 1 && (
          <div className="mt-4">
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