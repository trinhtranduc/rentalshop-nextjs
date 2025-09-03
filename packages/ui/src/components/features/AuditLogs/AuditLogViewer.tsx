import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  useToasts
} from '@rentalshop/ui';
import { AuditLogDetail } from './AuditLogDetail';
import { 
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  User,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Clock,
  MapPin,
  Monitor
} from 'lucide-react';

// Types
interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  merchant?: {
    id: number;
    name: string;
  };
  outlet?: {
    id: number;
    name: string;
  };
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
  description?: string;
  createdAt: string;
}

interface AuditLogFilter {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  merchantId?: string;
  outletId?: string;
  severity?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

interface AuditLogStats {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByEntity: Record<string, number>;
  logsBySeverity: Record<string, number>;
  logsByCategory: Record<string, number>;
  recentActivity: number;
}

// This component now expects data to be passed as props
// API calls should be made in the parent component using @rentalshop/utils

// Severity badge component
function SeverityBadge({ severity }: { severity: string }) {
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'WARNING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <XCircle className="w-3 h-3" />;
      case 'ERROR':
        return <XCircle className="w-3 h-3" />;
      case 'WARNING':
        return <AlertTriangle className="w-3 h-3" />;
      case 'INFO':
        return <Info className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  return (
    <Badge className={`inline-flex items-center gap-1 ${getSeverityStyle(severity)}`}>
      {getSeverityIcon(severity)}
      {severity}
    </Badge>
  );
}

// Action badge component
function ActionBadge({ action }: { action: string }) {
  const getActionStyle = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'LOGIN':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800';
      case 'LOGOUT':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
      case 'VIEW':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800';
    }
  };

  return (
    <Badge className={getActionStyle(action)}>
      {action}
    </Badge>
  );
}

// Audit log row component
interface AuditLogRowProps {
  log: AuditLog;
  onViewDetails: (log: AuditLog) => void;
}

function AuditLogRow({ log, onViewDetails }: AuditLogRowProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="mb-2 hover:shadow-sm transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <ActionBadge action={log.action} />
            <SeverityBadge severity={log.severity} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-text-primary truncate">
                  {log.entityType}: {log.entityName || log.entityId}
                </span>
                {log.user && (
                  <span className="text-text-tertiary text-xs">
                    by {log.user.name}
                  </span>
                )}
              </div>
              
              {log.description && (
                <p className="text-text-secondary text-xs truncate mt-1">
                  {log.description}
                </p>
              )}
            </div>
            
            <div className="text-xs text-text-tertiary whitespace-nowrap">
              {formatDate(log.createdAt)}
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(log)}
            className="ml-3 flex-shrink-0"
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Filter component
interface AuditLogFilterProps {
  filter: AuditLogFilter;
  onFilterChange: (filter: AuditLogFilter) => void;
  onReset: () => void;
}

