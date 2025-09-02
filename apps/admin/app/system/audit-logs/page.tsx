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
  EmptyState
} from '@rentalshop/ui';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  User, 
  Calendar,
  Clock,
  Shield,
  Database,
  AlertTriangle
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { addToast } = useToasts();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          timestamp: '2024-01-15 10:30:00',
          user: 'admin@rentalshop.com',
          action: 'LOGIN',
          resource: 'Authentication',
          details: 'User logged in successfully',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'SUCCESS',
          severity: 'LOW'
        },
        {
          id: '2',
          timestamp: '2024-01-15 10:25:00',
          user: 'merchant1@example.com',
          action: 'CREATE_ORDER',
          resource: 'Order Management',
          details: 'Created new order ORD-001-0001',
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          status: 'SUCCESS',
          severity: 'MEDIUM'
        },
        {
          id: '3',
          timestamp: '2024-01-15 10:20:00',
          user: 'staff.outlet1@example.com',
          action: 'UPDATE_PRODUCT',
          resource: 'Product Management',
          details: 'Updated product pricing for Product ID 123',
          ipAddress: '192.168.1.102',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
          status: 'SUCCESS',
          severity: 'MEDIUM'
        },
        {
          id: '4',
          timestamp: '2024-01-15 10:15:00',
          user: 'admin@rentalshop.com',
          action: 'DELETE_USER',
          resource: 'User Management',
          details: 'Deleted user account for user@example.com',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'SUCCESS',
          severity: 'HIGH'
        },
        {
          id: '5',
          timestamp: '2024-01-15 10:10:00',
          user: 'unknown@example.com',
          action: 'LOGIN',
          resource: 'Authentication',
          details: 'Failed login attempt - invalid credentials',
          ipAddress: '192.168.1.200',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          status: 'FAILED',
          severity: 'MEDIUM'
        }
      ];
      
      setLogs(mockLogs);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      addToast('error', 'Error', 'Failed to fetch audit logs');
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToast('success', 'Export Complete', 'Audit logs exported successfully');
    } catch (error) {
      console.error('Error exporting logs:', error);
      addToast('error', 'Error', 'Failed to export audit logs');
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    
    return matchesSearch && matchesStatus && matchesSeverity;
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
      key: 'action',
      label: 'Action',
      render: (value: string) => (
        <span className="text-sm font-medium text-text-primary">{value}</span>
      )
    },
    {
      key: 'resource',
      label: 'Resource',
      render: (value: string) => (
        <span className="text-sm text-text-secondary">{value}</span>
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
      key: 'severity',
      label: 'Severity',
      render: (value: string) => (
        <AdminStatusBadge status={value} type="audit" />
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: AuditLog) => (
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
      label: 'Status',
      value: statusFilter,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'SUCCESS', label: 'Success' },
        { value: 'FAILED', label: 'Failed' },
        { value: 'WARNING', label: 'Warning' }
      ],
      onChange: setStatusFilter
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

  return (
    <PageWrapper>
      <AdminPageHeader
        title="Audit Logs"
        subtitle="Track and monitor system activities and user actions"
        actionLabel="Export Logs"
        actionIcon={Download}
        onAction={handleExport}
      />

      <PageContent>
        {/* Search and Filters */}
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search by user, action, or resource..."
          filters={filters}
          className="mb-6"
        />

        {/* Audit Logs Table */}
        {filteredLogs.length > 0 ? (
          <DataTable
            data={filteredLogs}
            columns={columns}
            loading={loading}
            onRowClick={handleViewDetails}
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No Audit Logs Found"
            description="No audit logs match your current search criteria. Try adjusting your filters or search terms."
          />
        )}
      </PageContent>

      {/* Log Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Timestamp</label>
                  <p className="text-sm text-text-primary">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">User</label>
                  <p className="text-sm text-text-primary">{selectedLog.user}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Action</label>
                  <p className="text-sm text-text-primary">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Resource</label>
                  <p className="text-sm text-text-primary">{selectedLog.resource}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Status</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedLog.status} type="audit" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Severity</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedLog.severity} type="audit" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Details</label>
                <p className="text-sm text-text-primary mt-1">{selectedLog.details}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">IP Address</label>
                  <p className="text-sm text-text-primary">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">User Agent</label>
                  <p className="text-sm text-text-primary break-all">{selectedLog.userAgent}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
