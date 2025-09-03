import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast
} from '@rentalshop/ui';
import { 
  Settings, 
  Globe, 
  Shield, 
  Mail, 
  Bell, 
  Server,
  Building2,
  User,
  Store,
  Plus,
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

// Types
interface SettingsSummary {
  system: {
    total: number;
    active: number;
    categories: { [key: string]: number };
  };
  merchant: {
    total: number;
    active: number;
    categories: { [key: string]: number };
  };
  user: {
    total: number;
    active: number;
    categories: { [key: string]: number };
  };
}

interface SettingsDashboardProps {
  userRole: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  merchantId?: string;
  outletId?: string;
  userId?: string;
  onNavigateToSettings: (tab: string) => void;
  className?: string;
}

// API functions
const settingsApi = {
  getSystemSettingsSummary: async (): Promise<SettingsSummary['system']> => {
    const response = await fetch('/api/settings/system', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch system settings');
    const data = await response.json();
    const settings = data.data || [];
    
    const categories: { [key: string]: number } = {};
    settings.forEach((setting: any) => {
      categories[setting.category] = (categories[setting.category] || 0) + 1;
    });
    
    return {
      total: settings.length,
      active: settings.filter((s: any) => s.isActive).length,
      categories
    };
  },

  getMerchantSettingsSummary: async (): Promise<SettingsSummary['merchant']> => {
    const response = await fetch('/api/settings/merchant', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch merchant settings');
    const data = await response.json();
    const settings = data.data || [];
    
    const categories: { [key: string]: number } = {};
    settings.forEach((setting: any) => {
      categories[setting.category] = (categories[setting.category] || 0) + 1;
    });
    
    return {
      total: settings.length,
      active: settings.filter((s: any) => s.isActive).length,
      categories
    };
  },

  getUserPreferencesSummary: async (): Promise<SettingsSummary['user']> => {
    const response = await fetch('/api/settings/user', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch user preferences');
    const data = await response.json();
    const preferences = data.data || [];
    
    const categories: { [key: string]: number } = {};
    preferences.forEach((preference: any) => {
      categories[preference.category] = (categories[preference.category] || 0) + 1;
    });
    
    return {
      total: preferences.length,
      active: preferences.filter((p: any) => p.isActive).length,
      categories
    };
  }
};

// Summary card component
interface SummaryCardProps {
  title: string;
  icon: React.ComponentType<any>;
  total: number;
  active: number;
  categories: { [key: string]: number };
  color: string;
  onClick: () => void;
}

function SummaryCard({ title, icon: Icon, total, active, categories, color, onClick }: SummaryCardProps) {
  const inactive = total - active;
  const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">{title}</h3>
              <p className="text-sm text-text-secondary">Settings & Configuration</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary">{total}</div>
            <div className="text-sm text-text-secondary">Total</div>
          </div>
        </div>
        
        <div className="space-y-3">
          {/* Status indicators */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-text-secondary">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{active}</span>
              <Badge variant="default" className="text-xs">
                {activePercentage}%
              </Badge>
            </div>
          </div>
          
          {inactive > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-text-secondary">Inactive</span>
              </div>
              <span className="text-sm font-medium">{inactive}</span>
            </div>
          )}
          
          {/* Categories */}
          <div className="pt-2 border-t">
            <div className="text-xs text-text-secondary mb-2">Categories</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(categories).map(([category, count]) => (
                <Badge key={category} variant="outline" className="text-xs">
                  {category}: {count}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick actions component
interface QuickActionsProps {
  userRole: string;
  onAction: (action: string) => void;
}

function QuickActions({ userRole, onAction }: QuickActionsProps) {
  const actions = [
    {
      id: 'refresh',
      label: 'Refresh All',
      icon: RefreshCw,
      description: 'Reload all settings data'
    },
    {
      id: 'export',
      label: 'Export Settings',
      icon: Activity,
      description: 'Export current settings'
    }
  ];

  if (userRole === 'ADMIN') {
    actions.push({
      id: 'import',
      label: 'Import Settings',
      icon: Plus,
      description: 'Import settings from file'
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map(action => (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto p-4 flex flex-col items-start gap-2"
              onClick={() => onAction(action.id)}
            >
              <action.icon className="w-5 h-5" />
              <div className="text-left">
                <div className="font-medium">{action.label}</div>
                <div className="text-xs text-text-secondary">{action.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// System status component
interface SystemStatusProps {
  userRole: string;
}

function SystemStatus({ userRole }: SystemStatusProps) {
  const [status, setStatus] = useState<{
    database: 'healthy' | 'warning' | 'error';
    api: 'healthy' | 'warning' | 'error';
    settings: 'healthy' | 'warning' | 'error';
  }>({
    database: 'healthy',
    api: 'healthy',
    settings: 'healthy'
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'warning':
        return 'Warning';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">System Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.database)}
              <span className="text-sm font-medium">Database</span>
            </div>
            <Badge variant={status.database === 'healthy' ? 'default' : 'destructive'}>
              {getStatusText(status.database)}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.api)}
              <span className="text-sm font-medium">API</span>
            </div>
            <Badge variant={status.api === 'healthy' ? 'default' : 'destructive'}>
              {getStatusText(status.api)}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.settings)}
              <span className="text-sm font-medium">Settings</span>
            </div>
            <Badge variant={status.settings === 'healthy' ? 'default' : 'destructive'}>
              {getStatusText(status.settings)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main dashboard component
export function SettingsDashboard({ 
  userRole, 
  merchantId, 
  outletId, 
  userId, 
  onNavigateToSettings,
  className = '' 
}: SettingsDashboardProps) {
  const [summary, setSummary] = useState<SettingsSummary>({
    system: { total: 0, active: 0, categories: {} },
    merchant: { total: 0, active: 0, categories: {} },
    user: { total: 0, active: 0, categories: {} }
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load summary data
  const loadSummary = async () => {
    setLoading(true);
    try {
      const promises = [];
      
      if (userRole === 'ADMIN') {
        promises.push(settingsApi.getSystemSettingsSummary());
      } else {
        promises.push(Promise.resolve({ total: 0, active: 0, categories: {} }));
      }
      
      if (['ADMIN', 'MERCHANT'].includes(userRole)) {
        promises.push(settingsApi.getMerchantSettingsSummary());
      } else {
        promises.push(Promise.resolve({ total: 0, active: 0, categories: {} }));
      }
      
      promises.push(settingsApi.getUserPreferencesSummary());
      
      const [system, merchant, user] = await Promise.all(promises);
      
      setSummary({ system, merchant, user });
    } catch (error) {
      toast({
        title: 'Failed to load settings summary',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle quick actions
  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'refresh':
        loadSummary();
        toast({
          title: 'Settings refreshed',
          description: 'All settings data has been reloaded.',
          variant: 'default'
        });
        break;
      case 'export':
        toast({
          title: 'Export feature',
          description: 'Export functionality will be implemented soon.',
          variant: 'default'
        });
        break;
      case 'import':
        toast({
          title: 'Import feature',
          description: 'Import functionality will be implemented soon.',
          variant: 'default'
        });
        break;
    }
  };

  useEffect(() => {
    loadSummary();
  }, [userRole]);

  if (loading) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-text-secondary">Loading settings dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Settings Dashboard</h1>
        <p className="text-text-secondary">
          Manage system settings, merchant configurations, and user preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* System Settings */}
        {userRole === 'ADMIN' && (
          <SummaryCard
            title="System Settings"
            icon={Server}
            total={summary.system.total}
            active={summary.system.active}
            categories={summary.system.categories}
            color="bg-red-500"
            onClick={() => onNavigateToSettings('system')}
          />
        )}

        {/* Merchant Settings */}
        {['ADMIN', 'MERCHANT'].includes(userRole) && (
          <SummaryCard
            title="Merchant Settings"
            icon={Building2}
            total={summary.merchant.total}
            active={summary.merchant.active}
            categories={summary.merchant.categories}
            color="bg-blue-500"
            onClick={() => onNavigateToSettings('merchant')}
          />
        )}

        {/* User Preferences */}
        <SummaryCard
          title="User Preferences"
          icon={User}
          total={summary.user.total}
          active={summary.user.active}
          categories={summary.user.categories}
          color="bg-green-500"
          onClick={() => onNavigateToSettings('user')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions userRole={userRole} onAction={handleQuickAction} />
        <SystemStatus userRole={userRole} />
      </div>
    </div>
  );
}