function AuditLogFilter({ filter, onFilterChange, onReset }: AuditLogFilterProps) {
  const handleInputChange = (field: keyof AuditLogFilter, value: string) => {
    onFilterChange({
      ...filter,
      [field]: value === 'all' || value === '' ? undefined : value
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filter Audit Logs
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Action</label>
            <Select
              value={filter.action || 'all'}
              onValueChange={(value) => handleInputChange('action', value)}
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
            <label className="text-sm font-medium">Entity Type</label>
            <Select
              value={filter.entityType || 'all'}
              onValueChange={(value) => handleInputChange('entityType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entities</SelectItem>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Product">Product</SelectItem>
                <SelectItem value="Order">Order</SelectItem>
                <SelectItem value="Customer">Customer</SelectItem>
                <SelectItem value="Setting">Setting</SelectItem>
                <SelectItem value="Merchant">Merchant</SelectItem>
                <SelectItem value="Outlet">Outlet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Severity</label>
            <Select
              value={filter.severity || 'all'}
              onValueChange={(value) => handleInputChange('severity', value)}
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
              value={filter.category || 'all'}
              onValueChange={(value) => handleInputChange('category', value)}
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

          <div className="space-y-2">
            <label className="text-sm font-medium">Start Date</label>
            <Input
              type="datetime-local"
              value={filter.startDate || ''}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">End Date</label>
            <Input
              type="datetime-local"
              value={filter.endDate || ''}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Entity ID</label>
            <Input
              placeholder="Enter entity ID"
              value={filter.entityId || ''}
              onChange={(e) => handleInputChange('entityId', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">User ID</label>
            <Input
              placeholder="Enter user ID"
              value={filter.userId || ''}
              onChange={(e) => handleInputChange('userId', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <Button variant="outline" onClick={onReset}>
            Reset Filters
          </Button>
          <div className="text-sm text-text-secondary">
            Showing {filter?.limit || 50} results per page
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main audit log viewer component
interface AuditLogViewerProps {
  className?: string;
  logs?: AuditLog[];
  stats?: AuditLogStats | null;
  loading?: boolean;
  filter?: AuditLogFilter;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  onFilterChange?: (filter: AuditLogFilter) => void;
  onFilterReset?: () => void;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  onViewDetails?: (log: AuditLog) => void;
}

export function AuditLogViewer({ 
  className = '',
  logs = [],
  stats = null,
  loading = false,
  filter = { limit: 50, offset: 0 },
  pagination = { total: 0, limit: 50, offset: 0, hasMore: false },
  onFilterChange = () => {},
  onFilterReset = () => {},
  onLoadMore = () => {},
  onRefresh = () => {},
  onViewDetails = () => {}
}: AuditLogViewerProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'stats'>('logs');

  // Handle view details
  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
    onViewDetails(log);
  };

  const handleCloseDetail = () => {
    setSelectedLog(null);
    setIsDetailOpen(false);
  };

  return (
    <div className={className}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Audit Logs</h1>
        <p className="text-text-secondary">
          Track all system changes, user actions, and security events.
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex space-x-2 border-b">
          <Button
            variant={activeTab === 'logs' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('logs')}
          >
            Audit Logs
          </Button>
          <Button
            variant={activeTab === 'stats' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </Button>
        </div>

        {activeTab === 'logs' && (
          <div className="space-y-6">
          <AuditLogFilter
            filter={filter}
            onFilterChange={onFilterChange}
            onReset={onFilterReset}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Audit Logs ({pagination?.total || 0} total)</span>
                <div className="flex items-center gap-2">
                                      <Button
                      variant="outline"
                      size="sm"
                      onClick={onRefresh}
                      disabled={loading}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <p className="text-text-secondary">Loading audit logs...</p>
                </div>
                              ) : !logs || logs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary">No audit logs found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map(log => (
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
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
          {stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">Total Logs</p>
                      <p className="text-2xl font-bold text-text-primary">{stats.totalLogs}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">Recent Activity</p>
                      <p className="text-2xl font-bold text-text-primary">{stats.recentActivity}</p>
                      <p className="text-xs text-text-tertiary">Last 24 hours</p>
                    </div>
                    <Clock className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">Security Events</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {stats.logsByCategory.SECURITY || 0}
                      </p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">Business Events</p>
                      <p className="text-2xl font-bold text-text-primary">
                        {stats.logsByCategory.BUSINESS || 0}
                      </p>
                    </div>
                    <Activity className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-secondary">No statistics available.</p>
            </div>
          )}
          </div>
        )}
      </div>

      {/* Audit Log Detail Modal */}
      {selectedLog && (
        <AuditLogDetail
          log={selectedLog}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
}

// Simple wrapper component for backward compatibility
export function AuditLogViewerSimple({ className = '' }: { className?: string }) {
  return (
    <AuditLogViewer 
      className={className}
      logs={[]}
      stats={null}
      loading={false}
      filter={{ limit: 50, offset: 0 }}
      pagination={{ total: 0, limit: 50, offset: 0, hasMore: false }}
      onFilterChange={() => {}}
      onFilterReset={() => {}}
      onLoadMore={() => {}}
      onRefresh={() => {}}
      onViewDetails={() => {}}
    />
  );
}