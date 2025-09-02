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
  Database, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Play, 
  Pause, 
  Trash2, 
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  HardDrive,
  Cloud,
  Archive,
  RefreshCw,
  Settings,
  FileText,
  Calendar,
  User,
  Activity
} from 'lucide-react';

interface Backup {
  id: string;
  name: string;
  type: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED' | 'SCHEDULED';
  size: string;
  createdAt: string;
  completedAt?: string;
  duration?: string;
  location: 'LOCAL' | 'CLOUD' | 'BOTH';
  description: string;
  createdBy: string;
}

interface BackupSchedule {
  id: string;
  name: string;
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  nextRun: string;
  lastRun?: string;
  status: 'ACTIVE' | 'PAUSED' | 'DISABLED';
  type: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  retention: number;
}

export default function BackupRecoveryPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateBackup, setShowCreateBackup] = useState(false);
  const { addToast } = useToasts();

  useEffect(() => {
    fetchBackupData();
  }, []);

  const fetchBackupData = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock backup data
      const mockBackups: Backup[] = [
        {
          id: '1',
          name: 'Full System Backup - 2024-01-15',
          type: 'FULL',
          status: 'COMPLETED',
          size: '2.4 GB',
          createdAt: '2024-01-15 02:00:00',
          completedAt: '2024-01-15 02:45:00',
          duration: '45 minutes',
          location: 'BOTH',
          description: 'Complete system backup including all databases and files',
          createdBy: 'system@rentalshop.com'
        },
        {
          id: '2',
          name: 'Incremental Backup - 2024-01-15',
          type: 'INCREMENTAL',
          status: 'COMPLETED',
          size: '156 MB',
          createdAt: '2024-01-15 14:00:00',
          completedAt: '2024-01-15 14:05:00',
          duration: '5 minutes',
          location: 'CLOUD',
          description: 'Incremental backup of changes since last full backup',
          createdBy: 'system@rentalshop.com'
        },
        {
          id: '3',
          name: 'Database Backup - 2024-01-14',
          type: 'DIFFERENTIAL',
          status: 'COMPLETED',
          size: '890 MB',
          createdAt: '2024-01-14 02:00:00',
          completedAt: '2024-01-14 02:20:00',
          duration: '20 minutes',
          location: 'LOCAL',
          description: 'Differential backup of database changes',
          createdBy: 'admin@rentalshop.com'
        },
        {
          id: '4',
          name: 'Full System Backup - 2024-01-13',
          type: 'FULL',
          status: 'FAILED',
          size: '0 MB',
          createdAt: '2024-01-13 02:00:00',
          location: 'BOTH',
          description: 'Failed backup due to insufficient storage space',
          createdBy: 'system@rentalshop.com'
        },
        {
          id: '5',
          name: 'Scheduled Backup - 2024-01-16',
          type: 'INCREMENTAL',
          status: 'SCHEDULED',
          size: '0 MB',
          createdAt: '2024-01-15 16:00:00',
          location: 'CLOUD',
          description: 'Scheduled incremental backup',
          createdBy: 'system@rentalshop.com'
        }
      ];

      // Mock schedule data
      const mockSchedules: BackupSchedule[] = [
        {
          id: '1',
          name: 'Daily Full Backup',
          frequency: 'DAILY',
          nextRun: '2024-01-16 02:00:00',
          lastRun: '2024-01-15 02:00:00',
          status: 'ACTIVE',
          type: 'FULL',
          retention: 30
        },
        {
          id: '2',
          name: 'Hourly Incremental',
          frequency: 'HOURLY',
          nextRun: '2024-01-15 17:00:00',
          lastRun: '2024-01-15 16:00:00',
          status: 'ACTIVE',
          type: 'INCREMENTAL',
          retention: 7
        },
        {
          id: '3',
          name: 'Weekly Archive',
          frequency: 'WEEKLY',
          nextRun: '2024-01-21 02:00:00',
          lastRun: '2024-01-14 02:00:00',
          status: 'PAUSED',
          type: 'FULL',
          retention: 365
        }
      ];
      
      setBackups(mockBackups);
      setSchedules(mockSchedules);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching backup data:', error);
      addToast('error', 'Error', 'Failed to fetch backup data');
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      addToast('success', 'Backup Created', 'New backup has been initiated successfully');
      setShowCreateBackup(false);
      fetchBackupData(); // Refresh data
    } catch (error) {
      console.error('Error creating backup:', error);
      addToast('error', 'Error', 'Failed to create backup');
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToast('success', 'Restore Initiated', 'Backup restore process has been started');
    } catch (error) {
      console.error('Error restoring backup:', error);
      addToast('error', 'Error', 'Failed to restore backup');
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      setBackups(prev => prev.filter(b => b.id !== backupId));
      addToast('success', 'Backup Deleted', 'Backup has been deleted successfully');
    } catch (error) {
      console.error('Error deleting backup:', error);
      addToast('error', 'Error', 'Failed to delete backup');
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToast('success', 'Download Started', 'Backup download has been initiated');
    } catch (error) {
      console.error('Error downloading backup:', error);
      addToast('error', 'Error', 'Failed to download backup');
    }
  };

  const filteredBackups = backups.filter(backup => {
    const matchesSearch = backup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         backup.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || backup.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || backup.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const columns = [
    {
      key: 'name',
      label: 'Backup Name',
      render: (value: string, row: Backup) => (
        <div className="flex items-center gap-3">
          <Database className="w-4 h-4 text-text-tertiary" />
          <div>
            <span className="text-sm font-medium text-text-primary">{value}</span>
            <p className="text-xs text-text-tertiary">{row.description}</p>
          </div>
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
      key: 'size',
      label: 'Size',
      render: (value: string) => (
        <span className="text-sm text-text-secondary">{value}</span>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm">{new Date(value).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      key: 'location',
      label: 'Location',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          {value === 'CLOUD' ? <Cloud className="w-4 h-4 text-text-tertiary" /> : 
           value === 'LOCAL' ? <HardDrive className="w-4 h-4 text-text-tertiary" /> :
           <Archive className="w-4 h-4 text-text-tertiary" />}
          <span className="text-sm text-text-secondary">{value}</span>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: Backup) => (
        <div className="flex gap-1">
          {row.status === 'COMPLETED' && (
            <>
              <ActionButton
                icon={Download}
                label="Download"
                onClick={() => handleDownloadBackup(row.id)}
                variant="outline"
                size="sm"
              />
              <ActionButton
                icon={Play}
                label="Restore"
                onClick={() => handleRestoreBackup(row.id)}
                variant="default"
                size="sm"
              />
            </>
          )}
          <ActionButton
            icon={Trash2}
            label="Delete"
            onClick={() => handleDeleteBackup(row.id)}
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
        { value: 'FULL', label: 'Full' },
        { value: 'INCREMENTAL', label: 'Incremental' },
        { value: 'DIFFERENTIAL', label: 'Differential' }
      ],
      onChange: setTypeFilter
    },
    {
      label: 'Status',
      value: statusFilter,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'FAILED', label: 'Failed' },
        { value: 'SCHEDULED', label: 'Scheduled' }
      ],
      onChange: setStatusFilter
    }
  ];

  // Backup metrics
  const backupMetrics = [
    {
      title: 'Total Backups',
      value: backups.length,
      change: { value: 12, isPositive: true, period: 'this month' },
      icon: Database,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Storage Used',
      value: '3.2 GB',
      change: { value: 8, isPositive: true, period: 'vs last week' },
      icon: HardDrive,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Failed Backups',
      value: backups.filter(b => b.status === 'FAILED').length,
      change: { value: 2, isPositive: false, period: 'vs last week' },
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      title: 'Active Schedules',
      value: schedules.filter(s => s.status === 'ACTIVE').length,
      change: { value: 0, isPositive: true, period: 'vs last week' },
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  // Recent activities
  const recentActivities = [
    {
      id: '1',
      timestamp: '5 minutes ago',
      user: 'system@rentalshop.com',
      action: 'completed',
      description: 'Incremental backup - 156 MB',
      icon: Database,
      type: 'success' as const
    },
    {
      id: '2',
      timestamp: '1 hour ago',
      user: 'admin@rentalshop.com',
      action: 'created',
      description: 'Manual full backup scheduled',
      icon: Archive,
      type: 'info' as const
    },
    {
      id: '3',
      timestamp: '2 hours ago',
      user: 'system@rentalshop.com',
      action: 'failed',
      description: 'Backup failed - insufficient storage',
      icon: XCircle,
      type: 'error' as const
    },
    {
      id: '4',
      timestamp: '6 hours ago',
      user: 'admin@rentalshop.com',
      action: 'restored',
      description: 'Database restored from backup',
      icon: RefreshCw,
      type: 'success' as const
    }
  ];

  // Quick actions
  const quickActions = [
    {
      id: '1',
      label: 'Create Full Backup',
      description: 'Create a complete system backup',
      icon: Database,
      onClick: () => setShowCreateBackup(true)
    },
    {
      id: '2',
      label: 'Schedule Backup',
      description: 'Set up automated backup schedules',
      icon: Clock,
      onClick: () => addToast('info', 'Schedule Backup', 'Opening backup scheduler...')
    },
    {
      id: '3',
      label: 'Storage Settings',
      description: 'Configure backup storage locations',
      icon: Settings,
      onClick: () => addToast('info', 'Storage Settings', 'Opening storage configuration...')
    },
    {
      id: '4',
      label: 'Recovery Test',
      description: 'Test backup recovery procedures',
      icon: Play,
      onClick: () => addToast('info', 'Recovery Test', 'Starting recovery test...')
    }
  ];

  return (
    <PageWrapper>
      <AdminPageHeader
        title="Backup & Recovery"
        subtitle="Manage system backups, schedules, and recovery procedures"
        actionLabel="Create Backup"
        actionIcon={Database}
        onAction={() => setShowCreateBackup(true)}
      />

      <PageContent>
        {/* Backup Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {backupMetrics.map((metric, index) => (
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
              title="Recent Backup Activities"
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
          searchPlaceholder="Search backups..."
          filters={filters}
          className="mb-6"
        />

        {/* Backups Table */}
        {filteredBackups.length > 0 ? (
          <DataTable
            data={filteredBackups}
            columns={columns}
            loading={loading}
            onRowClick={setSelectedBackup}
          />
        ) : (
          <EmptyState
            icon={Database}
            title="No Backups Found"
            description="No backups match your current search criteria. Try adjusting your filters or create a new backup."
            actionLabel="Create Backup"
            onAction={() => setShowCreateBackup(true)}
          />
        )}
      </PageContent>

      {/* Backup Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Backup Details</DialogTitle>
          </DialogHeader>
          
          {selectedBackup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Name</label>
                  <p className="text-sm text-text-primary">{selectedBackup.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Type</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedBackup.type} type="audit" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Description</label>
                <p className="text-sm text-text-primary mt-1">{selectedBackup.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Status</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedBackup.status} type="audit" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Size</label>
                  <p className="text-sm text-text-primary">{selectedBackup.size}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Created At</label>
                  <p className="text-sm text-text-primary">{new Date(selectedBackup.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Location</label>
                  <p className="text-sm text-text-primary">{selectedBackup.location}</p>
                </div>
              </div>
              
              {selectedBackup.completedAt && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Completed At</label>
                    <p className="text-sm text-text-primary">{new Date(selectedBackup.completedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Duration</label>
                    <p className="text-sm text-text-primary">{selectedBackup.duration}</p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Created By</label>
                <p className="text-sm text-text-primary">{selectedBackup.createdBy}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Backup Dialog */}
      <Dialog open={showCreateBackup} onOpenChange={setShowCreateBackup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Backup</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Backup Type</label>
              <Select>
                <option value="FULL">Full Backup</option>
                <option value="INCREMENTAL">Incremental Backup</option>
                <option value="DIFFERENTIAL">Differential Backup</option>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Backup Name</label>
              <Input placeholder="Enter backup name" />
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Description</label>
              <Input placeholder="Enter backup description" />
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Storage Location</label>
              <Select>
                <option value="LOCAL">Local Storage</option>
                <option value="CLOUD">Cloud Storage</option>
                <option value="BOTH">Both Locations</option>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateBackup} className="flex-1">
                Create Backup
              </Button>
              <Button variant="outline" onClick={() => setShowCreateBackup(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
