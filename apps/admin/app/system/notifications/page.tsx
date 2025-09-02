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
  Bell, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Send,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Database
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'SYSTEM' | 'SECURITY' | 'MAINTENANCE' | 'USER' | 'BILLING';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'FAILED';
  targetAudience: 'ALL' | 'ADMINS' | 'MERCHANTS' | 'OUTLET_ADMINS' | 'OUTLET_STAFF';
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  createdBy: string;
  recipients: number;
  readCount: number;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const { addToast } = useToasts();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'System Maintenance Scheduled',
          message: 'Scheduled maintenance will occur on January 20th from 2:00 AM to 4:00 AM UTC. The system will be temporarily unavailable.',
          type: 'MAINTENANCE',
          priority: 'HIGH',
          status: 'SENT',
          targetAudience: 'ALL',
          scheduledAt: '2024-01-20 02:00:00',
          sentAt: '2024-01-15 10:00:00',
          createdAt: '2024-01-15 09:30:00',
          createdBy: 'admin@rentalshop.com',
          recipients: 1247,
          readCount: 892
        },
        {
          id: '2',
          title: 'Security Alert: Unusual Login Activity',
          message: 'Multiple failed login attempts detected from IP address 192.168.1.200. Please review security logs.',
          type: 'SECURITY',
          priority: 'URGENT',
          status: 'SENT',
          targetAudience: 'ADMINS',
          sentAt: '2024-01-15 10:15:00',
          createdAt: '2024-01-15 10:10:00',
          createdBy: 'system@rentalshop.com',
          recipients: 5,
          readCount: 5
        },
        {
          id: '3',
          title: 'New Feature: Enhanced Reporting',
          message: 'We have released new reporting features including advanced analytics and custom dashboards.',
          type: 'SYSTEM',
          priority: 'MEDIUM',
          status: 'SENT',
          targetAudience: 'MERCHANTS',
          sentAt: '2024-01-14 14:00:00',
          createdAt: '2024-01-14 13:45:00',
          createdBy: 'admin@rentalshop.com',
          recipients: 234,
          readCount: 156
        },
        {
          id: '4',
          title: 'Billing Reminder: Subscription Renewal',
          message: 'Your subscription will renew on January 25th. Please ensure your payment method is up to date.',
          type: 'BILLING',
          priority: 'MEDIUM',
          status: 'SCHEDULED',
          targetAudience: 'MERCHANTS',
          scheduledAt: '2024-01-20 09:00:00',
          createdAt: '2024-01-15 08:00:00',
          createdBy: 'admin@rentalshop.com',
          recipients: 0,
          readCount: 0
        },
        {
          id: '5',
          title: 'User Account Created',
          message: 'A new user account has been created for merchant1@example.com.',
          type: 'USER',
          priority: 'LOW',
          status: 'SENT',
          targetAudience: 'ADMINS',
          sentAt: '2024-01-15 11:30:00',
          createdAt: '2024-01-15 11:25:00',
          createdBy: 'system@rentalshop.com',
          recipients: 5,
          readCount: 3
        }
      ];
      
      setNotifications(mockNotifications);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      addToast('error', 'Error', 'Failed to fetch notifications');
      setLoading(false);
    }
  };

  const handleCreateNotification = () => {
    setShowCreate(true);
  };

  const handleEditNotification = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetails(true);
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(prev => prev.filter(n => n.id !== id));
      addToast('success', 'Notification Deleted', 'Notification has been deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      addToast('error', 'Error', 'Failed to delete notification');
    }
  };

  const handleSendNotification = async (id: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setNotifications(prev => prev.map(n => 
        n.id === id 
          ? { ...n, status: 'SENT' as const, sentAt: new Date().toISOString() }
          : n
      ));
      addToast('success', 'Notification Sent', 'Notification has been sent successfully');
    } catch (error) {
      console.error('Error sending notification:', error);
      addToast('error', 'Error', 'Failed to send notification');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SYSTEM': return Database;
      case 'SECURITY': return AlertTriangle;
      case 'MAINTENANCE': return Clock;
      case 'USER': return User;
      case 'BILLING': return Mail;
      default: return Info;
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (value: string, row: Notification) => {
        const Icon = getTypeIcon(row.type);
        return (
          <div className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-text-tertiary" />
            <div>
              <span className="text-sm font-medium text-text-primary">{value}</span>
              <p className="text-xs text-text-tertiary">{row.type}</p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'priority',
      label: 'Priority',
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
      key: 'targetAudience',
      label: 'Audience',
      render: (value: string) => (
        <span className="text-sm text-text-secondary">{value}</span>
      )
    },
    {
      key: 'recipients',
      label: 'Recipients',
      render: (value: number, row: Notification) => (
        <div className="text-sm">
          <span className="text-text-primary">{value}</span>
          {row.readCount > 0 && (
            <span className="text-text-tertiary ml-1">({row.readCount} read)</span>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: string) => (
        <span className="text-sm text-text-secondary">{new Date(value).toLocaleDateString()}</span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: Notification) => (
        <div className="flex gap-1">
          <ActionButton
            icon={Eye}
            label="View"
            onClick={() => handleEditNotification(row)}
            variant="outline"
            size="sm"
          />
          {row.status === 'DRAFT' && (
            <ActionButton
              icon={Send}
              label="Send"
              onClick={() => handleSendNotification(row.id)}
              variant="default"
              size="sm"
            />
          )}
          <ActionButton
            icon={Trash2}
            label="Delete"
            onClick={() => handleDeleteNotification(row.id)}
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
        { value: 'SYSTEM', label: 'System' },
        { value: 'SECURITY', label: 'Security' },
        { value: 'MAINTENANCE', label: 'Maintenance' },
        { value: 'USER', label: 'User' },
        { value: 'BILLING', label: 'Billing' }
      ],
      onChange: setTypeFilter
    },
    {
      label: 'Status',
      value: statusFilter,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'DRAFT', label: 'Draft' },
        { value: 'SCHEDULED', label: 'Scheduled' },
        { value: 'SENT', label: 'Sent' },
        { value: 'FAILED', label: 'Failed' }
      ],
      onChange: setStatusFilter
    }
  ];

  return (
    <PageWrapper>
      <AdminPageHeader
        title="Notifications Center"
        subtitle="Manage system-wide notifications and alerts"
        actionLabel="Create Notification"
        actionIcon={Plus}
        onAction={handleCreateNotification}
      />

      <PageContent>
        {/* Search and Filters */}
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search notifications..."
          filters={filters}
          className="mb-6"
        />

        {/* Notifications Table */}
        {filteredNotifications.length > 0 ? (
          <DataTable
            data={filteredNotifications}
            columns={columns}
            loading={loading}
            onRowClick={handleEditNotification}
          />
        ) : (
          <EmptyState
            icon={Bell}
            title="No Notifications Found"
            description="No notifications match your current search criteria. Try adjusting your filters or create a new notification."
            actionLabel="Create Notification"
            onAction={handleCreateNotification}
          />
        )}
      </PageContent>

      {/* Notification Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Notification Details</DialogTitle>
          </DialogHeader>
          
          {selectedNotification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Title</label>
                  <p className="text-sm text-text-primary">{selectedNotification.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Type</label>
                  <p className="text-sm text-text-primary">{selectedNotification.type}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Message</label>
                <p className="text-sm text-text-primary mt-1">{selectedNotification.message}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Priority</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedNotification.priority} type="audit" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Status</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedNotification.status} type="audit" />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Target Audience</label>
                  <p className="text-sm text-text-primary">{selectedNotification.targetAudience}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Recipients</label>
                  <p className="text-sm text-text-primary">{selectedNotification.recipients}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Created By</label>
                  <p className="text-sm text-text-primary">{selectedNotification.createdBy}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Created At</label>
                  <p className="text-sm text-text-primary">{new Date(selectedNotification.createdAt).toLocaleString()}</p>
                </div>
              </div>
              
              {selectedNotification.scheduledAt && (
                <div>
                  <label className="text-sm font-medium text-text-secondary">Scheduled At</label>
                  <p className="text-sm text-text-primary">{new Date(selectedNotification.scheduledAt).toLocaleString()}</p>
                </div>
              )}
              
              {selectedNotification.sentAt && (
                <div>
                  <label className="text-sm font-medium text-text-secondary">Sent At</label>
                  <p className="text-sm text-text-primary">{new Date(selectedNotification.sentAt).toLocaleString()}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
