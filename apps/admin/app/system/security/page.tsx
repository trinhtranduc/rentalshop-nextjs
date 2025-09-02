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
  SecurityCard,
  MetricCard,
  ActivityFeed,
  QuickActions,
  SystemHealth
} from '@rentalshop/ui';
import { 
  Shield, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Key,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Database,
  Server,
  Activity,
  Download,
  Upload,
  Settings,
  Users,
  FileText
} from 'lucide-react';

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'LOGIN_ATTEMPT' | 'PERMISSION_CHANGE' | 'DATA_ACCESS' | 'SYSTEM_CHANGE' | 'SECURITY_ALERT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  user: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  details: string;
}

export default function SecurityPage() {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { addToast } = useToasts();

  useEffect(() => {
    fetchSecurityEvents();
  }, []);

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockEvents: SecurityEvent[] = [
        {
          id: '1',
          timestamp: '2024-01-15 10:30:00',
          type: 'LOGIN_ATTEMPT',
          severity: 'HIGH',
          description: 'Multiple failed login attempts from suspicious IP',
          user: 'unknown@example.com',
          ipAddress: '192.168.1.200',
          status: 'BLOCKED',
          details: '5 failed login attempts within 5 minutes from IP 192.168.1.200'
        },
        {
          id: '2',
          timestamp: '2024-01-15 10:25:00',
          type: 'PERMISSION_CHANGE',
          severity: 'MEDIUM',
          description: 'User role changed from OUTLET_STAFF to OUTLET_ADMIN',
          user: 'admin@rentalshop.com',
          ipAddress: '192.168.1.100',
          status: 'SUCCESS',
          details: 'User john.doe@example.com role elevated by admin@rentalshop.com'
        },
        {
          id: '3',
          timestamp: '2024-01-15 10:20:00',
          type: 'DATA_ACCESS',
          severity: 'LOW',
          description: 'Bulk data export initiated',
          user: 'merchant1@example.com',
          ipAddress: '192.168.1.101',
          status: 'SUCCESS',
          details: 'Customer data export for 500 records'
        },
        {
          id: '4',
          timestamp: '2024-01-15 10:15:00',
          type: 'SYSTEM_CHANGE',
          severity: 'HIGH',
          description: 'System configuration modified',
          user: 'admin@rentalshop.com',
          ipAddress: '192.168.1.100',
          status: 'SUCCESS',
          details: 'SMTP settings updated in system configuration'
        },
        {
          id: '5',
          timestamp: '2024-01-15 10:10:00',
          type: 'SECURITY_ALERT',
          severity: 'CRITICAL',
          description: 'Unusual data access pattern detected',
          user: 'system@rentalshop.com',
          ipAddress: '192.168.1.102',
          status: 'SUCCESS',
          details: 'User accessed 1000+ customer records in 10 minutes'
        }
      ];
      
      setSecurityEvents(mockEvents);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching security events:', error);
      addToast('error', 'Error', 'Failed to fetch security events');
      setLoading(false);
    }
  };

  const handleViewDetails = (event: SecurityEvent) => {
    setSelectedEvent(event);
    setShowDetails(true);
  };

  const filteredEvents = securityEvents.filter(event => {
    const matchesSearch = event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || event.type === typeFilter;
    const matchesSeverity = severityFilter === 'all' || event.severity === severityFilter;
    
    return matchesSearch && matchesType && matchesSeverity;
  });

  const columns = [
    {
      key: 'timestamp',
      label: 'Timestamp',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm">{value}</span>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      render: (value: string) => (
        <span className="text-sm font-medium text-text-primary">{value.replace('_', ' ')}</span>
      )
    },
    {
      key: 'description',
      label: 'Description',
      render: (value: string) => (
        <span className="text-sm text-text-secondary">{value}</span>
      )
    },
    {
      key: 'user',
      label: 'User',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'severity',
      label: 'Severity',
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
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: SecurityEvent) => (
        <ActionButton
          icon={Eye}
          label="View Details"
          onClick={() => handleViewDetails(row)}
          variant="outline"
          size="sm"
        />
      )
    }
  ];

  const filters = [
    {
      label: 'Type',
      value: typeFilter,
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'LOGIN_ATTEMPT', label: 'Login Attempt' },
        { value: 'PERMISSION_CHANGE', label: 'Permission Change' },
        { value: 'DATA_ACCESS', label: 'Data Access' },
        { value: 'SYSTEM_CHANGE', label: 'System Change' },
        { value: 'SECURITY_ALERT', label: 'Security Alert' }
      ],
      onChange: setTypeFilter
    },
    {
      label: 'Severity',
      value: severityFilter,
      options: [
        { value: 'all', label: 'All Severity' },
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
        { value: 'CRITICAL', label: 'Critical' }
      ],
      onChange: setSeverityFilter
    }
  ];

  // Security metrics
  const securityMetrics = [
    {
      title: 'Active Sessions',
      value: '1,247',
      change: { value: 12, isPositive: true, period: 'last hour' },
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Failed Logins',
      value: '23',
      change: { value: 8, isPositive: false, period: 'last hour' },
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Security Alerts',
      value: '5',
      change: { value: 2, isPositive: false, period: 'last hour' },
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      title: 'Blocked IPs',
      value: '12',
      change: { value: 3, isPositive: true, period: 'last hour' },
      icon: Shield,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    }
  ];

  // Security cards
  const securityCards = [
    {
      title: 'Two-Factor Authentication',
      description: '2FA is enabled for all admin accounts. 95% of users have 2FA enabled.',
      icon: Key,
      status: 'secure' as const,
      actionLabel: 'Configure',
      onAction: () => addToast('info', '2FA Configuration', 'Opening 2FA settings...')
    },
    {
      title: 'Password Policy',
      description: 'Strong password requirements are enforced. Minimum 8 characters with complexity.',
      icon: Lock,
      status: 'secure' as const,
      actionLabel: 'Update Policy',
      onAction: () => addToast('info', 'Password Policy', 'Opening password policy settings...')
    },
    {
      title: 'Session Management',
      description: 'Sessions expire after 30 minutes of inactivity. Auto-logout is enabled.',
      icon: Clock,
      status: 'warning' as const,
      actionLabel: 'Review',
      onAction: () => addToast('info', 'Session Settings', 'Opening session management...')
    },
    {
      title: 'API Security',
      description: 'API rate limiting is active. 3 failed attempts trigger temporary block.',
      icon: Server,
      status: 'secure' as const,
      actionLabel: 'Configure',
      onAction: () => addToast('info', 'API Security', 'Opening API security settings...')
    }
  ];

  // System health metrics
  const healthMetrics = [
    {
      name: 'CPU Usage',
      value: 45,
      max: 100,
      unit: '%',
      status: 'healthy' as const,
      icon: Activity
    },
    {
      name: 'Memory Usage',
      value: 78,
      max: 100,
      unit: '%',
      status: 'warning' as const,
      icon: Database
    },
    {
      name: 'Disk Space',
      value: 65,
      max: 100,
      unit: '%',
      status: 'healthy' as const,
      icon: Server
    },
    {
      name: 'Network Latency',
      value: 12,
      max: 100,
      unit: 'ms',
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
      action: 'updated',
      description: 'Security policy settings',
      icon: Settings,
      type: 'info' as const
    },
    {
      id: '2',
      timestamp: '5 minutes ago',
      user: 'system@rentalshop.com',
      action: 'blocked',
      description: 'Suspicious IP address 192.168.1.200',
      icon: Shield,
      type: 'warning' as const
    },
    {
      id: '3',
      timestamp: '10 minutes ago',
      user: 'merchant1@example.com',
      action: 'accessed',
      description: 'Customer data export',
      icon: Download,
      type: 'info' as const
    },
    {
      id: '4',
      timestamp: '15 minutes ago',
      user: 'admin@rentalshop.com',
      action: 'created',
      description: 'New user account for outlet staff',
      icon: User,
      type: 'success' as const
    }
  ];

  // Quick actions
  const quickActions = [
    {
      id: '1',
      label: 'Generate Security Report',
      description: 'Create comprehensive security audit report',
      icon: FileText,
      onClick: () => addToast('info', 'Security Report', 'Generating security report...')
    },
    {
      id: '2',
      label: 'Block IP Address',
      description: 'Block suspicious IP addresses',
      icon: Shield,
      onClick: () => addToast('info', 'IP Blocking', 'Opening IP blocking interface...')
    },
    {
      id: '3',
      label: 'Reset User Sessions',
      description: 'Force logout all users',
      icon: Users,
      onClick: () => addToast('warning', 'Session Reset', 'This will log out all users. Continue?')
    },
    {
      id: '4',
      label: 'Update Security Policies',
      description: 'Modify security configuration',
      icon: Settings,
      onClick: () => addToast('info', 'Security Policies', 'Opening security policy settings...')
    }
  ];

  return (
    <PageWrapper>
      <AdminPageHeader
        title="Security Management"
        subtitle="Monitor and manage system security, access controls, and threat detection"
      />

      <PageContent>
        {/* Security Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {securityMetrics.map((metric, index) => (
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
          {/* Security Cards */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {securityCards.map((card, index) => (
                <SecurityCard
                  key={index}
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                  status={card.status}
                  actionLabel={card.actionLabel}
                  onAction={card.onAction}
                />
              ))}
            </div>
          </div>

          {/* System Health */}
          <div>
            <SystemHealth
              title="System Health"
              metrics={healthMetrics}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <ActivityFeed
              title="Recent Security Activities"
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
          searchPlaceholder="Search security events..."
          filters={filters}
          className="mb-6"
        />

        {/* Security Events Table */}
        {filteredEvents.length > 0 ? (
          <DataTable
            data={filteredEvents}
            columns={columns}
            loading={loading}
            onRowClick={handleViewDetails}
          />
        ) : (
          <EmptyState
            icon={Shield}
            title="No Security Events Found"
            description="No security events match your current search criteria. Try adjusting your filters or search terms."
          />
        )}
      </PageContent>

      {/* Event Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Security Event Details</DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Timestamp</label>
                  <p className="text-sm text-text-primary">{selectedEvent.timestamp}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Type</label>
                  <p className="text-sm text-text-primary">{selectedEvent.type.replace('_', ' ')}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Description</label>
                <p className="text-sm text-text-primary mt-1">{selectedEvent.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Severity</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedEvent.severity} type="audit" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Status</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedEvent.status} type="audit" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">User</label>
                  <p className="text-sm text-text-primary">{selectedEvent.user}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">IP Address</label>
                  <p className="text-sm text-text-primary">{selectedEvent.ipAddress}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Details</label>
                <p className="text-sm text-text-primary mt-1">{selectedEvent.details}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
