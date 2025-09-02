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
  Wrench, 
  Search, 
  Filter, 
  Play, 
  Pause, 
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
  FileText,
  Calendar,
  User,
  Zap,
  BarChart3,
  RefreshCw,
  Download,
  Upload,
  Bell,
  Eye,
  EyeOff,
  Plus,
  HardDrive
} from 'lucide-react';

interface MaintenanceTask {
  id: string;
  name: string;
  type: 'SCHEDULED' | 'EMERGENCY' | 'ROUTINE' | 'UPDATE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  scheduledAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: string;
  description: string;
  createdBy: string;
  affectedServices: string[];
  estimatedDuration: string;
  actualDuration?: string;
}

interface MaintenanceWindow {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  description: string;
  affectedServices: string[];
  notifications: {
    users: boolean;
    admins: boolean;
    customers: boolean;
  };
}

export default function MaintenancePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showCreateWindow, setShowCreateWindow] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const { addToast } = useToasts();

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock maintenance tasks data
      const mockTasks: MaintenanceTask[] = [
        {
          id: '1',
          name: 'Database Optimization',
          type: 'ROUTINE',
          status: 'COMPLETED',
          priority: 'MEDIUM',
          scheduledAt: '2024-01-15 02:00:00',
          startedAt: '2024-01-15 02:00:00',
          completedAt: '2024-01-15 02:45:00',
          duration: '45 minutes',
          description: 'Optimize database indexes and clean up old records',
          createdBy: 'admin@rentalshop.com',
          affectedServices: ['Database', 'API', 'Admin Panel'],
          estimatedDuration: '1 hour',
          actualDuration: '45 minutes'
        },
        {
          id: '2',
          name: 'Security Patch Update',
          type: 'UPDATE',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          scheduledAt: '2024-01-15 16:00:00',
          startedAt: '2024-01-15 16:00:00',
          description: 'Apply critical security patches to all services',
          createdBy: 'admin@rentalshop.com',
          affectedServices: ['API', 'Admin Panel', 'Client App'],
          estimatedDuration: '2 hours'
        },
        {
          id: '3',
          name: 'Server Hardware Maintenance',
          type: 'SCHEDULED',
          status: 'PENDING',
          priority: 'MEDIUM',
          scheduledAt: '2024-01-20 01:00:00',
          description: 'Replace faulty hard drives and upgrade RAM',
          createdBy: 'admin@rentalshop.com',
          affectedServices: ['All Services'],
          estimatedDuration: '4 hours'
        },
        {
          id: '4',
          name: 'Emergency Database Recovery',
          type: 'EMERGENCY',
          status: 'COMPLETED',
          priority: 'CRITICAL',
          scheduledAt: '2024-01-14 10:30:00',
          startedAt: '2024-01-14 10:30:00',
          completedAt: '2024-01-14 11:15:00',
          duration: '45 minutes',
          description: 'Emergency recovery from database corruption',
          createdBy: 'admin@rentalshop.com',
          affectedServices: ['Database', 'API'],
          estimatedDuration: '1 hour',
          actualDuration: '45 minutes'
        },
        {
          id: '5',
          name: 'SSL Certificate Renewal',
          type: 'ROUTINE',
          status: 'FAILED',
          priority: 'HIGH',
          scheduledAt: '2024-01-13 03:00:00',
          startedAt: '2024-01-13 03:00:00',
          description: 'Renew SSL certificates for all domains',
          createdBy: 'admin@rentalshop.com',
          affectedServices: ['API', 'Admin Panel', 'Client App'],
          estimatedDuration: '30 minutes'
        }
      ];

      // Mock maintenance windows data
      const mockWindows: MaintenanceWindow[] = [
        {
          id: '1',
          name: 'Weekly Maintenance Window',
          startTime: '2024-01-21 02:00:00',
          endTime: '2024-01-21 06:00:00',
          status: 'SCHEDULED',
          description: 'Weekly maintenance window for routine tasks',
          affectedServices: ['Database', 'API', 'Admin Panel'],
          notifications: {
            users: true,
            admins: true,
            customers: true
          }
        },
        {
          id: '2',
          name: 'Emergency Maintenance',
          startTime: '2024-01-14 10:30:00',
          endTime: '2024-01-14 12:00:00',
          status: 'COMPLETED',
          description: 'Emergency maintenance for database recovery',
          affectedServices: ['Database', 'API'],
          notifications: {
            users: true,
            admins: true,
            customers: false
          }
        }
      ];
      
      setTasks(mockTasks);
      setWindows(mockWindows);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
      addToast('error', 'Error', 'Failed to fetch maintenance data');
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      addToast('success', 'Task Created', 'New maintenance task has been created successfully');
      setShowCreateTask(false);
      fetchMaintenanceData(); // Refresh data
    } catch (error) {
      console.error('Error creating task:', error);
      addToast('error', 'Error', 'Failed to create maintenance task');
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: 'IN_PROGRESS' as const, startedAt: new Date().toISOString() } : task
      ));
      addToast('success', 'Task Started', 'Maintenance task has been started');
    } catch (error) {
      console.error('Error starting task:', error);
      addToast('error', 'Error', 'Failed to start maintenance task');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { 
          ...task, 
          status: 'COMPLETED' as const, 
          completedAt: new Date().toISOString(),
          duration: '45 minutes' // Mock duration
        } : task
      ));
      addToast('success', 'Task Completed', 'Maintenance task has been completed');
    } catch (error) {
      console.error('Error completing task:', error);
      addToast('error', 'Error', 'Failed to complete maintenance task');
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500));
      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, status: 'CANCELLED' as const } : task
      ));
      addToast('success', 'Task Cancelled', 'Maintenance task has been cancelled');
    } catch (error) {
      console.error('Error cancelling task:', error);
      addToast('error', 'Error', 'Failed to cancel maintenance task');
    }
  };

  const handleToggleMaintenanceMode = async () => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMaintenanceMode(!maintenanceMode);
      addToast(
        'success', 
        'Maintenance Mode Updated', 
        `Maintenance mode has been ${!maintenanceMode ? 'enabled' : 'disabled'}`
      );
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      addToast('error', 'Error', 'Failed to update maintenance mode');
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || task.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const columns = [
    {
      key: 'name',
      label: 'Task Name',
      render: (value: string, row: MaintenanceTask) => (
        <div className="flex items-center gap-3">
          <Wrench className="w-4 h-4 text-text-tertiary" />
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
      key: 'priority',
      label: 'Priority',
      render: (value: string) => (
        <AdminStatusBadge status={value} type="audit" />
      )
    },
    {
      key: 'scheduledAt',
      label: 'Scheduled',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm">{new Date(value).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      key: 'estimatedDuration',
      label: 'Duration',
      render: (value: string, row: MaintenanceTask) => (
        <span className="text-sm text-text-secondary">
          {row.actualDuration || value}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: MaintenanceTask) => (
        <div className="flex gap-1">
          {row.status === 'PENDING' && (
            <ActionButton
              icon={Play}
              label="Start"
              onClick={() => handleStartTask(row.id)}
              variant="default"
              size="sm"
            />
          )}
          {row.status === 'IN_PROGRESS' && (
            <ActionButton
              icon={CheckCircle}
              label="Complete"
              onClick={() => handleCompleteTask(row.id)}
              variant="default"
              size="sm"
            />
          )}
          {(row.status === 'PENDING' || row.status === 'IN_PROGRESS') && (
            <ActionButton
              icon={XCircle}
              label="Cancel"
              onClick={() => handleCancelTask(row.id)}
              variant="outline"
              size="sm"
            />
          )}
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
        { value: 'SCHEDULED', label: 'Scheduled' },
        { value: 'EMERGENCY', label: 'Emergency' },
        { value: 'ROUTINE', label: 'Routine' },
        { value: 'UPDATE', label: 'Update' }
      ],
      onChange: setTypeFilter
    },
    {
      label: 'Status',
      value: statusFilter,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'FAILED', label: 'Failed' },
        { value: 'CANCELLED', label: 'Cancelled' }
      ],
      onChange: setStatusFilter
    }
  ];

  // Maintenance metrics
  const maintenanceMetrics = [
    {
      title: 'Total Tasks',
      value: tasks.length,
      change: { value: 2, isPositive: true, period: 'this week' },
      icon: Wrench,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'In Progress',
      value: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      change: { value: 1, isPositive: true, period: 'vs last week' },
      icon: Activity,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    },
    {
      title: 'Completed',
      value: tasks.filter(t => t.status === 'COMPLETED').length,
      change: { value: 3, isPositive: true, period: 'vs last week' },
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Failed Tasks',
      value: tasks.filter(t => t.status === 'FAILED').length,
      change: { value: 1, isPositive: false, period: 'vs last week' },
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    }
  ];

  // Recent activities
  const recentActivities = [
    {
      id: '1',
      timestamp: '15 minutes ago',
      user: 'admin@rentalshop.com',
      action: 'started',
      description: 'Security patch update task',
      icon: Wrench,
      type: 'info' as const
    },
    {
      id: '2',
      timestamp: '1 hour ago',
      user: 'admin@rentalshop.com',
      action: 'completed',
      description: 'Database optimization task',
      icon: CheckCircle,
      type: 'success' as const
    },
    {
      id: '3',
      timestamp: '2 hours ago',
      user: 'admin@rentalshop.com',
      action: 'failed',
      description: 'SSL certificate renewal task',
      icon: XCircle,
      type: 'error' as const
    },
    {
      id: '4',
      timestamp: '4 hours ago',
      user: 'admin@rentalshop.com',
      action: 'created',
      description: 'New maintenance window scheduled',
      icon: Calendar,
      type: 'info' as const
    }
  ];

  // Quick actions
  const quickActions = [
    {
      id: '1',
      label: 'Create Task',
      description: 'Create a new maintenance task',
      icon: Plus,
      onClick: () => setShowCreateTask(true)
    },
    {
      id: '2',
      label: 'Schedule Window',
      description: 'Schedule maintenance window',
      icon: Calendar,
      onClick: () => setShowCreateWindow(true)
    },
    {
      id: '3',
      label: 'System Health',
      description: 'Check system health status',
      icon: Activity,
      onClick: () => addToast('info', 'System Health', 'Opening system health dashboard...')
    },
    {
      id: '4',
      label: 'Maintenance Mode',
      description: maintenanceMode ? 'Disable maintenance mode' : 'Enable maintenance mode',
      icon: maintenanceMode ? Eye : EyeOff,
      onClick: handleToggleMaintenanceMode
    }
  ];

  // System health metrics
  const systemHealthMetrics = [
    {
      name: 'Database Performance',
      label: 'Database Performance',
      value: 95,
      max: 100,
      unit: '%',
      status: 'healthy' as const,
      description: 'Database response time is optimal',
      icon: Database
    },
    {
      name: 'API Response Time',
      label: 'API Response Time',
      value: 88,
      max: 100,
      unit: '%',
      status: 'healthy' as const,
      description: 'API endpoints responding within normal range',
      icon: Globe
    },
    {
      name: 'Server Load',
      label: 'Server Load',
      value: 72,
      max: 100,
      unit: '%',
      status: 'warning' as const,
      description: 'Server load is moderate, monitor closely',
      icon: Server
    },
    {
      name: 'Disk Space',
      label: 'Disk Space',
      value: 45,
      max: 100,
      unit: '%',
      status: 'healthy' as const,
      description: 'Adequate disk space available',
      icon: HardDrive
    }
  ];

  return (
    <PageWrapper>
      <AdminPageHeader
        title="Maintenance Mode"
        subtitle="Manage system maintenance tasks, schedules, and system health"
        actionLabel="Create Task"
        actionIcon={Plus}
        onAction={() => setShowCreateTask(true)}
      />

      <PageContent>
        {/* Maintenance Mode Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Maintenance Mode Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${maintenanceMode ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-sm font-medium">
                  {maintenanceMode ? 'Maintenance Mode Active' : 'System Normal'}
                </span>
              </div>
              <Button
                variant={maintenanceMode ? 'default' : 'outline'}
                onClick={handleToggleMaintenanceMode}
                className="flex items-center gap-2"
              >
                {maintenanceMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {maintenanceMode ? 'Disable' : 'Enable'} Maintenance Mode
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {maintenanceMetrics.map((metric, index) => (
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
            title="Recent Maintenance Activities"
            activities={recentActivities}
            maxItems={5}
          />
        </div>

        {/* Search and Filters */}
        <SearchAndFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search maintenance tasks..."
          filters={filters}
          className="mb-6"
        />

        {/* Maintenance Tasks Table */}
        {filteredTasks.length > 0 ? (
          <DataTable
            data={filteredTasks}
            columns={columns}
            loading={loading}
            onRowClick={setSelectedTask}
          />
        ) : (
          <EmptyState
            icon={Wrench}
            title="No Maintenance Tasks Found"
            description="No maintenance tasks match your current search criteria. Try adjusting your filters or create a new maintenance task."
            actionLabel="Create Task"
            onAction={() => setShowCreateTask(true)}
          />
        )}
      </PageContent>

      {/* Task Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Maintenance Task Details</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Task Name</label>
                  <p className="text-sm text-text-primary">{selectedTask.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Type</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedTask.type} type="audit" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Description</label>
                <p className="text-sm text-text-primary mt-1">{selectedTask.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Status</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedTask.status} type="audit" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Priority</label>
                  <div className="mt-1">
                    <AdminStatusBadge status={selectedTask.priority} type="audit" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Affected Services</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedTask.affectedServices.map((service, index) => (
                    <span key={index} className="text-xs bg-bg-secondary px-2 py-1 rounded">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary">Scheduled At</label>
                  <p className="text-sm text-text-primary">{new Date(selectedTask.scheduledAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary">Estimated Duration</label>
                  <p className="text-sm text-text-primary">{selectedTask.estimatedDuration}</p>
                </div>
              </div>
              
              {selectedTask.startedAt && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Started At</label>
                    <p className="text-sm text-text-primary">{new Date(selectedTask.startedAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary">Actual Duration</label>
                    <p className="text-sm text-text-primary">{selectedTask.actualDuration || 'In Progress'}</p>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-text-secondary">Created By</label>
                <p className="text-sm text-text-primary">{selectedTask.createdBy}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Maintenance Task</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-text-secondary">Task Name</label>
              <Input placeholder="Enter task name" />
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Description</label>
              <Input placeholder="Enter task description" />
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Type</label>
              <Select>
                <option value="SCHEDULED">Scheduled</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="ROUTINE">Routine</option>
                <option value="UPDATE">Update</option>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Priority</label>
              <Select>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Scheduled Date</label>
              <Input type="datetime-local" />
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary">Estimated Duration</label>
              <Input placeholder="e.g., 2 hours" />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleCreateTask} className="flex-1">
                Create Task
              </Button>
              <Button variant="outline" onClick={() => setShowCreateTask(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
