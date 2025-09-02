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
  QuickActions
} from '@rentalshop/ui';
import { 
  Key, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  EyeOff,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Globe,
  Shield,
  Settings,
  FileText,
  Calendar,
  User,
  Database,
  Zap,
  BarChart3,
  RefreshCw,
  Download,
  Upload
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  type: 'READ' | 'WRITE' | 'ADMIN' | 'WEBHOOK';
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'REVOKED';
  permissions: string[];
  lastUsed?: string;
  createdAt: string;
  expiresAt?: string;
  createdBy: string;
  description: string;
  usage: {
    requests: number;
    limit: number;
    resetDate: string;
  };
}

interface ApiEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  status: 'ACTIVE' | 'DEPRECATED' | 'MAINTENANCE';
  version: string;
  description: string;
  rateLimit: {
    requests: number;
    window: string;
  };
  lastModified: string;
  modifiedBy: string;
}

export default function ApiManagementPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [showKey, setShowKey] = useState<{ [key: string]: boolean }>({});
  const { addToast } = useToasts();

  useEffect(() => {
    fetchApiData();
  }, []);

  const fetchApiData = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock API keys data
      const mockApiKeys: ApiKey[] = [
        {
          id: '1',
          name: 'Mobile App Key',
          key: 'sk_live_51H1234567890abcdef',
          type: 'READ',
          status: 'ACTIVE',
          permissions: ['products:read', 'orders:read'],
          lastUsed: '2024-01-15 14:30:00',
          createdAt: '2024-01-01 10:00:00',
          expiresAt: '2024-12-31 23:59:59',
          createdBy: 'admin@rentalshop.com',
          description: 'API key for mobile application',
          usage: {
            requests: 15420,
            limit: 100000,
            resetDate: '2024-02-01 00:00:00'
          }
        },
        {
          id: '2',
          name: 'Webhook Key',
          key: 'sk_webhook_51H1234567890abcdef',
          type: 'WEBHOOK',
          status: 'ACTIVE',
          permissions: ['orders:webhook', 'payments:webhook'],
          lastUsed: '2024-01-15 15:45:00',
          createdAt: '2024-01-05 14:00:00',
          createdBy: 'admin@rentalshop.com',
          description: 'Webhook endpoint authentication',
          usage: {
            requests: 8920,
            limit: 50000,
            resetDate: '2024-02-01 00:00:00'
          }
        },
        {
          id: '3',
          name: 'Admin Dashboard Key',
          key: 'sk_admin_51H1234567890abcdef',
          type: 'ADMIN',
          status: 'ACTIVE',
          permissions: ['*'],
          lastUsed: '2024-01-15 16:20:00',
          createdAt: '2024-01-10 09:00:00',
          createdBy: 'admin@rentalshop.com',
          description: 'Full admin access for dashboard',
          usage: {
            requests: 25680,
            limit: 200000,
            resetDate: '2024-02-01 00:00:00'
          }
        },
        {
          id: '4',
          name: 'Third Party Integration',
          key: 'sk_integration_51H1234567890abcdef',
          type: 'WRITE',
          status: 'INACTIVE',
          permissions: ['products:write', 'inventory:write'],
          lastUsed: '2024-01-10 11:30:00',
          createdAt: '2024-01-08 16:00:00',
          expiresAt: '2024-01-20 23:59:59',
          createdBy: 'admin@rentalshop.com',
          description: 'Integration with external inventory system',
          usage: {
            requests: 3450,
            limit: 25000,
            resetDate: '2024-02-01 00:00:00'
          }
        },
        {
          id: '5',
          name: 'Test Environment Key',
          key: 'sk_test_51H1234567890abcdef',
          type: 'READ',
          status: 'EXPIRED',
          permissions: ['products:read'],
          lastUsed: '2024-01-12 08:15:00',
          createdAt: '2024-01-01 12:00:00',
          expiresAt: '2024-01-15 23:59:59',
          createdBy: 'admin@rentalshop.com',
          description: 'Testing environment access',
          usage: {
            requests: 1200,
            limit: 10000,
            resetDate: '2024-02-01 00:00:00'
          }
        }
      ];

      // Mock endpoints data
      const mockEndpoints: ApiEndpoint[] = [
        {
          id: '1',
          path: '/api/v1/products',
          method: 'GET',
          status: 'ACTIVE',
          version: 'v1',
          description: 'Retrieve all products',
          rateLimit: { requests: 1000, window: '1 hour' },
          lastModified: '2024-01-15 10:00:00',
          modifiedBy: 'admin@rentalshop.com'
        },
        {
          id: '2',
          path: '/api/v1/orders',
          method: 'POST',
          status: 'ACTIVE',
          version: 'v1',
          description: 'Create new order',
          rateLimit: { requests: 500, window: '1 hour' },
          lastModified: '2024-01-14 15:30:00',
          modifiedBy: 'admin@rentalshop.com'
        },
        {
          id: '3',
          path: '/api/v1/webhooks',
          method: 'POST',
          status: 'ACTIVE',
          version: 'v1',
          description: 'Webhook endpoint',
          rateLimit: { requests: 2000, window: '1 hour' },
          lastModified: '2024-01-13 09:15:00',
          modifiedBy: 'admin@rentalshop.com'
        },
        {
          id: '4',
          path: '/api/v1/legacy/users',
          method: 'GET',
          status: 'DEPRECATED',
          version: 'v1',
          description: 'Legacy user endpoint (deprecated)',
          rateLimit: { requests: 100, window: '1 hour' },
          lastModified: '2024-01-10 14:20:00',
          modifiedBy: 'admin@rentalshop.com'
        }
      ];
      
      setApiKeys(mockApiKeys);
      setEndpoints(mockEndpoints);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching API data:', error);
      addToast('error', 'Error', 'Failed to fetch API data');
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      addToast('success', 'API Key Created', 'New API key has been generated successfully');
      setShowCreateKey(false);
      fetchApiData(); // Refresh data
    } catch (error) {
      console.error('Error creating API key:', error);
      addToast('error', 'Error', 'Failed to create API key');
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setApiKeys(prev => prev.map(key => 
        key.id === keyId ? { ...key, status: 'REVOKED' as const } : key
      ));
      addToast('success', 'API Key Revoked', 'API key has been revoked successfully');
    } catch (error) {
      console.error('Error revoking API key:', error);
      addToast('error', 'Error', 'Failed to revoke API key');
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      setApiKeys(prev => prev.filter(key => key.id !== keyId));
      addToast('success', 'API Key Deleted', 'API key has been deleted successfully');
    } catch (error) {
      console.error('Error deleting API key:', error);
      addToast('error', 'Error', 'Failed to delete API key');
    }
  };

  const handleCopyApiKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      addToast('success', 'Copied', 'API key copied to clipboard');
    } catch (error) {
      console.error('Error copying API key:', error);
      addToast('error', 'Error', 'Failed to copy API key');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKey(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  const filteredApiKeys = apiKeys.filter(apiKey => {
    const matchesSearch = apiKey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apiKey.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || apiKey.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || apiKey.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const columns = [
    {
      key: 'name',
      label: 'API Key Name',
      render: (value: string, row: ApiKey) => (
        <div className="flex items-center gap-3">
          <Key className="w-4 h-4 text-text-tertiary" />
          <div>
            <span className="text-sm font-medium text-text-primary">{value}</span>
            <p className="text-xs text-text-tertiary">{row.description}</p>
          </div>
        </div>
      )
    },
    {
      key: 'key',
      label: 'API Key',
      render: (value: string, row: ApiKey) => (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-bg-secondary px-2 py-1 rounded font-mono">
            {showKey[row.id] ? value : '••••••••••••••••••••••••'}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleKeyVisibility(row.id)}
            className="h-6 w-6 p-0"
          >
            {showKey[row.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </Button>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      render: (value: string) => (
        <AdminStatusBadge status={value} type="audit" />
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
      key: 'usage',
      label: 'Usage',
      render: (value: ApiKey['usage']) => (
        <div className="text-sm">
          <div className="text-text-primary">{value.requests.toLocaleString()}</div>
          <div className="text-text-tertiary">/ {value.limit.toLocaleString()}</div>
        </div>
      )
    },
    {
      key: 'lastUsed',
      label: 'Last Used',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm">{value ? new Date(value).toLocaleDateString() : 'Never'}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: ApiKey) => (
        <div className="flex gap-1">
          <ActionButton
            icon={Copy}
            label="Copy"
            onClick={() => handleCopyApiKey(row.key)}
            variant="outline"
            size="sm"
          />
          {row.status === 'ACTIVE' && (
            <ActionButton
              icon={XCircle}
              label="Revoke"
              onClick={() => handleRevokeApiKey(row.id)}
              variant="outline"
              size="sm"
            />
          )}
          <ActionButton
            icon={Trash2}
            label="Delete"
            onClick={() => handleDeleteApiKey(row.id)}
            variant="outline"
            size="sm"
          />
        </div>
      )
    }
  ];

  const filters = [
    {
      label: 'Type',
      value: typeFilter,
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'READ', label: 'Read Only' },
        { value: 'WRITE', label: 'Read/Write' },
        { value: 'ADMIN', label: 'Admin' },
        { value: 'WEBHOOK', label: 'Webhook' }
      ],
      onChange: setTypeFilter
    },
    {
      label: 'Status',
      value: statusFilter,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'INACTIVE', label: 'Inactive' },
        { value: 'EXPIRED', label: 'Expired' },
        { value: 'REVOKED', label: 'Revoked' }
      ],
      onChange: setStatusFilter
    }
  ];

  // API metrics
  const apiMetrics = [
    {
      title: 'Total API Keys',
      value: apiKeys.length,
      change: { value: 3, isPositive: true, period: 'this month' },
      icon: Key,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Active Keys',
      value: apiKeys.filter(k => k.status === 'ACTIVE').length,
      change: { value: 1, isPositive: true, period: 'vs last week' },
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Total Requests',
      value: apiKeys.reduce((sum, key) => sum + key.usage.requests, 0).toLocaleString(),
      change: { value: 15, isPositive: true, period: 'vs last week' },
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'API Endpoints',
      value: endpoints.length,
      change: { value: 0, isPositive: true, period: 'vs last week' },
      icon: Globe,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  // Recent activities
  const recentActivities = [
    {
      id: '1',
      timestamp: '10 minutes ago',
      user: 'admin@rentalshop.com',
      action: 'created',
      description: 'New webhook API key',
      icon: Key,
      type: 'success' as const
    },
    {
      id: '2',
      timestamp: '1 hour ago',
      user: 'admin@rentalshop.com',
      action: 'revoked',
      description: 'Expired test API key',
      icon: XCircle,
      type: 'warning' as const
    },
    {
      id: '3',
      timestamp: '2 hours ago',
      user: 'system@rentalshop.com',
      action: 'rate_limited',
      description: 'API key exceeded rate limit',
      icon: AlertTriangle,
      type: 'error' as const
    },
    {
      id: '4',
      timestamp: '4 hours ago',
      user: 'admin@rentalshop.com',
      action: 'updated',
      description: 'API endpoint permissions',
      icon: Settings,
      type: 'info' as const
    }
  ];

  // Quick actions
  const quickActions = [
    {
      id: '1',
      label: 'Generate API Key',
      description: 'Create a new API key',
      icon: Plus,
      onClick: () => setShowCreateKey(true)
    },
    {
      id: '2',
      label: 'API Documentation',
      description: 'View API documentation',
      icon: FileText,
      onClick: () => addToast('info', 'API Docs', 'Opening API documentation...')
    },
    {
      id: '3',
      label: 'Rate Limits',
      description: 'Configure API rate limits',
      icon: Zap,
      onClick: () => addToast('info', 'Rate Limits', 'Opening rate limit settings...')
    },
    {
      id: '4',
      label: 'API Analytics',
      description: 'View API usage analytics',
      icon: BarChart3,
      onClick: () => addToast('info', 'Analytics', 'Opening API analytics...')
    }
  ];

  return (
    <PageWrapper>
      <AdminPageHeader
        title="API Management"
        subtitle="Manage API keys, endpoints, and access controls"
        actionLabel="Generate API Key"
        actionIcon={Plus}
        onAction={() => setShowCreateKey(true)}
      />

      <PageContent>
        {/* API Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {apiMetrics.map((metric, index) => (
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
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <ActivityFeed
              title="Recent API Activities"
              activities={recentActivities}
              maxItems={5}
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

        {/* Search and Filters */}
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search API keys..."
          filters={filters}
          className="mb-6"
        />

        {/* API Keys Table */}
        {filteredApiKeys.length > 0 ? (
          <DataTable
            data={filteredApiKeys}
            columns={columns}
            loading={loading}
            onRowClick={setSelectedKey}
          />
        ) : (
          <EmptyState
            icon={Key}
            title="No API Keys Found"
            description="No API keys match your current search criteria. Try adjusting your filters or generate a new API key."
            actionLabel="Generate API Key"
            onAction={() => setShowCreateKey(true)}
          />
        )}
      </PageContent>

      {/* API Key Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>API Key Details</DialogTitle>
          </DialogHeader>
          
          {selectedKey && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Name</label>
                  <p className="text-sm text-text-primary">{selectedKey.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Type</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedKey.type} type="audit" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Description</label>
                <p className="text-sm text-text-primary mt-1">{selectedKey.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Status</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedKey.status} type="audit" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Created At</label>
                  <p className="text-sm text-text-primary">{new Date(selectedKey.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Permissions</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedKey.permissions.map((permission, index) => (
                    <span key={index} className="text-xs bg-bg-secondary px-2 py-1 rounded">
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Usage</label>
                  <p className="text-sm text-text-primary">
                    {selectedKey.usage.requests.toLocaleString()} / {selectedKey.usage.limit.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Last Used</label>
                  <p className="text-sm text-text-primary">
                    {selectedKey.lastUsed ? new Date(selectedKey.lastUsed).toLocaleString() : 'Never'}
                  </p>
                </div>
              </div>
              
              {selectedKey.expiresAt && (
                <div>
                  <label className="text-sm font-medium text-text-secondary">Expires At</label>
                  <p className="text-sm text-text-primary">{new Date(selectedKey.expiresAt).toLocaleString()}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Created By</label>
                <p className="text-sm text-text-primary">{selectedKey.createdBy}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Key Name</label>
              <Input placeholder="Enter API key name" />
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Description</label>
              <Input placeholder="Enter description" />
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Type</label>
              <Select>
                <option value="READ">Read Only</option>
                <option value="WRITE">Read/Write</option>
                <option value="ADMIN">Admin</option>
                <option value="WEBHOOK">Webhook</option>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Expiration (Optional)</label>
              <Input type="date" />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateApiKey} className="flex-1">
                Generate Key
              </Button>
              <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
